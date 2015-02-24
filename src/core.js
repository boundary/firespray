var firespray = {version: '0.1.2'};

firespray.chart = function module() {
	var that = this;

	// Configuration and cached variables
	///////////////////////////////////////////////////////////
	var config = firespray.utils.cloneJSON(firespray.defaultConfig);
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

	var pipeline = firespray.utils.pipeline(
		firespray.setupContainers,
		firespray.setupScales,
		firespray.setupAxisY,
		firespray.setupAxisX,
		firespray.setupBrush,
		firespray.setupHovering,
		firespray.setupStripes,
		firespray.setupGeometries
	);

	var pipeline2 = firespray.utils.pipeline(
		firespray.setupScales,
		firespray.setupAxisY,
		firespray.setupAxisX,
		firespray.setupStripes,
		firespray.setupGeometries
	);

	// Public methods
	///////////////////////////////////////////////////////////
	var exports = {

		render: function() {
			pipeline(config, cache);
		},

		update: function() {
			pipeline2(config, cache);
		},

		setData: function (_newData) {
			if(!_newData || _newData.length === 0 || _newData[0].values.length === 0) {return this;}
			cache.data = firespray.utils.cloneJSON(_newData);
//			cache.data.forEach(function(d){ d.values.forEach(function(dB){ dB.x = new Date(dB.x); }); });
			cache.data.sort(function(a, b){ // sort by data.values.length, useful for searching hovered dots by the longest dataset first
				var x = a.values.length; var y = b.values.length;
				return ((x > y) ? -1 : ((x < y) ? 1 : 0));
			});

			this.render();
			return this;
		},

		setConfig: function (_newConfig) {
			firespray.utils.override(_newConfig, config);
			return this;
		},

		refresh: function () {
			if(that.dataUtils.hasValidData(cache)) {this.render();}
			return this;
		},

		getDataSlice: function(_sliceExtentX){
			var dataSlice = firespray.utils.cloneJSON(cache.data)
				.map(function(d){
					d.values = d.values.filter(function(dB){
							return dB.x >= _sliceExtentX[0] && dB.x <= _sliceExtentX[1];
						});
					return d;
				});
			return dataSlice;
		},

		getDataUnderBrush: function(){
			return exports.getDataSlice(exports.getBrushExtent());
		},

		getDataInView: function(){
			console.log(this.getZoomExtent, exports.getZoomExtent);
			return exports.getDataSlice(exports.getZoomExtent());
		},

		setZoom: function (_newExtent) {
			config.zoomedExtentX = _newExtent;
			this.update();
			return this;
		},

		getZoomExtent: function () {
			return config.zoomedExtentX || firespray.dataUtils.computeExtent(cache.data, 'x');
		},

		setBrushSelection: function (_brushSelectionExtent) {
			if (cache.brush) {
				cache.brushExtent = _brushSelectionExtent;
				this.render();
			}
			return this;
		},

		setHovering: function(_dateX){
			if(!firespray.dataUtils.hasValidData(cache)) {return;}
			var hoverPosX = cache.scaleX(_dateX);

			var closestPointsScaledX = firespray._hovering.injectClosestPointsFromX(hoverPosX, config, cache);
			cache.interactionSvg.select('.hover-group').style({visibility: 'visible'});
			if (typeof closestPointsScaledX !== 'undefined') {
				firespray._hovering.displayHoveredGeometry(config, cache);
				firespray._hovering.displayVerticalGuide(closestPointsScaledX, config, cache);
			}
			else {
				firespray._hovering.hideHoveredGeometry(config, cache);
				firespray._hovering.displayVerticalGuide(hoverPosX, config, cache);
			}

			return this;
		},

		brushIsFarRight: function () {
			if(cache.brush.extent()) {return cache.brush.extent()[1].getTime() === cache.scaleX.domain()[1].getTime();}
		},

		getBrushExtent: function () {
			if(cache.brush.extent()) {return cache.brush.extent().map(function(d){ return d.getTime(); });}
		},

		getDataExtent: function () {
			return firespray.dataUtils.computeExtent(cache.data, 'x');
		},

		getDataPointCount: function () {
			return cache.data[0].values.length;
		},

		getDataPointCountInView: function () {
			return this.getDataSlice(this.getZoomExtent())[0].values.length;
		},

		getSvgNode: function () {
			if(cache.bgSvg) {
				return cache.bgSvg.node();
			}
		},

		getCanvasNode: function () {
			if(cache.geometryCanvas) {
				return cache.geometryCanvas.node();
			}
		},

		getContainer: function(){
			if(config.container) {return config.container;}
		},

		resizeToContainerSize: function(){
			if(config.container) {exports.setConfig({width: config.container.clientWidth, height: config.container.clientHeight}).refresh();}
			return this;
		}
	};

	d3.rebind(exports, cache.dispatch, "on");

	return exports;
};
//
//if (typeof define === "function" && define.amd) {define(function() {return firespray;}); }
//else if (typeof module === "object" && module.exports){module.exports = firespray;}
//this.firespray = firespray;
