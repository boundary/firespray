// Containers
///////////////////////////////////////////////////////////
fy.setupContainers = function(config, cache) {

	if (!config.container) {
		throw 'A container is needed';
	}

	if (!cache.root) {

		// Template
		var container = d3.select(config.container).append('div');

		container.html(fy.template);

		cache.root = container.style({position: 'absolute'}).classed('firespray-chart', true);
		cache.bgSvg = cache.root.select('svg.bg');
		cache.axesSvg = cache.root.select('svg.axes');
		cache.interactionSvg = cache.root.select('svg.interaction').attr({id: Math.random()});
		cache.geometryCanvas = cache.root.select('canvas.geometry');
		cache.geometrySVG = cache.root.select('svg.geometry-svg');
		cache.root.selectAll('svg, canvas').style({position: 'absolute'});

	}

	// scale
	var scales = {time: d3.time.scale(), linear: d3.scale.linear()};
	cache.scaleX = scales[config.scaleX];

	// calculate sizes
	cache.axisXHeight = (!config.showAxisX || !config.showLabelsX) ? 0 : config.axisXHeight;
	cache.axisYWidth = (!config.showAxisY || !config.showLabelsY) ? 0 : config.axisYWidth;
	cache.chartW = config.width - config.margin.right - config.margin.left - cache.axisYWidth;
	cache.chartH = config.height - config.margin.top - config.margin.bottom - cache.axisXHeight;
	cache.scaleX.range([0, cache.chartW]);

	// containers
	cache.bgSvg.style({height: config.height + 'px', width: config.width + 'px'})
		.selectAll('.chart-group')
		.attr({transform: 'translate(' + [config.margin.left, config.margin.top] + ')'});
	cache.axesSvg.style({height: config.height + 'px', width: config.width + 'px'})
		.select('.chart-group')
		.attr({transform: 'translate(' + [config.margin.left + cache.axisYWidth, config.margin.top] + ')'});
	cache.interactionSvg.style({height: config.height + 'px', width: config.width + 'px'})
		.select('.hover-group')
		.attr({transform: 'translate(' + [config.margin.left + cache.axisYWidth, config.margin.top] + ')'});
	cache.interactionSvg.select('.hover-rect')
		.attr({width: cache.chartW, height: cache.chartH});
	cache.interactionSvg.select('.brush-group')
		.attr({transform: 'translate(' + [config.margin.left + cache.axisYWidth, config.margin.top] + ')'});

	// background
	cache.bgSvg.select('.panel-bg').attr({width: cache.chartW, height: cache.chartH});
	cache.bgSvg.select('.axis-x-bg').attr({width: cache.chartW, height: cache.axisXHeight, y: cache.chartH});

	if (config.geometryType === 'line') {
		cache.isMirror = (typeof config.isMirror === 'boolean') ? config.isMirror : fy.dataUtils.hasValidDataY2(cache);
	}
	else {
		cache.isMirror = false;
	}

	if (config.theme !== cache.theme) {
		cache.root.select('style').remove();
		cache.root.append('style').html(fy.themes[config.theme]);
		cache.theme = config.theme;
	}

	return cache;

};