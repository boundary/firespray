// Brush
///////////////////////////////////////////////////////////
firespray.setupBrush = function(config, cache, dispatch){
	if(!config.useBrush || cache.brush) {return this;}

	cache.brush = d3.svg.brush();

	var brushChange = firespray.utils.throttle(dispatch.brushChange, config.brushThrottleWaitDuration);
	var brushDragMove = firespray.utils.throttle(dispatch.brushDragMove, config.brushThrottleWaitDuration);

	cache.brushExtent = cache.brushExtent || cache.scaleX.domain();
	cache.brush.x(cache.scaleX)
		.extent(cache.brushExtent)
		.on("brush", function () {
			brushChange.call(this, cache.brushExtent.map(function(d){ return d.getTime(); }));
			if (!d3.event.sourceEvent) {return;} // only on manual brush resize
			cache.brushExtent = cache.brush.extent();
			brushDragMove.call(this, cache.brushExtent.map(function(d){ return d.getTime(); }));
		})
		.on("brushstart", function(){ dispatch.brushDragStart.call(this, cache.brushExtent.map(function(d){ return d.getTime(); })); })
		.on("brushend", function(){ dispatch.brushDragEnd.call(this, cache.brushExtent.map(function(d){ return d.getTime(); })); });
	cache.interactionSvg.select('.brush-group')
		.call(cache.brush)
		.selectAll('rect')
		.attr({height: cache.chartH + cache.axisXHeight, y: 0});
};