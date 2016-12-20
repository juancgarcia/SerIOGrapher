/*main.js*/
var Seriographer = window.Seriographer || {},
    jQuery = window.jQuery || {},
    Rickshaw = window.Rickshaw || {},
    io = window.io || {};

(function (jQuery, Rickshaw, io) {
    "use strict";
    //window.Seriographer = undefined;

    // Seriographer.defaults;

    // cheap Ext.apply ripoff
    Seriographer.compose = function (result, override, defaults) {
        var prop,
            rObj,
            rArr,
            dObj,
            dArr;
        override = override || {};
        defaults = defaults || {};
        result = result || {};

        // set any defaults first
        for (prop in defaults) {
            if (defaults.hasOwnProperty(prop)) {
                rObj = result[prop] instanceof Object;
                rArr = result[prop] instanceof Array;
                dObj = defaults[prop] instanceof Object;
                dArr = defaults[prop] instanceof Array;

                if (!result.hasOwnProperty(prop)) {
                    result[prop] = defaults[prop];
                } else if (rObj && !rArr && dObj && !dArr) {
                    Seriographer.compose(result[prop], {}, defaults[prop]);
                } //else if(rArr && dArr) {
                    // Skip? not sure what makes sense for Arrays yet in regards to merging
                    // Seriographer.compose
                //}
            }
        }

        // then handle overrides
        for (prop in override) {
            if (override.hasOwnProperty(prop)) {
                rObj = result[prop] instanceof Object;
                rArr = result[prop] instanceof Array;
                dObj = defaults[prop] instanceof Object;
                dArr = defaults[prop] instanceof Array;

                if (!result.hasOwnProperty(prop)) {
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
            var group,
                graph = Seriographer.compose({
                    element: document.getElementById(rickshaw_cfg_group.graph_el)
                }, rickshaw_cfg_group.graph, that.running_defaults.graph);
            graph = new Rickshaw.Graph(graph);

            group = {
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
            };

            // Snapshot Button & snapshot graph creation
            jQuery(document.createElement("div"))
                .attr("data_snap_index", 0)
                .addClass("myButton")
                .insertAfter("#" + rickshaw_cfg_group.graph_el)
                .text("Snapshot")
                .click(function () {
                    var graph_id = rickshaw_cfg_group.graph_el,
                        cloned_series_data = [],
                        idx = jQuery(this).attr("data_snap_index"),
                        new_snap_graph_id = graph_id + "_snap_" + idx,
                        snap_graph,
                        $snap_graph,
                        snap_graph_y,
                        $snap_graph_y,
                        snap_hover_detail,
                        snap_slider;

                    jQuery(this).attr("data_snap_index", parseInt(idx, 10) + 1);
                    // console.log("#"+graph_id + " snap " + idx);

                    graph.series.forEach(function (data_group) {
                        var data_arr = [],
                            offset = 0;

                        offset = data_group.data[0].x;

                        data_group.data.forEach(function (data_item) {
                            data_arr.push({
                                x: data_item.x - offset,
                                y: data_item.y
                            });
                        });

                        cloned_series_data.push({
                            color: data_group.color,
                            name: data_group.name,
                            data: data_arr
                        });
                    });

                    console.log(cloned_series_data);
                    // JSON.stringify(cloned_series_data)

                    $snap_graph_y = jQuery(document.createElement("div"))
                        .attr({id: new_snap_graph_id + "_y"})
                        .addClass("y_axis")
                        .insertAfter(jQuery(this).parent())
                        .wrap('<div class="chart_container"/>');

                    $snap_graph = jQuery(document.createElement("div"))
                        .attr({id: new_snap_graph_id})
                        .addClass("chart")
                        .insertAfter($snap_graph_y);

                    jQuery(document.createElement("div")).attr({
                        id: new_snap_graph_id + "_slider"
                    }).insertAfter($snap_graph);

                    snap_graph = new Rickshaw.Graph(Seriographer.compose({
                        element: document.getElementById(new_snap_graph_id),
                        series: cloned_series_data
                    }, that.running_defaults.graph));

                    snap_hover_detail = new Rickshaw.Graph.HoverDetail({
                        graph: snap_graph,
                        xFormatter: function (x) { return x + "milliseconds"; }// ,
                        // yFormatter: function(y) { return Math.floor(y) + " percent" }
                    });

                    snap_graph_y = new Rickshaw.Graph.Axis.Y(Seriographer.compose({
                        graph: snap_graph,
                        element: document.getElementById(new_snap_graph_id + "_y")
                    },
                        rickshaw_cfg_group.y_axis, that.running_defaults.y_axis));

                    snap_graph.render();

                    snap_slider = new Rickshaw.Graph.RangeSlider({
                        graph: snap_graph,
                        element: document.querySelector('#' + new_snap_graph_id + "_slider")
                    });
                });
            rickshaw_sets.push(group);

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
    
    Seriographer.init = function (config) {
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
        Seriographer_instance.io = io(config.io_source || Seriographer.defaults.io_source);
        Seriographer_instance.io.on('data', function (serialData) {

            Seriographer_instance.sets.forEach(function (graph_set) {
                Seriographer.pushData.call(
                    Seriographer_instance,
                    graph_set.graph,
                    graph_set.original_config.mapping(serialData)
                );
            });

        });
        return Seriographer_instance;
    };
})(jQuery, Rickshaw, io);
