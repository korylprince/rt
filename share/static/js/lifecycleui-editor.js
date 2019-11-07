jQuery( document ).ready(function () {
    RT.NewEditor = class LifecycleEditorNew extends LifecycleModel {
        constructor(container, config, attribute) {
            super("LifecycleModel");

            var self         = this;
            self.width       = 900;
            self.height      = 350;
            self.node_radius = 35;
            self.attribute   = attribute;
            self.initial     = 1;

            if ( self.attribute['checked'] ) {
                jQuery('#enableSimulation').prop( "checked", true );
                self.checked = 1;
            }

            jQuery("#SaveNode").click(function( event ) {
                event.preventDefault();
                self.UpdateNode();
            });

            self.svg = d3.select(container).select('svg')
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 "+self.width+" "+self.height)
                .attr("border", 1);

            self.svg.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", self.height)
                .attr("width", self.width)
                .style("stroke", 'black')
                .style("fill", "none")
                .style("stroke-width", 1);

            self.config   = config;
            self.links    = [];
            self.nodes    = [];
            self.animationFactor = 1;
            // mouse event vars
            self.selected_node   = null;
            self.editing_node    = null;
            self.selected_link   = null;
            self.mousedown_link  = null;
            self.mousedown_node  = null;
            self.mouseup_node    = null;

            self.NodesFromConfig(config);
            self.nodes.forEach(source => {
                self.LinksForNodeFromConfig(source.name).forEach(targetName => {
                    // Get our target node
                    var target = self.nodes.filter(source => { return source.name === targetName; })[0];

                    if ( source.id < target.id ) {
                        self.links.push({id: ++self.links_seq, source: source, target: target, start: false, end: true});
                        return;
                    }
                    var link = self.links.filter(function(l) { return (l.source === target && l.target === source); })[0];
                    if(link) link.start = true;
                    else self.links.push({id: ++self.links_seq, source: source, target: target, start: false, end: true});
                });
                if ( self.checked ) {
                    if (self.attribute[source.name][0]) source.x = parseFloat(self.attribute[source.name][0]);
                    if (self.attribute[source.name][1]) source.y = parseFloat(self.attribute[source.name][1]);
                }
            });

            self.simulation = d3.forceSimulation();
            const link_size = self.nodes.length > 10 ? 300 : self.nodes.length * 35;
            if ( self.checked ) {
                self.simulation
                  .force("link", d3.forceLink().distance(link_size < 100 ? 200 : link_size).strength(0))
                  .force("charge", d3.forceManyBody().strength(0))
                  .force("center", d3.forceCenter(self.width / 2, self.height / 2))
                  .force('collision', d3.forceCollide().radius(function(d) {
                    return null;
                  }));
            }
            else {
                self.simulation
                  .force("link", d3.forceLink().distance(link_size < 100 ? 200 : link_size).strength(0.2))
                  .force("charge", d3.forceManyBody().strength(-200))
                  .force("center", d3.forceCenter(self.width / 2, self.height / 2))
                  .force('collision', d3.forceCollide().radius(function(d) {
                    return d.radius
                  }));
            }

            self.SetUp();
            self.RenderNode();
            self.RenderLink();

            self.simulation
                .nodes(self.nodes)
                .on("tick", ( t => {
                    this.node.attr("transform", (d => {

                        var x = d.x, y = d.y;
                        if ( d.x + self.node_radius / 2 > self.width ) x = self.width - self.node_radius;
                        if ( d.x - self.node_radius / 2 <= 0 ) x = self.node_radius;
                        if ( d.y + self.node_radius / 2 > self.height ) y = self.height - self.node_radius;
                        if ( d.y - self.node_radius / 2 <= 0 ) y = self.node_radius;

                        if ( self.checked ) {
                            d.fx = x;
                            d.fy = y;
                        }
                        else {
                            d.fx = null;
                            d.fy = null;
                        }

                        return "translate(" + x + "," + y + ")";
                    }));

                    this.link.attr('d', (d => {
                        var sx = d.source.x,
                            sy = d.source.y,
                            tx = d.target.x,
                            ty = d.target.y;

                        if ( sx + self.node_radius / 2 > self.width ) sx = self.width - self.node_radius;
                        if ( sx - self.node_radius / 2 <= 0 ) sx = self.node_radius;
                        if ( sy + self.node_radius / 2 > self.height ) sy = self.height - self.node_radius;
                        if ( sy - self.node_radius / 2 <= 0 ) sy = self.node_radius;
                        if ( tx + self.node_radius / 2 > self.width ) tx = self.width - self.node_radius;
                        if ( tx - self.node_radius / 2 <= 0 ) tx = self.node_radius;
                        if ( ty + self.node_radius / 2 > self.height ) ty = self.height - self.node_radius;
                        if ( ty - self.node_radius / 2 <= 0 ) ty = self.node_radius;

                        var deltaX = tx - sx,
                        deltaY     = ty - sy,
                        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                        normX = deltaX / dist,
                        normY = deltaY / dist,
                        sourcePadding = 45,
                        targetPadding = 45,
                        sourceX = sx + (sourcePadding * normX),
                        sourceY = sy + (sourcePadding * normY),
                        targetX = tx - (targetPadding * normX),
                        targetY = ty - (targetPadding * normY);
                        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
                    })
                );
            }))
            .force("link")
            .links(self.links)
            .id(d => d.id);

            // Add our current config to the DOM
            var form  = jQuery('form[name="ModifyLifecycle"]');
            var field = jQuery('<input type="hidden" name="Config">');
            field.val(JSON.stringify(self.config));
            form.append(field);

            var pos = {};
            self.nodes.forEach( d => {
                pos[d.name] = [d.x, d.y];
            });

            var attribute = jQuery('<input name="LifecycleAttribute" type="hidden">');
            attribute.val(JSON.stringify(pos));
            form.append(attribute);

            self.initial = 0;
            self.ExportAsConfiguration();
        }

        SetUp() {
            var self = this;

            // define arrow markers for graph links
            self.svg.append('svg:defs').append('svg:marker')
                .attr('id', 'end-arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 6)
                .attr('markerWidth', 5)
                .attr('markerHeight', 5)
                .attr('orient', 'auto')
                .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#000');

            self.svg.append('svg:defs').append('svg:marker')
                .attr('id', 'start-arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 6)
                .attr('markerWidth', 5)
                .attr('markerHeight', 5)
                .attr('orient', 'auto')
                .append('svg:path')
                .attr('d', 'M10,-5L0,0L10,5')
                .attr('fill', '#000');

            // line displayed when dragging new nodes
            self.drag_line = self.svg.append('svg:path')
                .attr('class', 'dragline hidden')
                .attr('d', 'M0,0L0,0')
                .attr('fill', '#000')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr("stroke-width", 1)
                .attr("style", "stroke: black; stroke-opacity: 0.6;");

            self.svg
                .on('click', function () {
                    d3.event.preventDefault();
                    d3.event.stopPropagation();

                    if ( self.selected_node || self.editing_node ) {
                        self.Deselect();
                    }
                    else {
                        self.simulation.stop();
                        self.Deselect();
                        self.AddNode(d3.mouse(this));

                        self.ExportAsConfiguration();

                        self.Refresh();
                    }
                })
                .on('contextmenu', function() { d3.event.preventDefault(); })
                .on('mousemove', function() { self.Mousemove(this); })
                .on('mouseup', function() { self.Mouseup(this); })
                .on('mousedown', function() { self.Mousedown(this); });

            d3.select("body").on("keydown", function (d) {
                if ( !self.editing_node && self.selected_node && ( d3.event.keyCode == 68 || d3.event.keyCode == 46 ) ) {
                    d3.event.preventDefault();
                    d3.event.stopPropagation();

                    self.simulation.stop();
                    self.svg.selectAll('.node-selected').each(function(d) {
                        self.DeleteNode(d);

                        self.ExportAsConfiguration();

                        self.Deselect();
                        self.Refresh();
                    });
                }
            })

            jQuery('#enableSimulation').click(function(){
                self.ToggleSimulation();
            });
        }

        RenderNode() {
            var self = this;

            self.node = self.svg.selectAll(".node")
                .data(self.nodes.filter(d => d.id >= 0));

            self.node.exit()
                .remove();

            // Add new nodes and draw them
            var nodeEnter = self.node.enter().append("g")
                .attr("class", "node");

            nodeEnter.append("circle");
            nodeEnter.append("text");
            nodeEnter.append("title");

            self.node = nodeEnter.merge(self.node)
                .attr("id", d => { d.id });

            self.node.call(d3.drag()
                .on("start", (d => {
                    if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
                    d.fx = d.x, d.fy = d.y;
                }))
                .on("drag", (d => {
                    d.fx = d3.event.x, d.fy = d3.event.y;
                }))
                .on("end", (d => {
                    if (!d3.event.active) this.simulation.alphaTarget(0);
                    if ( !self.checked ) {
                        d.fx = null, d.fy = null;
                    }
                })));

            // Add our circle to our new node
            self.node.select("circle")
                .attr("r", self.node_radius)
                .attr("stroke", "black")
                .attr("fill", function(d) {
                    switch(d.type) {
                        case 'active':
                            return '#547CCC';
                        case 'inactive':
                            return '#4bb2cc';
                        case 'initial':
                            return '#599ACC';
                    }
                })
                .on("click", function() {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();

                    self.SelectNode(this);
                })
                .on('mousedown', function(d) {
                    if(!d3.event.ctrlKey || self.mousedown_node || self.mousedown_link) return;
                    d3.event.preventDefault();
                    d3.event.stopPropagation();

                    // select node
                    self.mousedown_node = d;
                    if ( !self.mousedown_node ) { self.mousedown_node = null; return; }

                    // reposition drag line
                    self.drag_line
                      .style('marker-end', 'url(#end-arrow)')
                      .classed('hidden', false)
                      .attr('d', 'M' + self.mousedown_node.x + ',' + self.mousedown_node.y + 'L' + self.mousedown_node.x + ',' + self.mousedown_node.y);

                    self.Refresh();
                  })
                .on('mouseup', function(d) {
                    self.mouseup_node = d;
                    // needed by FF
                    self.drag_line
                        .classed('hidden', true)
                        .style('marker-end', '');

                    self.simulation.stop();
                    // add link to model
                    self.AddLink(self.mousedown_node, self.mouseup_node);

                    self.ExportAsConfiguration();
                    self.Refresh();

                    self.ResetMouseVars();
                });

            self.node.select("text")
                .text(function(d) { return d.name; })
                .each(function () { self.TruncateLabel(this, self); })
                .attr("x", function(d) {
                    var node = d3.select(this), textLength = node.node().getComputedTextLength();
                    if ( textLength > self.node_radius*2 ) textLength = self.node_radius*2;
                    return -textLength/2;
                })
                .attr("y", 0)
                .style("font-size", "10px")
                .on("click", function(d) {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                    self.UpdateNode(d);
                });

            self.node.select("title")
                .text(function(d) { return d.type; });
        }

        UpdateNode(element) {
            var self = this;

            const nodeInput = jQuery("#lifeycycle-ui-edit-node");
            var list = document.getElementById('lifeycycle-ui-edit-node').querySelectorAll('input, select');

            if ( element ) {
                for (let item of list) {
                    jQuery(item).val(element[item.name]);
                    // Can we make this check for the select bootstrap class instead of hard coding the known fields?
                    if ( item.name === 'type' ) {
                        var type = jQuery(".bootstrap-select .filter-option");
                        if ( type ) {
                            type.text(element[item.name]);
                        }
                    }
                }
                self.editing_node = element;
            }
            else {
                var name = document.getElementsByName('name')[0].value;
                if ( ( this.nodes.findIndex(x => x.name == name ) > 0 && this.nodes.findIndex(x => x.name == name ) <= 1 ) || name === '' ) {
                    // FIXME
                    // var form  = jQuery('#lifeycycle-ui-edit-node');
                    // var field = jQuery('<div class="alert alert-warning removing">Name invalid</div>');
                    // form.append(field);
                    return;
                }

                var values = {};
                for (let item of list) {
                    if ( item.name === 'id' ) {
                        values.index = self.nodes.findIndex(x => x.id == item.value);
                    }
                    values[item.name] = item.value;
                }
                self.UpdateNodeModel(self.nodes[values.index], values);
                self.ExportAsConfiguration();
                self.Refresh();
            }
            nodeInput.toggle();
        }

        RenderLink() {
            var self = this;

            self.link = self.svg.selectAll(".link")
                .data(self.links);

            self.link.exit()
                .each(function () {
                    var length = this.getTotalLength();
                    var path = d3.select(this);
                    path.attr("stroke-dasharray", length + " " + length)
                        .attr("stroke-dashoffset", 0)
                        .style("marker-end", "none")
                        .style("marker-start", "none")
                        .transition().duration(200 * self.animationFactor).ease(d3.easeLinear)
                        .attr("stroke-dashoffset", length)
                        .remove();
                });

            // Add new links and draw them
            var linkEnter = self.link.enter().append("g")
                .append("path")
                .attr("class", 'link')
                .style("marker-start", (d => d.start ? 'url(#start-arrow)' : '' ))
                .style("marker-end", (d   => d.end ? 'url(#end-arrow)' : '' ))
                .attr("transform", "translate(0,0)")
                .on("click", d => {
                    d3.event.stopPropagation();
                    self.simulation.stop();
                    self.ToggleLink(d);

                    self.ExportAsConfiguration();

                    self.Refresh();
                });
            self.link = linkEnter.merge(self.link);
            self.link
                .style("marker-start", (d => d.start ? 'url(#start-arrow)' : '' ))
                .style("marker-end", (d   => d.end ? 'url(#end-arrow)' : '' ));
        }

        Refresh() {
            var self = this;

            const link_size = self.nodes.length > 10 ? 300 : self.nodes.length * 35;
            self.simulation
                .force("link", d3.forceLink().distance(link_size < 100 ? 200 : link_size).strength(0.2))

            self.simulation
                .nodes(self.nodes)
                .force("link")
                .links(self.links)
                        .id(d => d.id);

            self.RenderLink();
            self.RenderNode();

            jQuery('.removing').remove();

            // This is our "cooling" factor
            self.simulation.alpha(0.05).restart();
        }

        SelectNode(node) {
            this.Deselect();
            this.selected_node = node;

            d3.select(node)
                .classed('node-selected', true);
        }

        Deselect() {
            if ( jQuery("#lifeycycle-ui-edit-node").is(':visible') ) {
                jQuery("#lifeycycle-ui-edit-node").toggle();
                jQuery('.removing').remove();
            }

            this.editing_node = null;

            if (!this.selected_node) return;
            this.selected_node = null;

            this.svg.selectAll("foreignObject").remove();

            this.svg.selectAll('.node-selected')
                .classed('node-selected', false);
        }

        TruncateLabel(element, self) {
            var node = d3.select(element), textLength = node.node().getComputedTextLength(), text = node.text();
            var diameter = self.node_radius * 2 - textLength/4;

            while (textLength > diameter && text.length > 0) {
                text = text.slice(0, -1);
                node.text(text + '…');
                textLength = node.node().getComputedTextLength();
            }
        }

        Mousemove(d) {
            var self = this;
            if (!self.mousedown_node) return;

            this.drag_line.attr('d', 'M' + self.mousedown_node.x + ',' + self.mousedown_node.y + 'L' + d3.mouse(d)[0] + ',' + d3.mouse(d)[1]);

            this.Refresh();
        }

        Mouseup() {
            var self = this;

            if(self.mousedown_node) {
              // hide drag line
              self.drag_line
                .classed('hidden', true)
                .style('marker-end', '');
            }
        }

        Mousedown(d) {
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }

        ResetMouseVars(){
            var self = this;

            self.mousedown_link  = null;
            self.mousedown_node  = null;
            self.mouseup_node    = null;
        }

        ToggleSimulation(){
            var self = this;
            self.checked = jQuery('#enableSimulation').is(":checked");

            const link_size = self.nodes.length > 10 ? 300 : self.nodes.length * 35;
            if ( self.checked ) {
                self.simulation
                  .force("link", d3.forceLink().distance(link_size < 100 ? 200 : link_size).strength(0))
                  .force("charge", d3.forceManyBody().strength(0))
                  .force("center", d3.forceCenter(self.width / 2, self.height / 2))
                  .force('collision', d3.forceCollide().radius(function(d) {
                    return null;
                  }));
            }
            else {
                self.nodes.forEach(function(d) {
                    d.fx = null, d.fy = null;
                });

                self.simulation
                  .force("link", d3.forceLink().distance(link_size < 100 ? 200 : link_size).strength(0.2))
                  .force("charge", d3.forceManyBody().strength(-200))
                  .force("center", d3.forceCenter(self.width / 2, self.height / 2))
                  .force('collision', d3.forceCollide().radius(function(d) {
                    return d.radius
                  }));
            }
            self.ExportAsConfiguration();
        }
    }
});
