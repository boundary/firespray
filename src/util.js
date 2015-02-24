// Static utilities
///////////////////////////////////////////////////////////
firespray.utils = {
	override: function( _objA, _objB ) {
		for ( var x in _objA ) {
			if ( x in _objB ) {
				_objB[x] = _objA[x];
			}
		}
	},
	cloneJSON: function( _obj ) {
		return JSON.parse( JSON.stringify( _obj ) );
	},
	throttle: function throttle( callback, limit, b ) {
		var wait = false;
		var timer = null;
		return function( a, b ) {
			if ( !wait ) {
				callback.apply( this, arguments );
				wait = true;
				clearTimeout( timer );
				timer = setTimeout( function() {
					wait = false;
				}, limit );
			}
		};
	},
	deepExtend: function( destination, source ) {
		for ( var property in source ) {
			if ( source[property] && source[property].constructor &&
				source[property].constructor === Object ) {
				destination[property] = destination[property] || {};
				arguments.callee( destination[property], source[property] );
			} else {
				destination[property] = source[property];
			}
		}
		return destination;
	},
	pipeline: function() {
		var fns = arguments;
		return function( config, cache ) {
			for ( var i = 0; i < fns.length; i++ ) {
				cache = fns[i].call( this, config, cache );
			}
			return cache;
		};
	}
};

firespray.dataUtils = {
	generateDataPoint: function( options, i ) {
		var point = {
			x: options.epoch,
			y: Math.random() * 100
		};
		if ( options.valueCount > 1 ) {
			point.y2 = Math.random() * 100;
		}
		return point;
	},
	generateDataLine: function( options, i ) {
		var pointCount = options.pointCount || 1000;
		var colors = d3.scale.category20().range();
		options.epoch = options.startEpoch;
		return {
			values: d3.range( pointCount ).map( function( dB, iB ) {
				options.epoch += 1000;
				return firespray.dataUtils.generateDataPoint( options );
			} ),
			"color": colors[i % (colors.length - 1)],
			"name": "line i"
		};
	},
	generateData: function( options ) {
		options.startEpoch = new Date().setMilliseconds( 0 );
		var lineCount = options.lineCount || 5;
		return d3.range( lineCount ).map( function( d, i ) {
			return firespray.dataUtils.generateDataLine( options, i );
		} );
	},
	hasValidData: function( cache ) {
		return (cache.data && cache.data.length !== 0 && cache.data[0].values.length !== 0);
	},
	hasValidDataY2: function( cache ) {
		if ( this.hasValidData( cache ) && typeof cache.data[0].values[0].y2 === 'number' ) {
			return !!cache.data[0].values[0];
		}
		else {
			return false;
		}
	},
	computeExtent: function( _data, _axis ) {
		return d3.extent( d3.merge( _data.map( function( d ) {
			return d.values.map( function( dB ) {
				return dB[_axis];
			} );
		} ) ) );
	},
	sampleWidthInPx: function( cache ) {
		return cache.scaleX( cache.data[0].values[2].x ) - cache.scaleX( cache.data[1].values[1].x );
	}
};
