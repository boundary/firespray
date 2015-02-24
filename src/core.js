var firespray = {version: '0.1.2'};
var fy = firespray;

fy.chart = function module() {

	var that = this;

	// Configuration and cached variables
	///////////////////////////////////////////////////////////
	var config = fy.utils.cloneJSON( fy.defaultConfig );
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

	cache.dispatch = d3.dispatch( 'brushChange', 'brushDragStart', 'brushDragMove', 'brushDragEnd',
		'geometryHover', 'geometryOut', 'geometryClick', 'chartHover', 'chartOut', 'chartEnter',
		'mouseDragMove', 'mouseWheelScroll' );

	var renderPipeline = fy.utils.pipeline(
		fy.setupContainers,
		fy.setupScales,
		fy.setupAxisY,
		fy.setupAxisX,
		fy.setupBrush,
		fy.setupHovering,
		fy.setupStripes,
		fy.setupGeometries
	);

	var updatePipeline = fy.utils.pipeline(
		fy.setupScales,
		fy.setupAxisY,
		fy.setupAxisX,
		fy.setupStripes,
		fy.setupGeometries
	);

	// Public methods
	///////////////////////////////////////////////////////////
	var exports = {

		render: function() {
			renderPipeline( config, cache );
		},

		update: function() {
			updatePipeline( config, cache );
		},

		setData: function( _newData ) {
			if ( !_newData || _newData.length === 0 || _newData[0].values.length === 0 ) {
				return this;
			}
			cache.data = fy.utils.cloneJSON( _newData );
			cache.data.sort( function( a, b ) { // sort by data.values.length, useful for searching hovered dots by the longest dataset first
				var x = a.values.length;
				var y = b.values.length;
				return ((x > y) ? -1 : ((x < y) ? 1 : 0));
			} );

			this.render();
			return this;
		},

		setConfig: function( _newConfig ) {
			fy.utils.override( _newConfig, config );
			return this;
		},

		refresh: function() {
			if ( that.dataUtils.hasValidData( cache ) ) {
				this.render();
			}
			return this;
		},

		getDataSlice: function( _sliceExtentX ) {
			var dataSlice = fy.utils.cloneJSON( cache.data )
				.map( function( d ) {
					d.values = d.values.filter( function( dB ) {
						return dB.x >= _sliceExtentX[0] && dB.x <= _sliceExtentX[1];
					} );
					return d;
				} );
			return dataSlice;
		},

		getDataUnderBrush: function() {
			return exports.getDataSlice( exports.getBrushExtent() );
		},

		getDataInView: function() {
			console.log( this.getZoomExtent, exports.getZoomExtent );
			return exports.getDataSlice( exports.getZoomExtent() );
		},

		setZoom: function( _newExtent ) {
			config.zoomedExtentX = _newExtent;
			this.update();
			return this;
		},

		getZoomExtent: function() {
			return config.zoomedExtentX || fy.dataUtils.computeExtent( cache.data, 'x' );
		},

		setBrushSelection: function( _brushSelectionExtent ) {
			if ( cache.brush ) {
				cache.brushExtent = _brushSelectionExtent;
				this.render();
			}
			return this;
		},

		setHovering: function( _dateX ) {
			if ( !fy.dataUtils.hasValidData( cache ) ) {
				return;
			}
			var hoverPosX = cache.scaleX( _dateX );

			var closestPointsScaledX = fy._hovering.injectClosestPointsFromX( hoverPosX, config, cache );
			cache.interactionSvg.select( '.hover-group' ).style( {visibility: 'visible'} );
			if ( typeof closestPointsScaledX !== 'undefined' ) {
				fy._hovering.displayHoveredGeometry( config, cache );
				fy._hovering.displayVerticalGuide( closestPointsScaledX, config, cache );
			}
			else {
				fy._hovering.hideHoveredGeometry( config, cache );
				fy._hovering.displayVerticalGuide( hoverPosX, config, cache );
			}

			return this;
		},

		brushIsFarRight: function() {
			if ( cache.brush.extent() ) {
				return cache.brush.extent()[1].getTime() === cache.scaleX.domain()[1].getTime();
			}
		},

		getBrushExtent: function() {
			if ( cache.brush.extent() ) {
				return cache.brush.extent().map( function( d ) {
					return d.getTime();
				} );
			}
		},

		getDataExtent: function() {
			return fy.dataUtils.computeExtent( cache.data, 'x' );
		},

		getDataPointCount: function() {
			return cache.data[0].values.length;
		},

		getDataPointCountInView: function() {
			return this.getDataSlice( this.getZoomExtent() )[0].values.length;
		},

		getSvgNode: function() {
			if ( cache.bgSvg ) {
				return cache.bgSvg.node();
			}
		},

		getCanvasNode: function() {
			if ( cache.geometryCanvas ) {
				return cache.geometryCanvas.node();
			}
		},

		getContainer: function() {
			if ( config.container ) {
				return config.container;
			}
		},

		resizeToContainerSize: function() {
			if ( config.container ) {
				exports.setConfig( {width: config.container.clientWidth, height: config.container.clientHeight} ).refresh();
			}
			return this;
		}
	};

	d3.rebind( exports, cache.dispatch, "on" );

	return exports;

};
//
//if (typeof define === "function" && define.amd) {define(function() {return fy;}); }
//else if (typeof module === "object" && module.exports){module.exports = fy;}
//this.fy = fy;
