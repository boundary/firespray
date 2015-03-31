// Y axis
///////////////////////////////////////////////////////////
fy.setupAxisY = function(config, cache) {

	if (!config.showAxisY) {
		return cache;
	}

	// Y axis
	if (cache.isMirror) {
		cache.scaleY.range([cache.chartH / 2, 0]);
	}
	else {
		cache.scaleY.range([cache.chartH, 0]);
	}

	var scaleYCopy = cache.scaleY.copy();
	if (config.geometryType === 'stackedLine' ||
		config.geometryType === 'stackedArea' ||
		config.geometryType === 'stackedBar' ||
		config.geometryType === 'percentBar') {
		var stackedMaxValues = d3.zip.apply(null, cache.data.map(function(d, i) {
			return d.values.map(function(d, i) {
				return d.y;
			});
		}))
			.map(function(d, i) {
				return d3.sum(d);
			});
		var stackedMaxValueSum = d3.max(stackedMaxValues);
		scaleYCopy.domain([0, stackedMaxValueSum]);
	}

	var axisContainerY = cache.axesSvg.select('.axis-y1');
	var bgYSelection = cache.bgSvg.select('.axis-y1');
	var axisY = d3.svg.axis().scale(scaleYCopy).orient('left').tickSize(0);

	function renderAxisPart(axisContainerY, bgYSelection, axisY) {
		var ticksY = [].concat(config.suggestedYTicks); // make sure it's an array
		if (ticksY[0]) {
			axisY.ticks.apply(null, ticksY);
		}
		// labels
		if (config.showLabelsY) {
			axisContainerY.call(axisY);
			var texts = axisContainerY.selectAll('text').attr({transform: 'translate(' + (config.labelYOffset) + ',0)'})
				.style({'text-anchor': (config.labelYOffset > 0) ? 'start' : 'end'})
				.text(function(d) {
					return parseFloat(d);
				});
			texts.filter(function(d, i) {
				return i === 0;
			}).text(function() {
				return this.textContent + ' ' + config.suffix;
			});
			if (config.tickFormatY) {
				texts.text(config.tickFormatY);
			}
			axisContainerY.selectAll('line').remove();
		}
		// grid lines
		if (config.showTicksY) {
			bgYSelection.call(axisY);
			bgYSelection.selectAll('text').text(null);
			bgYSelection.selectAll('line').attr({x1: cache.chartW})
				.classed('grid-line y', true);
		}
	}

	renderAxisPart(axisContainerY, bgYSelection, axisY);

	// Y2 axis
	if (cache.isMirror) {
		var axisContainerY2 = cache.axesSvg.select('.axis-y2');
		var bgY2Selection = cache.bgSvg.select('.axis-y2');
		//				cache.scaleY.range([cache.chartH / 2, cache.chartH]);
		scaleYCopy.range([cache.chartH / 2, cache.chartH]);

		renderAxisPart(axisContainerY2, bgY2Selection, axisY);
	}
	else {
		cache.axesSvg.select('.axis-y2').selectAll('*').remove();
	}

	// axis background
	function findMaxLabelWidth(selection) {
		var labels = [];
		selection.each(function() {
			// hack for getting the text width without FF panicking
			labels.push(this.textContent ? this.textContent.length * 6 : 0);
		});
		return d3.max(labels);
	}

	if (config.showTicksY && config.labelYOffset > 0) {
		var labels = cache.axesSvg.selectAll('.axis-y1 text, .axis-y2 text');
		var maxLabelW = findMaxLabelWidth(labels);
		var axisYBgW = maxLabelW ? maxLabelW + config.labelYOffset : 0;
		var axisYBgH = config.axisYBgH ? config.axisYBgH : cache.chartH;
		var axisYBg = cache.axesSvg.select('.axis-y-bg')
			.attr({width: axisYBgW, height: axisYBgH});
	}

	cache.axesSvg.select('.domain').style({fill: 'none', stroke: 'none'});

	return cache;
};