var firespray = {version: '0.1.3'};
var fy = firespray;

fy.chart = function module() {

	var that = this;

	// Configuration and cached variables
	///////////////////////////////////////////////////////////
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

	cache.dispatch = d3.dispatch('brushChange', 'brushDragStart', 'brushDragMove', 'brushDragEnd',
		'geometryHover', 'geometryOut', 'geometryClick', 'chartHover', 'chartOut', 'chartEnter',
		'mouseDragMove', 'mouseWheelScroll');

	var pipeline = fy.utils.pipeline(
		fy.setupContainers,
		fy.setupScales,
		fy.setupBrush,
		fy.setupAxisY,
		fy.setupAxisX,
		fy.setupHovering,
		fy.setupStripes,
		fy.setupGeometries
	);

	// Public methods
	///////////////////////////////////////////////////////////
	var exports = {

		render: function() {
			pipeline(config, cache);
		},

		setData: function(_newData) {
			if (!_newData || _newData.length === 0 || _newData[0].values.length === 0) {
				return this;
			}
			cache.data = fy.utils.cloneJSON(_newData);
			cache.data.sort(function(a, b) { // sort by data.values.length, useful for searching hovered dots by the longest dataset first
				var x = a.values.length;
				var y = b.values.length;
				return ((x > y) ? -1 : ((x < y) ? 1 : 0));
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
			return fy.dataUtils.getDataSlice(cache, _sliceExtentX)
		},

		getDataUnderBrush: function() {
			return fy.dataUtils.getDataSlice(cache, fy.graphicUtils.getBrushExtent(cache));
		},

		getDataInView: function() {
			return fy.dataUtils.getDataSlice(cache, fy.graphicUtils.getZoomExtent(cache, config));
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
			cache.interactionSvg.select('.hover-group').style({visibility: 'visible'});
			if (typeof closestPointsScaledX !== 'undefined') {
				fy._hovering.displayHoveredGeometry(config, cache);
				fy._hovering.displayVerticalGuide(closestPointsScaledX, config, cache);
			}
			else {
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
				x: fy.dataUtils.computeExtent(cache, 'x'),
				y: fy.dataUtils.computeExtent(cache, 'y')
			}
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
				fy.utils.override({width: config.container.clientWidth, height: config.container.clientHeight}, config);

				this.refresh();
			}
			return this;
		}
	};

	d3.rebind(exports, cache.dispatch, "on");

	return exports;

};
//
//if (typeof define === "function" && define.amd) {define(function() {return fy;}); }
//else if (typeof module === "object" && module.exports){module.exports = fy;}
//this.fy = fy;
