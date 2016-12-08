/*main.js*/
    var Seriographer = window.Seriographer || {};

(function () {
    "use strict";
    //window.Seriographer = undefined;

    // Seriographer.defaults;

    // cheap Ext.apply ripoff
    Seriographer.compose = function (result, override, defaults) {
        var prop;
        override = override || {};
        defaults = defaults || {};
        result = result || {};

        // set any defaults first
        for (prop in defaults) {
            if (defaults.hasOwnProperty(prop)) {
                var rObj = result[prop] instanceof Object,
                    rArr = result[prop] instanceof Array,
                    dObj = defaults[prop] instanceof Object,
                    dArr = defaults[prop] instanceof Array;

                if (!result.hasOwnProperty(prop)) {
                    result[prop] = defaults[prop];
                } else if(rObj && !rArr && dObj && !dArr) {
                    Seriographer.compose(result[prop], {}, defaults[prop])
                } //else if(rArr && dArr) {
                    // Skip? not sure what makes sense for Arrays yet in regards to merging
                    // Seriographer.compose
                //}
            }
        }

        // then handle overrides
        for (prop in override) {
            if (override.hasOwnProperty(prop)) {
                var rObj = result[prop] instanceof Object,
                    rArr = result[prop] instanceof Array,
                    dObj = defaults[prop] instanceof Object,
                    dArr = defaults[prop] instanceof Array;

                if(!result.hasOwnProperty(prop)) {
                    result[prop] = override[prop];
                } else if (rObj && !rArr && dObj && !dArr) {
                    Seriographer.compose(result[prop], override[prop]);
                }
            }
        }
        return result;
    };

    Seriographer.inflate_graphs = function (cfg_list) {
        var that = this || { running_defaults: {
                graph: {},
                x_axis: {},
                y_axis: {}
            } },
            rickshaw_sets = [];

        if (cfg_list === undefined) {
            cfg_list = that.original_config.sets;
        }
        if (!cfg_list instanceof Array) {
            cfg_list = [cfg_list];
        }

        cfg_list.forEach(function (rickshaw_cfg_group) {
            var graph = Seriographer.compose({
                    element: document.getElementById(rickshaw_cfg_group.graph_el)
                }, rickshaw_cfg_group.graph, that.running_defaults.graph);
            graph = new Rickshaw.Graph(graph);

            rickshaw_sets.push({
                original_config: rickshaw_cfg_group,
                graph: graph,
                x_axis: new Rickshaw.Graph.Axis.Time(Seriographer.compose({
                    graph: graph
                }, rickshaw_cfg_group.x_axis, that.running_defaults.x_axis)),
                y_axis: new Rickshaw.Graph.Axis.Y(Seriographer.compose({
                    graph: graph,
                    element: document.getElementById(rickshaw_cfg_group.graph_y_el)
                },
                    rickshaw_cfg_group.y_axis, that.running_defaults.y_axis))
            });
        });
        that.sets = that.sets.concat(rickshaw_sets);
        return rickshaw_sets;
    };

    // update graph
    Seriographer.pushData = function (graph, payload) {
        var that = this || { running_defaults: { data_limit: 200 } },
            i = 0;
        
        payload.y.forEach(function (data, i) {
            graph.series[i].data.push({
                x: payload.x,
                y: payload.y[i]
            });
        });

        // shift the array if we're over limit
        if (graph.series[0].data.length > (that.running_defaults.data_limit)) {
            i = 0;
            while (i < graph.series.length) {
                graph.series[i].data.shift();
                i =  i + 1;
            }
        }

        // render the graph
        graph.update();

    };
    
    Seriographer.init = function (config, io, Rickshaw) {
        Rickshaw = Rickshaw || {};
        io = io || {};

        config = (config instanceof Object) ? config : {};
        config.overrides = (config.overrides instanceof Object) ? config.overrides : {};
        config.sets = (config.sets instanceof Array) ? config.sets : [];


        // inflate graph(s)
        var defaults = {
                io_source: 'http://localhost:8080/port/COM3',
                start_time: (new Date()).getTime(),
                data_limit: 250,
                graph: {
                    width: 800,
                    height: 250,
                    renderer: 'line',
                    min: -40000,
                    max: 40000
                },
                x_axis: {},
                y_axis: {
                    orientation: 'left',
                    tickFormat: Rickshaw.Fixtures.Number.formatKMBT
                },
                series_element: {
                }
            },
            Seriographer_instance = {
                sets: [],
                original_config: Seriographer.compose({}, config),
                running_defaults: Seriographer.compose({}, defaults, config.overrides)
            };

        Seriographer.inflate_graphs.call(Seriographer_instance, config.sets);


        // Kickstart
        io(config.io_source || Seriographer.defaults.io_source).on('data', function (data) {
            var parts = data.split("\t"),
                ts = (new Date()).getTime() - (Seriographer_instance.running_defaults.start_time);

            Seriographer_instance.sets.forEach(function (graph_set) {
                Seriographer.pushData.call(Seriographer_instance, graph_set.graph, {
                    x: ts,
                    y: graph_set.original_config.mapping(parts)
                });
            });
        });
        return Seriographer_instance;
    };
})();
