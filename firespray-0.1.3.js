var firespray = {
    version: "0.1.3"
};

var fy = firespray;

fy.chart = function module() {
    var that = this;
    var config = fy.utils.cloneJSON(fy.defaultConfig);
    var cache = {
        data: [],
        root: null,
        bgSvg: null,
        axesSvg: null,
        geometryCanvas: null,
        geometrySVG: null,
        scaleX: d3.scale.linear(),
        scaleY: d3.scale.linear(),
        isMirror: null,
        axisXHeight: null,
        brushExtent: null,
        extentX: null,
        extentY: null,
        zoomedExtentX: null,
        theme: null,
        brush: null,
        queues: [],
        biggestY: null
    };
    cache.dispatch = d3.dispatch("brushChange", "brushDragStart", "brushDragMove", "brushDragEnd", "geometryHover", "geometryOut", "geometryClick", "chartHover", "chartOut", "chartEnter", "mouseDragMove", "mouseWheelScroll");
    var pipeline = fy.utils.pipeline(fy.setupContainers, fy.setupBrush, fy.setupScales, fy.setupAxisY, fy.setupAxisX, fy.setupHovering, fy.setupStripes, fy.setupGeometries);
    var exports = {
        render: function() {
            pipeline(config, cache);
        },
        setData: function(_newData) {
            if (!_newData || _newData.length === 0 || _newData[0].values.length === 0) {
                return this;
            }
            cache.data = fy.utils.cloneJSON(_newData);
            cache.data.sort(function(a, b) {
                var x = a.values.length;
                var y = b.values.length;
                return x > y ? -1 : x < y ? 1 : 0;
            });
            this.render();
            return this;
        },
        setConfig: function(_newConfig) {
            fy.utils.override(_newConfig, config);
            return this;
        },
        refresh: function() {
            if (that.dataUtils.hasValidData(cache)) {
                this.render();
            }
            return this;
        },
        getDataSlice: function(_sliceExtentX) {
            return fy.dataUtils.getDataSlice(cache, _sliceExtentX);
        },
        getDataUnderBrush: function() {
            return fy.dataUtils.getDataSlice(cache, fy.graphicUtils.getBrushExtent(cache));
        },
        getDataInView: function() {
            return fy.dataUtils.getDataSlice(cache, exports.getZoomExtent());
        },
        setZoom: function(_newExtent) {
            config.zoomedExtentX = _newExtent;
            this.render();
            return this;
        },
        getZoomExtent: function() {
            return fy.graphicUtils.getZoomExtent(cache, config);
        },
        setBrushSelection: function(_brushSelectionExtent) {
            if (cache.brush) {
                cache.brushExtent = _brushSelectionExtent;
                this.render();
            }
            return this;
        },
        setHovering: function(_dateX) {
            if (!fy.dataUtils.hasValidData(cache)) {
                return;
            }
            var hoverPosX = cache.scaleX(_dateX);
            var closestPointsScaledX = fy._hovering.injectClosestPointsFromX(hoverPosX, config, cache);
            cache.interactionSvg.select(".hover-group").style({
                visibility: "visible"
            });
            if (typeof closestPointsScaledX !== "undefined") {
                fy._hovering.displayHoveredGeometry(config, cache);
                fy._hovering.displayVerticalGuide(closestPointsScaledX, config, cache);
            } else {
                fy._hovering.hideHoveredGeometry(config, cache);
                fy._hovering.displayVerticalGuide(hoverPosX, config, cache);
            }
            return this;
        },
        brushIsFarRight: function() {
            if (cache.brush.extent()) {
                return cache.brush.extent()[1].getTime() === cache.scaleX.domain()[1].getTime();
            }
        },
        getBrushExtent: function() {
            return fy.graphicUtils.getBrushExtent(cache);
        },
        getDataExtent: function() {
            return {
                x: fy.dataUtils.computeExtent(cache, "x"),
                y: fy.dataUtils.computeExtent(cache, "y")
            };
        },
        getDataPointCount: function() {
            return cache.data[0].values.length;
        },
        getDataPointCountInView: function() {
            return fy.dataUtils.getDataSlice(this.getZoomExtent())[0].values.length;
        },
        getSvgNode: function() {
            if (cache.bgSvg) {
                return cache.bgSvg.node();
            }
        },
        getCanvasNode: function() {
            if (cache.geometryCanvas) {
                return cache.geometryCanvas.node();
            }
        },
        getContainer: function() {
            if (config.container) {
                return config.container;
            }
        },
        resizeToContainerSize: function() {
            if (config.container) {
                exports.setConfig({
                    width: config.container.clientWidth,
                    height: config.container.clientHeight
                }).refresh();
                fy.utils.override({
                    width: config.container.clientWidth,
                    height: config.container.clientHeight
                });
                this.refresh();
            }
            return this;
        }
    };
    d3.rebind(exports, cache.dispatch, "on");
    return exports;
};

fy.defaultConfig = {
    scaleX: "time",
    width: 500,
    height: 300,
    margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
    },
    container: null,
    showTicksX: false,
    showGridX: false,
    showTicksY: true,
    useBrush: false,
    suggestedXTicks: 10,
    suggestedYTicks: null,
    tickFormatX: "%H:%M:%S",
    axisXHeight: 20,
    axisYWidth: 0,
    isMirror: null,
    dotSize: 4,
    suffix: "",
    stripeWidthInSample: 1,
    tickFormatY: null,
    labelYOffset: 0,
    axisYStartsAtZero: true,
    showStripes: true,
    geometryType: "line",
    showAxisX: true,
    showAxisY: true,
    showLabelsX: true,
    showLabelsY: true,
    progressiveRenderingRate: 300,
    brushThrottleWaitDuration: 10,
    useProgressiveRendering: true,
    renderer: "canvas",
    theme: null
};

fy.utils = {
    override: function(_objA, _objB) {
        for (var x in _objA) {
            if (x in _objB) {
                _objB[x] = _objA[x];
            }
        }
    },
    cloneJSON: function(_obj) {
        return JSON.parse(JSON.stringify(_obj));
    },
    throttle: function throttle(callback, limit, b) {
        var wait = false;
        var timer = null;
        return function(a, b) {
            if (!wait) {
                callback.apply(this, arguments);
                wait = true;
                clearTimeout(timer);
                timer = setTimeout(function() {
                    wait = false;
                }, limit);
            }
        };
    },
    deepExtend: function(destination, source) {
        for (var property in source) {
            if (source[property] && source[property].constructor && source[property].constructor === Object) {
                destination[property] = destination[property] || {};
                arguments.callee(destination[property], source[property]);
            } else {
                destination[property] = source[property];
            }
        }
        return destination;
    },
    pipeline: function() {
        var fns = arguments;
        return function(config, cache) {
            for (var i = 0; i < fns.length; i++) {
                cache = fns[i].call(this, config, cache);
            }
            return cache;
        };
    }
};

fy.dataUtils = {
    generateDataPoint: function(options, i) {
        var point = {
            x: options.epoch,
            y: Math.random() * 100
        };
        if (options.valueCount > 1) {
            point.y2 = Math.random() * 100;
        }
        return point;
    },
    generateDataLine: function(options, i) {
        var pointCount = options.pointCount || 1e3;
        var colors = d3.scale.category20().range();
        options.epoch = options.startEpoch;
        return {
            values: d3.range(pointCount).map(function(dB, iB) {
                options.epoch += 1e3;
                return fy.dataUtils.generateDataPoint(options);
            }),
            color: colors[i % (colors.length - 1)],
            name: "line i"
        };
    },
    generateData: function(options) {
        options.startEpoch = new Date().setMilliseconds(0);
        var lineCount = options.lineCount || 5;
        return d3.range(lineCount).map(function(d, i) {
            return fy.dataUtils.generateDataLine(options, i);
        });
    },
    hasValidData: function(cache) {
        return cache.data && cache.data.length !== 0 && cache.data[0].values.length !== 0;
    },
    hasValidDataY2: function(cache) {
        if (this.hasValidData(cache) && typeof cache.data[0].values[0].y2 === "number") {
            return !!cache.data[0].values[0];
        } else {
            return false;
        }
    },
    computeExtent: function(cache, _axis) {
        return d3.extent(d3.merge(cache.data.map(function(d) {
            return d.values.map(function(dB) {
                return dB[_axis];
            });
        })));
    },
    getDataSlice: function(cache, _sliceExtentX) {
        var dataSlice = fy.utils.cloneJSON(cache.data).map(function(d) {
            d.values = d.values.filter(function(dB) {
                return dB.x >= _sliceExtentX[0] && dB.x <= _sliceExtentX[1];
            });
            return d;
        });
        return dataSlice;
    }
};

fy.graphicUtils = {
    getBrushExtent: function(cache) {
        if (cache.brush.extent()) {
            return cache.brush.extent().map(function(d) {
                return d.getTime();
            });
        }
    },
    sampleWidthInPx: function(cache) {
        return cache.scaleX(cache.data[0].values[2].x) - cache.scaleX(cache.data[0].values[1].x);
    },
    getZoomExtent: function(cache, config) {
        return config.zoomedExtentX || fy.dataUtils.computeExtent(cache, "x");
    }
};

fy.setupHovering = function(config, cache) {
    if (config.useBrush || typeof cache.interactionSvg.select(".hover-rect").on("mousemove") === "function") {
        return cache;
    }
    var that = this;
    var scrollAccum = 0;
    var mouseAccum = 0;
    var zoomSpeed = 10;
    var panSpeed = 1e3;
    function computeNewExtent() {
        var sampleWidthInPx = fy.graphicUtils.sampleWidthInPx(cache);
        var extentX = fy.dataUtils.computeExtent(cache, "x");
        var newExtentX = [];
        newExtentX[0] = extentX[0] - zoomSpeed * scrollAccum - panSpeed * mouseAccum / sampleWidthInPx;
        newExtentX[1] = extentX[1] + zoomSpeed * scrollAccum - panSpeed * mouseAccum / sampleWidthInPx;
        if (newExtentX[1] - newExtentX[0] >= 1001) {
            return newExtentX;
        } else {
            return;
        }
    }
    var mouseIsPressed = false;
    document.onmousedown = function() {
        mouseIsPressed = true;
    };
    document.onmouseup = function() {
        mouseIsPressed = false;
    };
    d3.select(document).on("mousewheel", function() {
        scrollAccum += d3.event.wheelDelta;
        var newExtentX = computeNewExtent();
        cache.dispatch.mouseWheelScroll.call(that, newExtentX);
    });
    cache.interactionSvg.select(".hover-rect").on("mousemove", function() {
        if (!fy.dataUtils.hasValidData(cache)) {
            return;
        }
        var mouseX = d3.mouse(this)[0];
        if (mouseIsPressed) {
            mouseAccum += d3.event.movementX;
            var newExtentX = computeNewExtent();
            cache.dispatch.mouseDragMove.call(that, newExtentX);
        }
        var closestPointsScaledX = fy._hovering.injectClosestPointsFromX(mouseX, config, cache);
        cache.interactionSvg.select(".hover-group").style({
            visibility: "visible"
        });
        if (typeof closestPointsScaledX !== "undefined") {
            fy._hovering.displayHoveredGeometry(config, cache);
            cache.dispatch.chartHover.call(that, cache.data);
            fy._hovering.displayVerticalGuide(closestPointsScaledX, config, cache);
        } else {
            fy._hovering.hideHoveredGeometry(config, cache);
            fy._hovering.displayVerticalGuide(mouseX, config, cache);
        }
    }).on("mouseenter", function() {
        cache.dispatch.chartEnter.call(that);
    }).on("mouseout", function() {
        var svg = cache.interactionSvg.node();
        var target = d3.event.relatedTarget;
        if (svg.contains && !svg.contains(target) || svg.compareDocumentPosition && !svg.compareDocumentPosition(target)) {
            cache.interactionSvg.select(".hover-group").style({
                visibility: "hidden"
            });
            cache.dispatch.chartOut.call(that);
        }
    }).select(".hover-group");
    return cache;
};

fy._hovering = {
    injectClosestPointsFromX: function(fromPointX, config, cache) {
        var found = false, closestIndex, closestScaledX;
        cache.data.forEach(function(d) {
            if (!found) {
                var scaledX = d.values.map(function(dB) {
                    return dB.scaledX;
                });
                if (typeof scaledX[0] !== "undefined") {
                    var halfInterval = (scaledX[1] - scaledX[0]) * .5;
                    closestIndex = d3.bisect(scaledX, fromPointX - halfInterval);
                    if (typeof d.values[closestIndex] !== "undefined") {
                        closestScaledX = d.values[closestIndex].scaledX;
                        found = !!closestIndex;
                    }
                }
            }
            d.closestValue = d.values[closestIndex];
        });
        return closestScaledX;
    },
    displayHoveredGeometry: function(config, cache) {
        if (config.geometryType === "bar" || config.geometryType === "percentBar" || config.geometryType === "stackedBar") {
            fy._hovering.displayHoveredRects(config, cache);
        } else {
            fy._hovering.displayHoveredDots(config, cache);
        }
    },
    displayHoveredDots: function(config, cache) {
        var hoverData = cache.data.map(function(d) {
            return d.closestValue;
        });
        if (cache.isMirror) {
            var hoverData2 = cache.data.map(function(d) {
                return d.closestValue;
            });
            hoverData = hoverData.concat(hoverData2);
        }
        var hoveredDotsSelection = cache.interactionSvg.select(".hover-group").selectAll("circle.hovered-geometry").data(hoverData);
        hoveredDotsSelection.enter().append("circle").attr({
            "class": "hovered-geometry"
        }).on("mousemove", function(d, i) {
            var isFromMirror = cache.isMirror && i >= cache.data.length;
            var scaledY = isFromMirror ? d.scaledY2 : d.scaledY;
            var valueY = isFromMirror ? d.y2 : d.y;
            var containerTop = config.container.getBoundingClientRect().top;
            var e = {
                posX: d.scaledX,
                posY: scaledY,
                name: d.name,
                color: d.color,
                valueX: d.x,
                valueY: valueY,
                containerTop: containerTop
            };
            cache.dispatch.geometryHover.call(this, e, d);
        }).on("mouseout", function() {
            cache.dispatch.geometryOut.call(this);
        }).on("click", function() {
            cache.dispatch.geometryClick.call(this);
        });
        hoveredDotsSelection.filter(function(d, i) {
            return typeof d !== "undefined" && !isNaN(d.y);
        }).style({
            fill: function(d) {
                return d.color || "silver";
            }
        }).attr({
            r: config.dotSize,
            cx: function(d) {
                return d.scaledX;
            },
            cy: function(d, i) {
                var scaledY = cache.isMirror && i >= cache.data.length && d.scaledY2 ? d.scaledY2 : d.scaledY;
                return scaledY;
            }
        });
        hoveredDotsSelection.exit().remove();
        return this;
    },
    displayHoveredRects: function(config, cache) {
        var hoverData = cache.data.map(function(d) {
            return d.closestValue;
        });
        if (cache.isMirror) {
            var hoverData2 = cache.data.map(function(d) {
                return d.closestValue;
            });
            hoverData = hoverData.concat(hoverData2);
        }
        var hoveredDotsSelection = cache.interactionSvg.select(".hover-group").selectAll("rect.hovered-geometry").data(hoverData);
        hoveredDotsSelection.enter().append("rect").attr({
            "class": "hovered-geometry"
        }).on("mousemove", function(d, i) {
            var isFromMirror = cache.isMirror && i >= cache.data.length;
            var valueY = isFromMirror ? d.y2 : d.y;
            var containerTop = config.container.getBoundingClientRect().top;
            var e = {
                posX: d.scaledX,
                posY: cache.chartH - d.topY + config.margin.top + d.scaledY / 2,
                name: d.name,
                color: d.color,
                valueX: d.x,
                valueY: valueY,
                containerTop: containerTop
            };
            cache.dispatch.geometryHover.call(this, e, d);
        }).on("mouseout", function() {
            cache.dispatch.geometryOut.call(this);
        }).on("click", function() {
            cache.dispatch.geometryClick.call(this);
        });
        hoveredDotsSelection.filter(function(d, i) {
            return typeof d !== "undefined" && !isNaN(d.y);
        }).style({
            fill: function(d) {
                return d.color || "silver";
            }
        }).attr({
            x: function(d) {
                return d.scaledX - d.barW / 2;
            },
            y: function(d) {
                return d.scaledY;
            },
            width: function(d) {
                return d.barW;
            },
            height: function(d) {
                return d.stackTopY - d.scaledY;
            }
        });
        hoveredDotsSelection.exit().remove();
        return this;
    },
    hideHoveredGeometry: function(config, cache) {
        cache.interactionSvg.select(".hover-group").selectAll("circle.hovered-geometry").remove();
    },
    displayVerticalGuide: function(mouseX, config, cache) {
        cache.interactionSvg.select("line.hover-guide-x").attr({
            x1: mouseX,
            x2: mouseX,
            y1: 0,
            y2: cache.chartH
        }).style({
            "pointer-events": "none"
        });
        return this;
    }
};

fy.template = "<div>" + '<svg xmlns="http://www.w3.org/2000/svg" class="bg">' + '<g class="chart-group">' + '<g class="background"><rect class="panel-bg" /></g>' + '<g class="axis-y axis-y2"></g><g class="axis-y axis-y1"></g><rect class="axis-x-bg" /><g class="axis-x"></g>' + "</g>" + "</svg>" + '<canvas class="geometry"></canvas>' + '<svg xmlns="http://www.w3.org/2000/svg" class="geometry-svg"></svg>' + '<svg xmlns="http://www.w3.org/2000/svg" class="axes">' + '<g class="chart-group">' + '<g class="axis-x"></g><rect class="axis-y-bg" /><g class="axis-y axis-y2"></g><g class="axis-y axis-y1"></g>' + "</g>" + "</svg>" + '<svg xmlns="http://www.w3.org/2000/svg" class="interaction">' + '<g class="hover-group"><line class="hover-guide-x"/>' + '<rect class="hover-rect" width="100%" height="100%" pointer-events="all" fill="none"/></rect>' + '</g><g class="brush-group"></g>' + "</svg>" + "</div>";

fy.themes = {
    "default": ".fy-chart .axis-x-bg {fill: white; }" + ".fy-chart .axis-y-bg {fill: rgba(220, 220, 220, 0.5);}" + ".fy-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }" + ".fy-chart .stripe { fill: none; }" + ".fy-chart .stripe.even { fill: rgb(250, 250, 250); }" + ".fy-chart .panel-bg { fill: white; }" + ".fy-chart .axis-y line { stroke: #eee; }" + ".fy-chart  text { font-size: 10px; fill: #aaa; }" + ".fy-chart  .hovered-geometry, .hover-guide-x{ stroke: #555; }" + ".fy-chart  .domain{ display: none}",
    dark: ".fy-chart .axis-x-bg {fill: #222; }" + ".fy-chart .axis-y-bg {fill: rgba(50, 50, 50, 0.5);}" + ".fy-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }" + ".fy-chart .stripe { fill: none; }" + ".fy-chart .stripe.even { fill: #222; }" + ".fy-chart .panel-bg { fill: #111; }" + ".fy-chart .axis-y line { stroke: #111; }" + ".fy-chart  text { font-size: 10px; fill: #aaa; }" + ".fy-chart  .hovered-geometry, .hover-guide-x{ stroke: #555; }" + ".fy-chart  .domain{ display: none}"
};

fy.setupScales = function(config, cache) {
    setupScaleX();
    setupScaleY();
    function setupScaleX() {
        var extentX = fy.graphicUtils.getZoomExtent(cache, config);
        cache.scaleX.domain(extentX);
        cache.extentX = extentX;
    }
    function setupScaleY() {
        var extentY = fy.dataUtils.computeExtent(cache, "y");
        cache.biggestY = "y";
        if (cache.isMirror !== false && fy.dataUtils.hasValidDataY2(cache)) {
            var extentY2 = fy.dataUtils.computeExtent(cache, "y2");
            if (extentY2[1] > extentY[1]) {
                cache.biggestY = "y2";
            }
            extentY = [ Math.min(extentY[0], extentY2[0]), Math.max(extentY[1], extentY2[1]) ];
        }
        if (cache.isMirror) {
            cache.scaleY.range([ cache.chartH / 2, 0 ]);
        } else {
            cache.scaleY.range([ cache.chartH, 0 ]);
        }
        var scaleYCopy = cache.scaleY.copy();
        if (config.geometryType === "stackedLine" || config.geometryType === "stackedArea" || config.geometryType === "stackedBar") {
            var stackedMaxValues = d3.zip.apply(null, cache.data.map(function(d, i) {
                return d.values.map(function(d, i) {
                    return d.y;
                });
            })).map(function(d, i) {
                return d3.sum(d);
            });
            var stackedMaxValueSum = d3.max(stackedMaxValues);
            cache.extentY = [ 0, stackedMaxValueSum ];
            scaleYCopy.domain(cache.extentY);
        } else {
            cache.extentY = config.axisYStartsAtZero ? [ 0, extentY[1] ] : extentY;
            cache.scaleY.domain(cache.extentY);
        }
    }
    return cache;
};

fy.setupAxisX = function(config, cache) {
    if (!config.showAxisX) {
        return cache;
    }
    var axisXSelection = cache.axesSvg.select(".axis-x");
    axisXSelection.attr({
        transform: "translate(" + [ 0, cache.chartH - 2 ] + ")"
    });
    var axisX = d3.svg.axis().scale(cache.scaleX).orient("bottom").tickSize(cache.axisXHeight);
    var textH = 12;
    if (config.showLabelsX) {
        var format = config.scaleX === "linear" ? d3.format(config.tickFormatX) : d3.time.format(config.tickFormatX);
        axisX.tickFormat(format);
        axisXSelection.call(axisX);
        var textOffset = cache.axisXHeight / 2 + textH / 2;
        axisXSelection.selectAll("text").attr({
            transform: function() {
                return "translate(3, -" + textOffset + ")";
            }
        });
        if (config.showTicksX === false) {
            axisXSelection.selectAll("line").remove();
        } else {
            axisXSelection.selectAll("line").attr({
                y2: cache.axisXHeight / 3
            });
        }
        axisXSelection.select(".domain").style({
            display: "none"
        });
    }
    if (config.showGridX) {
        var bgXSelection = cache.bgSvg.select(".axis-x");
        bgXSelection.attr({
            transform: "translate(" + [ 0, cache.chartH ] + ")"
        });
        bgXSelection.call(axisX);
        bgXSelection.selectAll("text").text(null);
        bgXSelection.selectAll("line").attr({
            y1: 0,
            y2: -cache.chartH
        }).classed("grid-line x", true);
        bgXSelection.select(".domain").style({
            display: "none"
        });
    }
    return cache;
};

fy.setupAxisY = function(config, cache) {
    if (!config.showAxisY) {
        return cache;
    }
    if (cache.isMirror) {
        cache.scaleY.range([ cache.chartH / 2, 0 ]);
    } else {
        cache.scaleY.range([ cache.chartH, 0 ]);
    }
    var scaleYCopy = cache.scaleY.copy();
    if (config.geometryType === "stackedLine" || config.geometryType === "stackedArea" || config.geometryType === "stackedBar" || config.geometryType === "percentBar") {
        var stackedMaxValues = d3.zip.apply(null, cache.data.map(function(d, i) {
            return d.values.map(function(d, i) {
                return d.y;
            });
        })).map(function(d, i) {
            return d3.sum(d);
        });
        var stackedMaxValueSum = d3.max(stackedMaxValues);
        scaleYCopy.domain([ 0, stackedMaxValueSum ]);
    }
    var axisContainerY = cache.axesSvg.select(".axis-y1");
    var bgYSelection = cache.bgSvg.select(".axis-y1");
    var axisY = d3.svg.axis().scale(scaleYCopy).orient("left").tickSize(0);
    function renderAxisPart(axisContainerY, bgYSelection, axisY) {
        var ticksY = [].concat(config.suggestedYTicks);
        if (ticksY[0]) {
            axisY.ticks.apply(null, ticksY);
        }
        if (config.showLabelsY) {
            axisContainerY.call(axisY);
            var texts = axisContainerY.selectAll("text").attr({
                transform: "translate(" + config.labelYOffset + ",0)"
            }).style({
                "text-anchor": config.labelYOffset > 0 ? "start" : "end"
            }).text(function(d) {
                return parseFloat(d);
            });
            texts.filter(function(d, i) {
                return i === 0;
            }).text(function() {
                return this.textContent + " " + config.suffix;
            });
            if (config.tickFormatY) {
                texts.text(config.tickFormatY);
            }
            axisContainerY.selectAll("line").remove();
        }
        if (config.showTicksY) {
            bgYSelection.call(axisY);
            bgYSelection.selectAll("text").text(null);
            bgYSelection.selectAll("line").attr({
                x1: cache.chartW
            }).classed("grid-line y", true);
        }
    }
    renderAxisPart(axisContainerY, bgYSelection, axisY);
    if (cache.isMirror) {
        var axisContainerY2 = cache.axesSvg.select(".axis-y2");
        var bgY2Selection = cache.bgSvg.select(".axis-y2");
        scaleYCopy.range([ cache.chartH / 2, cache.chartH ]);
        renderAxisPart(axisContainerY2, bgY2Selection, axisY);
    } else {
        cache.axesSvg.select(".axis-y2").selectAll("*").remove();
    }
    function findMaxLabelWidth(selection) {
        var labels = [];
        selection.each(function() {
            labels.push(this.textContent ? this.textContent.length * 6 : 0);
        });
        return d3.max(labels);
    }
    if (config.showTicksY && config.labelYOffset > 0) {
        var labels = cache.axesSvg.selectAll(".axis-y1 text, .axis-y2 text");
        var maxLabelW = findMaxLabelWidth(labels);
        var axisYBgW = maxLabelW ? maxLabelW + config.labelYOffset : 0;
        var axisYBg = cache.axesSvg.select(".axis-y-bg").attr({
            width: axisYBgW,
            height: cache.chartH
        });
    }
    cache.axesSvg.select(".domain").style({
        fill: "none",
        stroke: "none"
    });
    return cache;
};

fy.setupStripes = function(config, cache) {
    if (!config.showStripes || !fy.dataUtils.hasValidData(cache)) {
        return this;
    }
    var stripeW = fy.graphicUtils.sampleWidthInPx(cache);
    var stripCount = Math.round(cache.chartW / stripeW);
    var stripesSelection = cache.bgSvg.select(".background").selectAll("rect.stripe").data(d3.range(stripCount));
    stripesSelection.enter().append("rect").attr({
        "class": "stripe"
    });
    stripesSelection.attr({
        x: function(d, i) {
            return i * stripeW;
        },
        y: 0,
        width: stripeW,
        height: cache.chartH
    }).classed("even", function(d, i) {
        return i % 2 === 0;
    }).style({
        stroke: "none"
    });
    stripesSelection.exit().remove();
    return cache;
};

fy.setupBrush = function(config, cache) {
    if (!config.useBrush || cache.brush) {
        return cache;
    }
    cache.brush = d3.svg.brush();
    var brushChange = fy.utils.throttle(cache.dispatch.brushChange, config.brushThrottleWaitDuration);
    var brushDragMove = fy.utils.throttle(cache.dispatch.brushDragMove, config.brushThrottleWaitDuration);
    cache.brushExtent = cache.brushExtent || cache.scaleX.domain();
    cache.brush.x(cache.scaleX).extent(cache.brushExtent).on("brush", function() {
        brushChange.call(this, cache.brushExtent.map(function(d) {
            return d.getTime();
        }));
        if (!d3.event.sourceEvent) {
            return;
        }
        cache.brushExtent = cache.brush.extent();
        brushDragMove.call(this, cache.brushExtent.map(function(d) {
            return d.getTime();
        }));
    }).on("brushstart", function() {
        cache.dispatch.brushDragStart.call(this, cache.brushExtent.map(function(d) {
            return d.getTime();
        }));
    }).on("brushend", function() {
        cache.dispatch.brushDragEnd.call(this, cache.brushExtent.map(function(d) {
            return d.getTime();
        }));
    });
    cache.interactionSvg.select(".brush-group").call(cache.brush).selectAll("rect").attr({
        height: cache.chartH + cache.axisXHeight,
        y: 0
    });
    return cache;
};

fy.setupContainers = function(config, cache) {
    if (!config.container) {
        throw "A container is needed";
    }
    if (cache.root) {
        return cache;
    }
    var container = d3.select(config.container).append("div");
    container.html(fy.template);
    cache.root = container.style({
        position: "absolute"
    }).classed("chart fy-chart", true);
    cache.bgSvg = cache.root.select("svg.bg");
    cache.axesSvg = cache.root.select("svg.axes");
    cache.interactionSvg = cache.root.select("svg.interaction").attr({
        id: Math.random()
    });
    cache.geometryCanvas = cache.root.select("canvas.geometry");
    cache.geometrySVG = cache.root.select("svg.geometry-svg");
    cache.root.selectAll("svg, canvas").style({
        position: "absolute"
    });
    var scales = {
        time: d3.time.scale(),
        linear: d3.scale.linear()
    };
    cache.scaleX = scales[config.scaleX];
    cache.axisXHeight = !config.showAxisX || !config.showLabelsX ? 0 : config.axisXHeight;
    cache.axisYWidth = !config.showAxisY || !config.showLabelsY ? 0 : config.axisYWidth;
    cache.chartW = config.width - config.margin.right - config.margin.left - cache.axisYWidth;
    cache.chartH = config.height - config.margin.top - config.margin.bottom - cache.axisXHeight;
    cache.scaleX.range([ 0, cache.chartW ]);
    cache.bgSvg.style({
        height: config.height + "px",
        width: config.width + "px"
    }).selectAll(".chart-group").attr({
        transform: "translate(" + [ config.margin.left, config.margin.top ] + ")"
    });
    cache.axesSvg.style({
        height: config.height + "px",
        width: config.width + "px"
    }).select(".chart-group").attr({
        transform: "translate(" + [ config.margin.left + cache.axisYWidth, config.margin.top ] + ")"
    });
    cache.interactionSvg.style({
        height: config.height + "px",
        width: config.width + "px"
    }).select(".hover-group").attr({
        transform: "translate(" + [ config.margin.left + cache.axisYWidth, config.margin.top ] + ")"
    });
    cache.interactionSvg.select(".hover-rect").attr({
        width: cache.chartW,
        height: cache.chartH
    });
    cache.interactionSvg.select(".brush-group").attr({
        transform: "translate(" + [ config.margin.left + cache.axisYWidth, config.margin.top ] + ")"
    });
    cache.bgSvg.select(".panel-bg").attr({
        width: cache.chartW,
        height: cache.chartH
    });
    cache.bgSvg.select(".axis-x-bg").attr({
        width: cache.chartW,
        height: cache.axisXHeight,
        y: cache.chartH
    });
    if (config.geometryType === "line") {
        cache.isMirror = typeof config.isMirror === "boolean" ? config.isMirror : fy.dataUtils.hasValidDataY2(cache);
    } else {
        cache.isMirror = false;
    }
    if (config.theme !== cache.theme) {
        cache.root.select("style").remove();
        cache.root.append("style").html(fy.themes[config.theme]);
        cache.theme = config.theme;
    }
    return cache;
};

fy.setupGeometries = function(config, cache) {
    fy._computeGeometryData(config, cache);
    if (config.geometryType === "line" || config.geometryType === "stackedLine" || config.geometryType === "stackedArea") {
        fy.setupLineGeometry(config, cache);
    } else if (config.geometryType === "bar" || config.geometryType === "percentBar" || config.geometryType === "stackedBar") {
        fy.setupBarGeometry(config, cache);
    }
    return cache;
};

fy.setupBarGeometry = function(config, cache) {
    if (config.renderer === "canvas") {
        fy._renderBarGeometry(config, cache);
    } else {
        fy._renderBarGeometrySVG(config, cache);
    }
};

fy.setupLineGeometry = function(config, cache) {
    if (config.renderer === "canvas") {
        fy._renderLineGeometry(config, cache);
    } else if (config.geometryType === "stackedArea") {
        fy._renderAreaGeometrySVG(config, cache);
    } else {
        fy._renderLineGeometrySVG(config, cache);
    }
};

fy._computeGeometryData = function(config, cache) {
    if (cache.isMirror) {
        cache.scaleY.range([ cache.chartH / 2, 0 ]);
    } else {
        cache.scaleY.range([ cache.chartH, 0 ]);
    }
    var stackedValues = d3.zip.apply(null, cache.data.map(function(d, i) {
        return d.values.map(function(d, i) {
            return d[cache.biggestY];
        });
    }));
    var stackedMaxValues;
    if (config.geometryType === "stackedLine" || config.geometryType === "stackedArea" || config.geometryType === "stackedBar" || config.geometryType === "percentBar") {
        stackedMaxValues = stackedValues.map(function(d, i) {
            return d3.sum(d);
        });
    } else {
        stackedMaxValues = stackedValues.map(function(d, i) {
            return d3.max(d);
        });
    }
    var stackedMaxValue = d3.max(stackedMaxValues);
    var scaleYCopy = cache.scaleY.copy();
    scaleYCopy.domain([ 0, stackedMaxValue ]);
    var barW = cache.scaleX(cache.data[0].values[1].x);
    var barGap = Math.max(barW / 4, 1);
    barW = Math.floor(barW - barGap);
    barW = Math.max(1, barW);
    var i, j, lineData, datum, prevIndexI;
    var prevDatum;
    for (i = 0; i < cache.data.length; i++) {
        lineData = cache.data[i];
        prevDatum = lineData.values[0];
        for (j = 0; j < lineData.values.length; j++) {
            if (config.geometryType === "percentBar") {
                scaleYCopy.domain([ 0, stackedMaxValues[j] ]);
            }
            datum = lineData.values[j];
            prevIndexI = Math.max(i - 1, 0);
            datum.scaledX = cache.scaleX(datum.x);
            datum.prevScaledX = prevDatum.scaledX;
            datum.stackTopY = i === 0 || config.geometryType === "line" || config.geometryType === "bar" ? scaleYCopy.range()[0] : cache.data[prevIndexI].values[j].scaledY;
            datum.scaledY = datum.stackTopY + scaleYCopy(datum.y) - scaleYCopy.range()[0];
            datum.prevStackTopY = prevDatum.stackTopY;
            datum.prevScaledY = prevDatum.scaledY;
            datum.color = lineData.color || "silver";
            datum.name = lineData.name;
            datum.barW = barW;
            prevDatum = {
                scaledX: datum.scaledX,
                scaledY: datum.scaledY,
                stackTopY: datum.stackTopY
            };
        }
    }
    if (cache.isMirror) {
        scaleYCopy.range([ cache.chartH, cache.chartH / 2 ]);
        for (i = 0; i < cache.data.length; i++) {
            lineData = cache.data[i];
            prevDatum = lineData.values[0];
            for (j = 0; j < lineData.values.length; j++) {
                datum = lineData.values[j];
                datum.scaledY2 = cache.chartH + cache.chartH / 2 - scaleYCopy(datum.y2);
                datum.prevScaledY2 = prevDatum.scaledY2;
                prevDatum = datum;
            }
        }
    }
};

fy._renderAreaGeometrySVG = function(config, cache) {
    cache.geometrySVG.attr({
        width: cache.chartW,
        height: cache.chartH
    }).style({
        top: config.margin.top + "px",
        left: config.margin.left + "px"
    });
    var area = d3.svg.area().x(function(d) {
        return d.scaledX;
    }).y0(function(d) {
        return d.stackTopY;
    }).y1(function(d) {
        return d.scaledY;
    });
    var lines = cache.geometrySVG.selectAll("path.geometry").data(cache.data);
    lines.enter().append("path").classed("geometry", true);
    lines.attr({
        d: function(d) {
            return area(d.values);
        }
    }).style({
        stroke: function(d) {
            return d.color;
        },
        fill: function(d) {
            return d.color;
        }
    });
};

fy._renderLineGeometrySVG = function(config, cache) {
    cache.geometrySVG.attr({
        width: cache.chartW,
        height: cache.chartH
    }).style({
        top: config.margin.top + "px",
        left: config.margin.left + "px"
    });
    var line = d3.svg.line().x(function(d) {
        return d.scaledX;
    }).y(function(d) {
        return d.scaledY;
    });
    var lines = cache.geometrySVG.selectAll("path.geometry").data(cache.data);
    lines.enter().append("path").classed("geometry", true);
    lines.attr({
        d: function(d) {
            return line(d.values);
        }
    }).style({
        stroke: function(d) {
            return d.color;
        },
        fill: "none"
    });
};

fy._renderLineGeometry = function(config, cache) {
    cache.geometryCanvas.attr({
        width: cache.chartW,
        height: cache.chartH
    }).style({
        top: config.margin.top + "px",
        left: config.margin.left + "px"
    });
    var ctx = cache.geometryCanvas.node().getContext("2d");
    function renderLineSegment(datum) {
        ctx.strokeStyle = datum.color;
        ctx.fillStyle = datum.color;
        ctx.beginPath();
        ctx.moveTo(datum.prevScaledX, datum.prevScaledY);
        ctx.lineTo(datum.scaledX, datum.scaledY);
        if (config.geometryType === "stackedArea") {
            ctx.lineTo(datum.scaledX, datum.stackTopY);
            ctx.lineTo(datum.prevScaledX, datum.prevStackTopY);
            ctx.lineTo(datum.prevScaledX, datum.prevScaledY);
        }
        if (cache.isMirror) {
            ctx.moveTo(datum.prevScaledX, datum.prevScaledY2);
            ctx.lineTo(datum.scaledX, datum.scaledY2);
        }
        ctx.fill();
        ctx.stroke();
    }
    if (config.useProgressiveRendering && typeof renderQueue !== "undefined") {
        for (i = 0; i < cache.data.length; i++) {
            cache.queues.push(renderQueue(renderLineSegment).rate(config.progressiveRenderingRate));
            cache.queues.splice(cache.data.length);
        }
        cache.data.forEach(function(d, i) {
            cache.queues[i](d.values);
        });
    } else {
        cache.data.forEach(function(d, i) {
            d.values.forEach(function(d) {
                renderLineSegment(d);
            });
        });
    }
};

fy._renderBarGeometrySVG = function(config, cache) {
    cache.geometrySVG.attr({
        width: cache.chartW,
        height: cache.chartH
    }).style({
        top: config.margin.top + "px",
        left: config.margin.left + "px"
    });
    var barGroup = cache.geometrySVG.selectAll("g.geometry-group").data(cache.data);
    barGroup.enter().append("g").classed("geometry-group", true);
    barGroup.exit().remove();
    var bars = barGroup.selectAll("rect.geometry").data(function(d) {
        return d.values;
    });
    bars.enter().append("rect").classed("geometry", true);
    bars.attr({
        x: function(d) {
            return d.scaledX - d.barW / 2;
        },
        y: function(d) {
            return d.scaledY;
        },
        width: function(d) {
            return d.barW;
        },
        height: function(d) {
            return d.stackTopY - d.scaledY;
        }
    }).style({
        stroke: function(d) {
            return d.color;
        },
        fill: function(d) {
            return d.color;
        }
    });
};

fy._renderBarGeometry = function(config, cache) {
    cache.geometryCanvas.attr({
        width: cache.chartW,
        height: cache.chartH
    }).style({
        top: config.margin.top + "px",
        left: config.margin.left + "px"
    });
    var ctx = cache.geometryCanvas.node().getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    function renderBar(datum) {
        ctx.strokeStyle = datum.color;
        ctx.lineWidth = datum.barW;
        ctx.beginPath();
        ctx.moveTo(Math.floor(datum.scaledX), Math.floor(datum.scaledY));
        ctx.lineTo(Math.floor(datum.scaledX), Math.floor(datum.stackTopY));
        ctx.stroke();
    }
    if (config.useProgressiveRendering && typeof renderQueue !== "undefined") {
        for (i = 0; i < cache.data.length * 2; i++) {
            cache.queues.push(renderQueue(renderBar).rate(config.progressiveRenderingRate));
            cache.queues.splice(cache.data.length);
        }
        cache.data.forEach(function(d, i) {
            cache.queues[i](d.values);
        });
    } else {
        cache.data.forEach(function(d, i) {
            d.values.forEach(function(d) {
                renderBar(d);
            });
        });
    }
};