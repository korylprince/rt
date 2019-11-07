
class LifecycleModel {
    constructor() {
        this.links_seq = 0;
        this.nodes_seq = 0;
    }

    // Generate nodes from config
    NodesFromConfig(config) {
        var self = this;
        self.nodes = [];

        jQuery.each(['initial', 'active', 'inactive'], function (i, type) {
            if ( config[type] ) {
                config[type].forEach(element => {
                    self.nodes = self.nodes.concat({id: ++self.nodes_seq, name: element, type: type});
                });
            }
        });
    }

    // Find all links associated with node object
    LinksForNodeFromConfig (node, config) {
        var config = config || this.config;

        for (let [fromNode, toList] of Object.entries(config.transitions)) {
            if ( fromNode == node ) {
                return toList;
            }
        }
        return [];
    }

    // Create a new node for our JS model
    AddNode(point) {
        var i = 0,
            name;
        while (1) {
            name = 'status #' + ++i;
            var index = this.nodes.findIndex(x => x.name == name);
            if ( index < 0 ) {
                break;
            }
        }
        this.nodes.push({id: ++this.nodes_seq, name: name, type: 'active', x: point[0], y: point[1]});
    }

    AddLink(source, target) {
        self = this;
        if (!source || !target) return;

        var link = self.links.filter(function(l) { return (l.source === target && l.target === source); })[0];
        if(link) link.start = true;
        else {
            self.links.push({id: ++self.links_seq, source: source, target: target, start: false, end: true});
        }
    }

    ToggleLink(d) {
        var self = this;
        var index = self.links.findIndex(x => x.id == d.id);

        var link = self.links[index];
        // delete link if we have both transitions already
        if ( link.start && link.end ) {
            self.links.splice(index, 1);
        }
        else if( link.start ) {
            link.end = true;
        }
        else {
            link.start = true;
        }
    }

    NodeById(id) {
        var nodeMap = d3.map(this.nodes, function(d) { return d.id; });
        return nodeMap.get( id );
    }

    NodeByStatus(status) {
        var nodeMap = d3.map(this.nodes, function(d) { return d.name; });
        return nodeMap.get( status );
    }

    DeleteNode(d) {
        var index = this.nodes.findIndex(x => x.id == d.id);
        this.DeleteLinksForNode(this.nodes[index]);

        this.nodes.splice(index, 1);
    }

    LinksForNode (node) {
        return this.links.filter(link => {
            if ( link.source.id === node.id ) {
                return true;
            }
            else if ( link.target.id === node.id && link.start ) {
                return true;
            }
            else {
                return false;
            }
        });
    }

    DeleteLinksForNode(node) {
        this.links = jQuery.grep(this.links, function (transition) {
            if (transition.source.id == node.id || transition.target.id == node.id) {
                return false;
            }
            return true;
        });
    }

    UpdateNodeModel(node, args) {
        var nodeIndex = this.nodes.findIndex(x => x.id == node.id);

        this.nodes[nodeIndex] = {...this.nodes[nodeIndex], ...args};
        var nodeUpdated = this.nodes[nodeIndex];

        // Update any links with node being changed as source
        var links = this.links.filter(function(l) { return (
            ( l.source.id === node.id ) )
        });
        links.forEach(link => {
            var index = this.links.findIndex(x => x.id == link.id);
            this.links[index] = {...link, source: nodeUpdated}
        });

        // Update any links with node being changed as target
        var links = this.links.filter(function(l) { return (
            ( l.target.id === node.id ) )
        });
        links.forEach(link => {
            var index = this.links.findIndex(x => x.id == link.id);
            this.links[index] = {...link, target: nodeUpdated}
        });
    }

    ExportAsConfiguration () {
        var self = this;
        var config = {
            type: self.type,
            initial:  [],
            active:   [],
            inactive: [],
            actions:  [],
            starts:   {},
            transitions: {},
        };

        // Grab our status nodes
        ['initial', 'active', 'inactive'].forEach(type => {
            config[type] = self.nodes.filter(n => n.type == type).map(n => n.name);
        });

        // Grab our links
        config.transitions[""] = self.config.transitions ? self.config.transitions[""]: [];

        var seen = {};
        self.nodes.forEach(source => {
            var links = self.LinksForNode(source);
            var targets = links.map(link => {
                if ( link.source.id === source.id ) {
                    return link.target.name;
                }
                else {
                    return link.source.name;
                }
            });
            config.transitions[source.name] = targets;
            seen[source.name] = 1;
        });

        for (let transition in config.transitions) {
            if( !seen[transition] ) {
                delete config.transitions[transition];
            }
        }
        self.config = config;

        var field = jQuery('input[name="Config"]');
        field.val(JSON.stringify(self.config));

        var pos = {};
        if ( jQuery('#enableSimulation').is(":checked") ) {
            pos["checked"] = 1;
            self.nodes.forEach( d => {
                pos[d.name] = [d.fx, d.fy];
            });
        }
        else {
            pos = JSON.parse(jQuery('input[name="LifecycleAttribute"]').val())
            pos["checked"] = 0;
            console.log(pos);
        }
        var attribute = jQuery('input[name="LifecycleAttribute"]');
        attribute.val(JSON.stringify(pos));
    };
}
