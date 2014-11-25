// X axis
///////////////////////////////////////////////////////////
firespray.setupAxisX = function(config, cache) {
	if(!firespray.convenience.hasValidData(cache)) {return;}

	if(!config.showAxisX) {return this;}

	// X axis
	/////////////////////////////
	var axisXSelection = cache.axesSvg.select('.axis-x');
	axisXSelection.attr({transform: 'translate(' + [0, cache.chartH-2] + ')'});
	var axisX = d3.svg.axis().scale(cache.scaleX).orient('bottom').tickSize(cache.axisXHeight);

	// labels
	var textH = 12;
	if(config.showLabelsX){
		if (typeof config.timeFormat === 'function') {
			axisX.tickFormat(function (d) { return config.timeFormat(d); });
		}

		axisXSelection.call(axisX);
		var textOffset = cache.axisXHeight/2 + textH/2;
		axisXSelection.selectAll('text')
			.attr({transform: function(){
				return 'translate(3, -' + textOffset + ')';
			}});
		if(config.showTicksX === false){
			axisXSelection.selectAll('line').remove();
		}
		else{
			axisXSelection.selectAll('line').attr({y2: cache.axisXHeight/2});
		}

		axisXSelection.select('.domain').style({display: 'none'});
	}

	// ticks
	if(config.showGridX){
		var bgXSelection = cache.bgSvg.select('.axis-x');
		bgXSelection.attr({transform: 'translate(' + [0, cache.chartH - cache.axisXHeight] + ')'});
		bgXSelection.call(axisX);
		bgXSelection.selectAll('text').text(null);
		bgXSelection.selectAll('line').attr({y1: -cache.chartH})
			.classed('grid-line x', true);

		bgXSelection.select('.domain').style({display: 'none'});
	}
};