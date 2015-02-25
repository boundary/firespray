// Stripes
///////////////////////////////////////////////////////////
fy.setupStripes = function(config, cache) {

	if (!config.showStripes || !fy.dataUtils.hasValidData(cache)) {
		return this;
	}

	// stripes
	var stripeW = fy.graphicUtils.sampleWidthInPx(cache);

	var stripCount = Math.round(cache.chartW / stripeW);

	var stripesSelection = cache.bgSvg.select('.background').selectAll('rect.stripe')
		.data(d3.range(stripCount));
	stripesSelection.enter().append('rect').attr({'class': 'stripe'});
	stripesSelection
		.attr({
			x: function(d, i) {
				return i * stripeW;
			},
			y: 0,
			width: stripeW,
			height: cache.chartH
		})
		.classed('even', function(d, i) {
			return i % 2 === 0;
		})
		.style({stroke: 'none'});
	stripesSelection.exit().remove();

	return cache;

};