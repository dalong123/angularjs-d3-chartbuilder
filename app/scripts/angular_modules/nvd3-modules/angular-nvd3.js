'use strict';

angular

  .module('angular-nvd3', ['chartbuilderOptions'])
  
  .directive('nvd3', ['chartbuilderOptionValues', function(chartbuilderOptionValues) {
    return {
      restrict: 'AE',
      scope: {
        data: '=',      //chart data, [required]
        options: '=',   //chart options, according to nvd3 core api, [required]
        colors: '=?',   //chart colors, [optional]
        api: '=?',      //directive global api, [optional]
        events: '=?',   //global events that directive would subscribe to, [optional]
        config: '=?'    //global directive configuration, [optional]
      },
      link: function(scope, element, attrs) {
        var defaultConfig = {
          extended: false,
          visible: true,
          disabled: false,
          autorefresh: true,
          refreshDataOnly: false
        };

        // basic directive configuration
        scope._config = angular.extend(defaultConfig, scope.config);

        // directive global api
        scope.api = {

          // Fully refresh directive
          refresh: function() {
            scope.api.updateWithOptions(scope.options);
          },

          // Update chart layout
          update: function() {
            scope.chart.update();
          },

          // Force labels to wrap
          wrapLabels: function() {
            var svgEl = d3.select(element[0]).select('svg');

            if (scope.options.chart.wrapLabels) {
              svgEl.selectAll('.nv-axis .tick text').each(function(d) {
                if (!isNaN(d)) {
                  return;
                }
                var el = d3.select(this);
                var words = d.toString().split(' ');
                el.text('');

                for (var i = 0; i < words.length; i++) {
                  var tspan = el.append('tspan').text(words[i]);
                  if (i > 0) {
                    tspan.attr('x', 0).attr('dy', '15');
                  }
                }
              });
            }
          },

          // Update chart with new options
          updateWithOptions: function(options) {

            // Clearing
            scope.api.clearElement();

            // Exit if options are not yet bound
            if (angular.isDefined(options) === false) return;

            // Exit if chart is hidden
            if (!scope._config.visible) return;

            // Initialize chart with specific type
            scope.chart = nv.models[options.chart.type]();

            // Configure colors
            if (scope.colors && !scope.options.customColors) {
              scope.chart.color(scope.colors);

              // Special coloring options for multiBarHorizontalChart set to discrete single group
              if (scope.data.length === 1 && scope.options.chart.type === 'multiBarHorizontalChart') {
                scope.options.chart.barColor = scope.colors;
              } else {
                scope.options.chart.barColor = null;
              }
            }

            angular.forEach(scope.chart, function(value, key) {
              if (key === 'options');

              else if (key === 'dispatch') {
                if (options.chart[key] === undefined || options.chart[key] === null) {
                  if (scope._config.extended) options.chart[key] = {};
                }
                configureEvents(scope.chart[key], options.chart[key]);
              }

              else if ([
                'lines',
                'lines1',
                'lines2',
                'bars', // TODO: Fix bug in nvd3, nv.models.historicalBar - chart.interactive (false -> _)
                'bars1',
                'bars2',
                'stack1',
                'stack2',
                'multibar',
                'discretebar',
                'pie',
                'scatter',
                'bullet',
                'sparkline',
                'legend',
                'distX',
                'distY',
                'xAxis',
                'x2Axis',
                'yAxis',
                'yAxis1',
                'yAxis2',
                'y1Axis',
                'y2Axis',
                'y3Axis',
                'y4Axis',
                'interactiveLayer',
                'controls'
              ].indexOf(key) >= 0){
                if (options.chart[key] === undefined || options.chart[key] === null) {
                  if (scope._config.extended) options.chart[key] = {};
                }
                configure(scope.chart[key], options.chart[key], options.chart.type);
              }

              else if (//TODO: need to fix bug in nvd3
                (key ==='clipEdge' && options.chart.type === 'multiBarHorizontalChart')
                  || (key === 'clipVoronoi' && options.chart.type === 'historicalBarChart')
                  || (key === 'color' && options.chart.type === 'indentedTreeChart')
                  || (key === 'defined' && (options.chart.type === 'historicalBarChart' || options.chart.type === 'cumulativeLineChart' || options.chart.type === 'lineWithFisheyeChart'))
                  || (key === 'forceX' && (options.chart.type === 'multiBarChart' || options.chart.type === 'discreteBarChart' || options.chart.type === 'multiBarHorizontalChart'))
                  || (key === 'interpolate' && options.chart.type === 'historicalBarChart')
                  || (key === 'isArea' && options.chart.type === 'historicalBarChart')
                  || (key === 'size' && options.chart.type === 'historicalBarChart')
                  || (key === 'stacked' && options.chart.type === 'stackedAreaChart')
                  || (key === 'values' && options.chart.type === 'pieChart')
                  || (key === 'xScale' && options.chart.type === 'scatterChart')
                  || (key === 'yScale' && options.chart.type === 'scatterChart')
                  || (key === 'x' && (options.chart.type === 'lineWithFocusChart' || options.chart.type === 'multiChart'))
                  || (key === 'y' && (options.chart.type === 'lineWithFocusChart' || options.chart.type === 'multiChart'))
                );

              else if (options.chart[key] === undefined || options.chart[key] === null) {
                if (scope._config.extended) options.chart[key] = value();
              }

              else if (angular.isString(options.chart[key]) && options.chart[key].trim().substring(0, 9) === 'function:') {
                scope.chart[key](chartbuilderOptionValues[key][options.chart[key]].option);
              }

              else {
                scope.chart[key](options.chart[key]);
              }
            });

            // Update with data
            scope.api.updateWithData(scope.data);

            // Configure styles
            if (options['styles'] || scope._config.extended) {
              configureStyles();
            }

            nv.addGraph(function() {
              // Update the chart when window resizes
              nv.utils.windowResize(function() {
                scope.chart.update();
              });
              return scope.chart;
            }, scope.api.wrapLabels);
          },

          // Update chart with new data
          updateWithData: function (data) {
            if (data) {
              scope.options.chart['transitionDuration'] = +scope.options.chart['transitionDuration'] || 250;
              // remove whole svg element with old data
              d3.select(element[0]).select('svg').remove();

              // Select the current element to add <svg> element and to render the chart in
              d3.select(element[0]).append('svg')
                .attr('height', scope.options.chart.height)
                .attr('width', scope.options.chart.width)
                .datum(data)
                .transition().duration(scope.options.chart['transitionDuration'])
                .call(scope.chart);

              // Set up svg height and width. It is important for all browsers...
              var svgEl = d3.select(element[0]).select('svg');

              svgEl[0][0].style.height = scope.options.chart.height + 'px';
              svgEl[0][0].style.width = scope.options.chart.width + 'px';

              if (scope.options.chart.type === 'multiChart') {
                scope.chart.update(); // multiChart is not automatically updated
              }
            }
          },

          // Fully clear directive element
          clearElement: function () {
            element.empty();
            scope.chart = null;
          }
        };

        // Configure the chart model with the passed options
        function configure(chart, options, chartType) {
          if (chart && options) {
            angular.forEach(chart, function(value, key) {
              if (key === 'dispatch') {
                if (options[key] === undefined || options[key] === null) {
                  if (scope._config.extended) options[key] = {};
                }
                configureEvents(value, options[key]);
              }
              else if (//TODO: need to fix bug in nvd3
                (key === 'xScale' && chartType === 'scatterChart')
                  || (key === 'yScale' && chartType === 'scatterChart')
                  || (key === 'values' && chartType === 'pieChart'));
              else if ([
                'scatter',
                'defined',
                'options',
                'axis',
                'rangeBand',
                'rangeBands'
              ].indexOf(key) < 0) {
                if (options[key] === undefined || options[key] === null) {
                  if (scope._config.extended) options[key] = value();
                }
                else if (angular.isString(options[key]) && options[key].trim().substring(0, 9) === 'function:') {
                  chart[key](chartbuilderOptionValues[key][options[key]].option);
                }
                else {
                  chart[key](options[key]);
                }
              }
            });
          }
        }

        // Subscribe to the chart events (contained in 'dispatch')
        // and pass eventHandler functions in the 'options' parameter
        function configureEvents(dispatch, options) {
          if (dispatch && options) {
            angular.forEach(dispatch, function(value, key) {
              if (options[key] === undefined || options[key] === null) {
                if (scope._config.extended) options[key] = value.on;
              }
              else dispatch.on(key + '._', options[key]);
            });
          }
        }

        // Add some styles to the whole directive element
        function configureStyles(){
          var _ = angular.extend(defaultStyles(), scope.options['styles'] || {});

          if (scope._config.extended) scope.options['styles'] = _;

          angular.forEach(_.classes, function(value, key) {
            value ? element.addClass(key) : element.removeClass(key);
          });

          element.removeAttr('style').css(_.css);
        }

        // Default values for styles
        function defaultStyles() {
          return {
            classes: {
              'with-3d-shadow': true,
              'with-transitions': true,
              'gallery': false
            },
            css: {}
          };
        }

        // Watching on options, data, config changing
        scope.$watch('options', function(options) {
          if (!scope._config.disabled && scope._config.autorefresh) scope.api.refresh();
        }, true);
        scope.$watch('data', function(data) {
          if (!scope._config.disabled && scope._config.autorefresh) {
            scope._config.refreshDataOnly ? scope.chart.update() : scope.api.refresh(); // if wanted to refresh data only, use chart.update method, otherwise use full refresh.
          }
        }, true);
        scope.$watch('config', function(config) {
          scope._config = angular.extend(defaultConfig, config);
          scope.api.refresh();
        }, true);
        scope.$watch('colors', function(colors) {
          if (!scope.data || scope.options.customColors) return false;
          scope.chart.color(colors).update();
        }, true);

        //subscribe on global events
        angular.forEach(scope.events, function(eventHandler, event) {
          scope.$on(event, function(e){
            return eventHandler(e, scope);
          });
        });
      }
    };
  }]);
