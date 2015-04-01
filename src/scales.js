// Scales
///////////////////////////////////////////////////////////
fy.setupScales = function(config, cache) {

	setupScaleX();
	setupScaleY();

	function setupScaleX() {
		var extentX = fy.graphicUtils.getZoomExtent(cache, config);
		//TODO scaleX.range?
		cache.scaleX.domain(extentX);
		cache.extentX = extentX;
	}

	function setupScaleY() {
		var extentY = fy.dataUtils.computeExtent(cache, 'y');

		cache.biggestY = 'y';
		if (cache.isMirror !== false && fy.dataUtils.hasValidDataY2(cache)) {
			var extentY2 = fy.dataUtils.computeExtent(cache, 'y2');
			if ((extentY2[1] > extentY[1])) {
				cache.biggestY = 'y2';
			}
			extentY = [Math.min(extentY[0], extentY2[0]), Math.max(extentY[1], extentY2[1])];
		}

		if (cache.isMirror) {
			cache.scaleY.range([cache.chartH / 2, 0]);
		}
		else {
			cache.scaleY.range([cache.chartH, 0]);
		}

		if (config.geometryType === 'stackedLine' ||
			config.geometryType === 'stackedArea' ||
			config.geometryType === 'stackedBar') {
			var stackedMaxValues = d3.zip.apply(null, cache.data.map(function(d, i) {
				return d.values.map(function(d, i) {
					return d.y;
				});
			}))
				.map(function(d, i) {
					return d3.sum(d);
				});
			var stackedMaxValueSum = d3.max(stackedMaxValues);
			cache.extentY = [0, stackedMaxValueSum];
			cache.scaleY.domain(cache.extentY);
		}
		else {
			cache.extentY = config.axisYStartsAtZero ? [0, extentY[1]] : extentY;
			cache.scaleY.domain(cache.extentY);
		}
	}

	return cache;

};
