// Scales
///////////////////////////////////////////////////////////
firespray.setupScales = function(config, cache){
	if(!firespray.convenience.hasValidData(cache)) {return;}

	setupScaleX();
	setupScaleY();

	function setupScaleX(){
		var extentX = config.zoomedExtentX || firespray.convenience.computeExtent(cache.data, 'x');
		//TODO scaleX.range?
		cache.scaleX.domain(extentX);
		cache.extentX = extentX;
	}

	function setupScaleY(){
		var extentY = firespray.convenience.computeExtent(cache.data, 'y');

		if(cache.isMirror !== false && firespray.convenience.hasValidDataY2(cache)) {
			var extentY2 = firespray.convenience.computeExtent(cache.data, 'y2');
			extentY = [Math.min(extentY[0], extentY2[0]), Math.max(extentY[1], extentY2[1])];
		}

		if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);}
		else {cache.scaleY.range([cache.chartH, 0]);}

		var scaleYCopy = cache.scaleY.copy();
		if(config.geometryType === 'stackedLine' ||
			config.geometryType === 'stackedArea' ||
			config.geometryType === 'stackedBar'){
			var stackedMaxValues = d3.zip.apply(null, cache.data.map(function(d, i){
					return d.values.map(function(d, i){ return d.y; });
				}))
				.map(function(d, i){ return d3.sum(d); });
			var stackedMaxValueSum = d3.max(stackedMaxValues);
			cache.extentY = [0, stackedMaxValueSum];
			scaleYCopy.domain(cache.extentY);
		}
		else{
			cache.extentY = config.axisYStartsAtZero ? [0, extentY[1]] : extentY ;
			cache.scaleY.domain(cache.extentY);
		}

	}
};