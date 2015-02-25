// Static utilities
///////////////////////////////////////////////////////////
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
			if (source[property] && source[property].constructor &&
				source[property].constructor === Object) {
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
		var pointCount = options.pointCount || 1000;
		var colors = d3.scale.category20().range();
		options.epoch = options.startEpoch;
		return {
			values: d3.range(pointCount).map(function(dB, iB) {
				options.epoch += 1000;
				return fy.dataUtils.generateDataPoint(options);
			}),
			"color": colors[i % (colors.length - 1)],
			"name": "line i"
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
		return (cache.data && cache.data.length !== 0 && cache.data[0].values.length !== 0);
	},

	hasValidDataY2: function(cache) {
		if (this.hasValidData(cache) && typeof cache.data[0].values[0].y2 === 'number') {
			return !!cache.data[0].values[0];
		}
		else {
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
		var dataSlice = fy.utils.cloneJSON(cache.data)
			.map(function(d) {
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
		return cache.scaleX(cache.data[0].values[1].x) - cache.scaleX(cache.data[0].values[0].x);
	},

	getZoomExtent: function(cache, config) {
		return config.zoomedExtentX || fy.dataUtils.computeExtent(cache, 'x');
	}

};
