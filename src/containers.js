// Containers
///////////////////////////////////////////////////////////
firespray.setupContainers = function(config, cache){
	var cache = this.cache;
	var config = this.config;
	if(!config.container){
		throw 'A container is needed';
	}

	// Template
	if(!cache.root && config.container){
		var container = d3.select(config.container).append('div');

		container.html(firespray.template);

		cache.root = container.style({position: 'absolute'}).classed('chart firespray-chart', true);
		cache.bgSvg = cache.root.select('svg.bg');
		cache.axesSvg = cache.root.select('svg.axes');
		cache.interactionSvg = cache.root.select('svg.interaction').attr({id: Math.random()});
		cache.geometryCanvas = cache.root.select('canvas.geometry');
		cache.geometrySVG = cache.root.select('svg.geometry-svg');
		cache.root.selectAll('svg, canvas').style({position: 'absolute'});
	}

	// calculate sizes
	cache.axisXHeight = (!config.showAxisX || !config.showLabelsX) ? 0 : config.axisXHeight;
	cache.chartW = config.width - config.margin.right - config.margin.left;
	cache.chartH = config.height - config.margin.top - config.margin.bottom - cache.axisXHeight;
	cache.scaleX.range([0, cache.chartW]);

	// containers
	cache.bgSvg.style({height: config.height + 'px', width: config.width + 'px'})
		.selectAll('.chart-group')
		.attr({transform: 'translate(' + [config.margin.left, config.margin.top] + ')'});
	cache.axesSvg.style({height: config.height + 'px', width: config.width + 'px'});
	cache.interactionSvg.style({height: config.height + 'px', width: config.width + 'px'});

	// background
	cache.bgSvg.select('.panel-bg').attr({width: cache.chartW, height: cache.chartH});
	cache.bgSvg.select('.axis-x-bg').attr({width: cache.chartW, height: cache.axisXHeight, y: cache.chartH});

	if(config.geometryType === 'line'){
		cache.isMirror = (typeof config.isMirror === 'boolean') ? config.isMirror : this.convenience.hasValidDataY2(cache);
	}
	else{ cache.isMirror = false; }

	if(config.theme !== cache.theme){
		cache.root.select('style').remove();
		cache.root.append('style').html(firespray.themes[config.theme]);
		cache.theme = config.theme;
	}
};