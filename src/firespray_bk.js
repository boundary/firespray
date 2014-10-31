!function() {

	var firespray = function () {

		// Templates
		///////////////////////////////////////////////////////////
		var template = '<div>' +
			'<svg xmlns="http://www.w3.org/2000/svg" class="bg">' +
			'<g class="chart-group">' +
			'<g class="background"><rect class="panel-bg" /></g>' +
			'<g class="axis-y axis-y2"></g><g class="axis-y axis-y1"></g> <g class="axis-x"></g><rect class="axis-x-bg" />' +
			'</g>' +
			'</svg>' +
			'<canvas class="geometry"></canvas>' +
			'<svg xmlns="http://www.w3.org/2000/svg" class="axes">' +
			'<g class="chart-group">' +
			'<g class="axis-x"></g> <rect class="axis-y-bg" /><g class="axis-y axis-y2"></g><g class="axis-y axis-y1"></g>' +
			'</g>' +
			'</svg>' +
			'<svg xmlns="http://www.w3.org/2000/svg" class="interaction">' +
			'<g class="hover-group"><line class="hover-guide-x"/>' +
			'<rect class="hover-rect" width="100%" height="100%" pointer-events="all" fill="none"/></rect>' +
			'</g><g class="brush-group"></g>' +
			'</svg>' +
			'</div>';

		var themes = {
			default: '.firespray-chart .axis-x-bg {fill: rgba(220, 220, 220, 1); }' +
			'.firespray-chart .axis-y-bg {fill: rgba(220, 220, 220, 0.5);}' +
			'.firespray-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }' +
			'.firespray-chart .stripe { fill: none; }' +
			'.firespray-chart .stripe.even { fill: rgb(250, 250, 250); }' +
			'.firespray-chart .panel-bg { fill: white; }' +
			'.firespray-chart .axis-y line { stroke: #eee; }' +
			'text { font-size: 10px; fill: #aaa; }',

			dark: '.firespray-chart .axis-x-bg {fill: #222; }' +
			'.firespray-chart .axis-y-bg {fill: rgba(50, 50, 50, 0.5);}' +
			'.firespray-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }' +
			'.firespray-chart .stripe { fill: #222; }' +
			'.firespray-chart .panel-bg { fill: #333; }' +
			'.firespray-chart .axis-y line { stroke: #111; }' +
			'text { font-size: 10px; fill: #aaa; }'
		};

		// Configuration and cached variables
		///////////////////////////////////////////////////////////
		var config = firespray.utils.cloneJSON(firespray.defaultConfig);
		var cache = {
			root: null,
			bgSvg: null,
			axesSvg: null,
			geometryCanvas: null,
			scaleX: d3.time.scale(),
			scaleY: d3.scale.linear(),
			isMirror: null,
			axisXHeight: null,
			brushExtent: null,
			extentX: null,
			extentY: null,
			zoomedExtentX: null,
			theme: null,
			brush: null
		};

		var data = [], queues = [];
		var dispatch = d3.dispatch('brushChange', 'brushDragStart', 'brushDragMove', 'brushDragEnd', 'geometryHover', 'geometryOut', 'geometryClick', 'chartHover', 'chartOut', 'chartEnter');
		var exports = {};

		// Hovering
		///////////////////////////////////////////////////////////
		function setupHovering() {
			if(config.useBrush) {return this;}

			cache.interactionSvg.select('.hover-rect')
				.on('mousemove', function () {
					if(!hasValidData()) {return;}
					var mouseX = d3.mouse(cache.geometryCanvas.node())[0];
					var closestPointsScaledX = injectClosestPointsFromX(mouseX);
					cache.interactionSvg.select('.hover-group').style({visibility: 'visible'});
					if (typeof closestPointsScaledX !== 'undefined') {
						displayHoveredGeometry();
						dispatch.chartHover.call(exports, data);
						displayVerticalGuide(closestPointsScaledX);
					}
					else {
						hideHoveredGeometry();
						displayVerticalGuide(mouseX);
					}
				})
				.on('mouseenter', function(){ dispatch.chartEnter.call(exports); })
				.on('mouseout', function () {
					var svg = cache.interactionSvg.node();
					var target = d3.event.relatedTarget;
					if((svg.contains && !svg.contains(target)) || 
						(svg.compareDocumentPosition && !svg.compareDocumentPosition(target))) {
						cache.interactionSvg.select('.hover-group').style({visibility: 'hidden'});
						dispatch.chartOut.call(exports);
					}
				})
				.select('.hover-group');
		}

		function injectClosestPointsFromX(fromPointX) {
			var found = false, closestIndex, closestScaledX;
			data.forEach(function (d) {
				if(!found) {
					var scaledX = d.values.map(function(dB){ return dB.scaledX; });
					if(typeof scaledX[0] !== 'undefined'){
						var halfInterval = (scaledX[1] - scaledX[0]) * 0.5;
						closestIndex = d3.bisect(scaledX, fromPointX - halfInterval);
						if(typeof d.values[closestIndex] !== 'undefined'){
							closestScaledX = d.values[closestIndex].scaledX;
							found = !!closestIndex;
						}
					}
				}
				d.closestValue = d.values[closestIndex];
			});
			return closestScaledX;
		}

		function displayHoveredGeometry(){
			if(config.geometryType === 'bar' ||
				config.geometryType === 'percentBar' ||
				config.geometryType === 'stackedBar') {displayHoveredRects();}
			else {displayHoveredDots();}
		}

		function displayHoveredDots() {
			var hoverData = data.map(function(d){ return d.closestValue; });
			if (cache.isMirror) {
				var hoverData2 = data.map(function(d){
					return d.closestValue;
				});
				hoverData = hoverData.concat(hoverData2);
			}

			var hoveredDotsSelection = cache.interactionSvg.select('.hover-group').selectAll('circle.hovered-geometry')
				.data(hoverData);
			hoveredDotsSelection.enter().append('circle').attr({'class': 'hovered-geometry'})
				.on('mousemove', function(d, i){
					// format output data
					var isFromMirror = (cache.isMirror && i >= data.length);
					var scaledY = isFromMirror ?  d.scaledY2 :  d.scaledY;
					var valueY = isFromMirror ?  d.y2 :  d.y;
					var containerTop = config.container.getBoundingClientRect().top;
					var e = {
						posX: d.scaledX,
						posY: scaledY,
						name: d.name,
						color: d.color,
						valueX: d.x,
						valueY: valueY,
						containerTop: containerTop
					};
					dispatch.geometryHover.call(exports, e, d);
				})
				.on('mouseout', function(){ dispatch.geometryOut.call(exports); })
				.on('click', function(){ dispatch.geometryClick.call(exports); });
			hoveredDotsSelection
				.filter(function(d, i){ return typeof d !== 'undefined' && !isNaN(d.y); })
				.style({
					fill: function (d) { return d.color || 'silver'; }
				})
				.attr({
					r: config.dotSize,
					cx: function (d) { return d.scaledX; },
					cy: function (d, i) {
						var scaledY = (cache.isMirror && i >= data.length && d.scaledY2) ? d.scaledY2 : d.scaledY;
						return scaledY + config.margin.top;
					}
				});
			hoveredDotsSelection.exit().remove();
			return this;
		}

		function displayHoveredRects() {
			var hoverData = data.map(function(d){ return d.closestValue; });
			if (cache.isMirror) {
				var hoverData2 = data.map(function(d){
					return d.closestValue;
				});
				hoverData = hoverData.concat(hoverData2);
			}

			var hoveredDotsSelection = cache.interactionSvg.select('.hover-group').selectAll('rect.hovered-geometry')
				.data(hoverData);
			hoveredDotsSelection.enter().append('rect').attr({'class': 'hovered-geometry'})
				.on('mousemove', function(d, i){
					// format output data
					var isFromMirror = (cache.isMirror && i >= data.length);
					var scaledY = isFromMirror ?  d.scaledY2 :  d.scaledY;
					var valueY = isFromMirror ?  d.y2 :  d.y;
					var containerTop = config.container.getBoundingClientRect().top;
					var e = {
						posX: d.scaledX,
						posY: cache.chartH - d.topY + config.margin.top + d.scaledY / 2,
						name: d.name,
						color: d.color,
						valueX: d.x,
						valueY: valueY,
						containerTop: containerTop
					};
					dispatch.geometryHover.call(exports, e, d);
				})
				.on('mouseout', function(){ dispatch.geometryOut.call(exports); })
				.on('click', function(){ dispatch.geometryClick.call(exports); });
			hoveredDotsSelection
				.filter(function(d, i){ return typeof d !== 'undefined' && !isNaN(d.y); })
				.style({
					fill: function (d) { return d.color || 'silver'; }
				})
				.attr({
					width: function(d){ return d.barW; },
					height: function(d){ return d.scaledY; },
					x: function (d) { return d.scaledX - d.barW / 2; },
					y: function (d, i) {
						return cache.chartH - d.topY + config.margin.top;
					}
				});
			hoveredDotsSelection.exit().remove();
			return this;
		}

		function hideHoveredGeometry() {
			cache.interactionSvg.select('.hover-group').selectAll('circle.hovered-geometry').remove();
		}

		function displayVerticalGuide(mouseX) {
			cache.interactionSvg.select('line.hover-guide-x')
				.attr({x1: mouseX, x2: mouseX, y1: 0, y2: cache.chartH})
				.style({'pointer-events': 'none'});
			return this;
		}

		function showHovering(hoverPosX){
			var closestPointsScaledX = injectClosestPointsFromX(hoverPosX);
			cache.interactionSvg.select('.hover-group').style({visibility: 'visible'});
			if (typeof closestPointsScaledX !== 'undefined') {
				displayHoveredGeometry();
				displayVerticalGuide(closestPointsScaledX);
			}
			else {
				hideHoveredGeometry();
				displayVerticalGuide(hoverPosX);
			}
		}

		// Convenience functions
		///////////////////////////////////////////////////////////
		function hasValidData(){
			return (data && data.length !== 0 && data[0].values.length !== 0);
		}

		function hasValidDataY2(){
			if(hasValidData() && typeof data[0].values[0].y2 === 'number') {return !!data[0].values[0];}
			else {return false;}
		}

		function computeExtent(_data, _axis) {
			return d3.extent(d3.merge(_data.map(function(d){ return d.values.map(function(dB){ return dB[_axis]; }); })));
		}

		// Rendering
		///////////////////////////////////////////////////////////
		function render() {
			setupContainers();
			setupScales();
			setupAxisY();
			setupAxisX();
			setupBrush();
			setupHovering();
			setupStripes();
			setupGeometries();
		}

		function setupGeometries(){
			if(!hasValidData()) {return;}

			if(config.geometryType === 'line' ||
				config.geometryType === 'stackedLine' ||
				config.geometryType === 'stackedArea') {renderLineGeometry();}
			else if(config.geometryType === 'bar' ||
				config.geometryType === 'percentBar' ||
				config.geometryType === 'stackedBar') {renderBarGeometry();}
		}

		function setupContainers(){

			// Template
			if(!cache.root && config.container){
				var container = d3.select(config.container).append('div');

				container.html(template);

				cache.root = container.style({position: 'absolute'}).classed('chart firespray-chart', true);
				cache.bgSvg = cache.root.select('svg.bg');
				cache.axesSvg = cache.root.select('svg.axes');
				cache.interactionSvg = cache.root.select('svg.interaction');
				cache.geometryCanvas = cache.root.select('canvas.geometry');
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
				cache.isMirror = (typeof config.isMirror === 'boolean') ? config.isMirror : hasValidDataY2();
			}
			else{ cache.isMirror = false; }

			if(config.theme !== cache.theme){
				cache.root.select('style').remove();
				cache.root.append('style').html(themes[config.theme]);
				cache.theme = config.theme;
			}
		}

		// Scales
		///////////////////////////////////////////////////////////
		function setupScales(){
			if(!hasValidData()) {return;}

			setupScaleX();
			setupScaleY();
		}

		function setupScaleX(){
			var extentX = config.zoomedExtentX || computeExtent(data, 'x');
			//TODO scaleX.range?
			cache.scaleX.domain(extentX);
			cache.extentX = extentX;
		}

		function setupScaleY(){
			var extentY = computeExtent(data, 'y');

			if(cache.isMirror != false && hasValidDataY2()) {
				var extentY2 = computeExtent(data, 'y2');
				extentY = [Math.min(extentY[0], extentY2[0]), Math.max(extentY[1], extentY2[1])];
			}

			if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);}
			else {cache.scaleY.range([cache.chartH, 0]);}

			var scaleYCopy = cache.scaleY.copy();
			if(config.geometryType === 'stackedLine' || config.geometryType === 'stackedArea'){
				var stackedMaxValues = d3.zip.apply(null, data.map(function(d, i){
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

		// Axes
		///////////////////////////////////////////////////////////
		function setupAxisY(){
			if(!hasValidData()) {return;}

			if(!config.showAxisY) {return this;}

			// Y axis
			if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);}
			else {cache.scaleY.range([cache.chartH, 0]);}

			var scaleYCopy = cache.scaleY.copy();
			if(config.geometryType === 'stackedLine' || config.geometryType === 'stackedArea'){
				var stackedMaxValues = d3.zip.apply(null, data.map(function(d, i){
					return d.values.map(function(d, i){ return d.y; });
				}))
					.map(function(d, i){ return d3.sum(d); });
				var stackedMaxValueSum = d3.max(stackedMaxValues);
				scaleYCopy.domain([0, stackedMaxValueSum]);
			}

			var axisContainerY = cache.axesSvg.select('.axis-y1');
			var bgYSelection = cache.bgSvg.select('.axis-y1');
			var axisY = d3.svg.axis().scale(scaleYCopy).orient('left').tickSize(0);

			function renderAxisPart(axisContainerY, bgYSelection, axisY){
				var ticksY = [].concat(config.suggestedYTicks); // make sure it's an array
				if (ticksY[0]) {axisY.ticks.apply(null, ticksY);}
				// labels
				if(config.showLabelsY){
					axisContainerY.call(axisY);
					var texts = axisContainerY.selectAll('text').attr({transform: 'translate(' + (config.labelYOffset - 2) + ',0)'})
						.style({'text-anchor': 'start'})
						.text(function(d){ return parseFloat(d); });
					texts.filter(function(d, i){ return i === 0; }).text(function(){ return this.textContent + ' ' + config.suffix; });
					if(config.tickFormatY) {texts.text(config.tickFormatY);}
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
			else {cache.axesSvg.select('.axis-y2').selectAll('*').remove();}

			// axis background
			function findMaxLabelWidth(selection){
				var labels = [], labelW;
				selection.each(function(){
					// hack for getting the text width without FF panicking
					labels.push(this.textContent ? this.textContent.length*6 : 0);
				});
				return d3.max(labels);
			}
			if (config.showTicksY) {
				var labels = cache.axesSvg.selectAll('.axis-y1 text, .axis-y2 text');
				var maxLabelW = findMaxLabelWidth(labels);
				var axisYBgW = maxLabelW ? maxLabelW + config.labelYOffset : 0;
				var axisYBg = cache.axesSvg.select('.axis-y-bg');
				axisYBg.attr({width: axisYBgW, height: cache.chartH, y: config.margin.top});
			}

			cache.axesSvg.select('.domain').style({fill: 'none', stroke: 'none'});

		}

		function setupAxisX(){
			if(!hasValidData()) {return;}

			if(!config.showAxisX) {return this;}

			// X axis
			/////////////////////////////
			var axisXSelection = cache.axesSvg.select('.axis-x');
			axisXSelection.attr({transform: 'translate(' + [0, cache.chartH-2] + ')'});
			var axisX = d3.svg.axis().scale(cache.scaleX).orient('bottom').tickSize(cache.axisXHeight);

			// labels
			if(config.showLabelsX){
				if (typeof config.timeFormat === 'function') {
					axisX.tickFormat(function (d) { return config.timeFormat(d); });
				}

				axisXSelection.call(axisX);
				var textH = 12;
				var textOffset = cache.axisXHeight/2 + textH/2;
				axisXSelection.selectAll('text')
					.attr({transform: function(){
						return 'translate(3, -' + textOffset + ')';
					}});
				axisXSelection.selectAll('line').remove();
			}

			// ticks
			if(config.showTicksX){
				var bgXSelection = cache.bgSvg.select('.axis-x');
				bgXSelection.attr({transform: 'translate(' + [0, cache.chartH] + ')'});
				bgXSelection.call(axisX);
				bgXSelection.selectAll('text').text(null);
				bgXSelection.selectAll('line').attr({y1: -cache.chartH})
					.classed('grid-line x', true);
			}

			cache.axesSvg.select('.domain').style({fill: 'none', stroke: 'none'});
		}

		function setupStripes(){

			if(!config.showStripes || !hasValidData()) {return this;}

			// stripes
			var stripeW = cache.scaleX(data[0].values[1].x) * config.stripeWidthInSample;
			var stripCount = Math.ceil(cache.chartW / stripeW);

			var stripesSelection = cache.bgSvg.select('.background').selectAll('rect.stripe')
				.data(d3.range(stripCount));
			stripesSelection.enter().append('rect').attr({'class': 'stripe'});
			stripesSelection
				.attr({
					x: function(d, i){ return i * stripeW; },
					y: 0,
					width: stripeW,
					height: cache.chartH
				})
				.classed('even', function(d, i){ return i%2 === 0; })
				.style({stroke: 'none'});
			stripesSelection.exit().remove();
		}

		// Geometry
		///////////////////////////////////////////////////////////
		function renderLineGeometry(){

			// line geometry
			cache.geometryCanvas.attr({
					width: cache.chartW,
					height: cache.chartH
				})
				.style({
					top: config.margin.top + 'px',
					left: config.margin.left + 'px'
				});
			var ctx = cache.geometryCanvas.node().getContext('2d');
			ctx.globalCompositeOperation = "source-over";
//                ctx.translate(0.5, 0.5);
//                ctx.lineWidth = 1.5;

			if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);} // TODO use in common with  setupAxisY
			else {cache.scaleY.range([cache.chartH, 0]);}

			var scaleYCopy = cache.scaleY.copy(); //TODO ?
			if(config.geometryType === 'stackedLine' || config.geometryType === 'stackedArea'){
				var stackedMaxValues = d3.zip.apply(null, data.map(function(d, i){
						return d.values.map(function(d, i){ return d.y; });
					}))
					.map(function(d, i){ return d3.sum(d); });
				var stackedMaxValueSum = d3.max(stackedMaxValues);
				scaleYCopy.domain([0, stackedMaxValueSum]);
			}

			var i, j, lineData, datum, prevIndexI, prevIndexJ;
			function renderLineSegment(datum){
				ctx.strokeStyle = datum.color;
				ctx.fillStyle = datum.color;
				ctx.beginPath();
				ctx.moveTo(datum.prevScaledX, datum.prevScaledY);
				ctx.lineTo(datum.scaledX, datum.scaledY);

				if(config.geometryType === 'stackedArea'){
					ctx.lineTo(datum.scaledX, datum.stackTopY);
					ctx.lineTo(datum.prevScaledX, datum.prevStackTopY);
					ctx.lineTo(datum.prevScaledX, datum.prevScaledY);
				}

				if(cache.isMirror){
					ctx.moveTo(datum.prevScaledX, datum.prevScaledY2);
					ctx.lineTo(datum.scaledX, datum.scaledY2);
				}
				ctx.fill();
				ctx.stroke();
			}

			var prevDatum;
			for (i = 0; i < data.length; i++) {
				lineData = data[i];
				prevDatum = lineData.values[0];
				for (j = 0; j < lineData.values.length; j++) {
					datum = lineData.values[j];
					prevIndexI = Math.max(i-1, 0);
					datum.scaledX = cache.scaleX(datum.x);
					datum.prevScaledX = prevDatum.scaledX;
					datum.stackTopY = (i === 0 || config.geometryType === 'line') ? scaleYCopy.range()[0] : data[prevIndexI].values[j].scaledY;
					datum.scaledY = datum.stackTopY + scaleYCopy(datum.y) - scaleYCopy.range()[0];
					datum.prevStackTopY = prevDatum.stackTopY;
					datum.prevScaledY = prevDatum.scaledY;
					datum.color = lineData.color || 'silver';
					datum.name = lineData.name;
					prevDatum = {scaledX: datum.scaledX, scaledY: datum.scaledY, stackTopY: datum.stackTopY};
				}
			}

			if (cache.isMirror) {
				scaleYCopy.range([cache.chartH, cache.chartH / 2]);
				for (i = 0; i < data.length; i++) {
					lineData = data[i];
					prevDatum = lineData.values[0];
					for (j = 0; j < lineData.values.length; j++) {
						datum = lineData.values[j];
						datum.scaledY2 = cache.chartH + cache.chartH / 2 - scaleYCopy(datum.y2);
						datum.prevScaledY2 = prevDatum.scaledY2;
						prevDatum = datum;
					}
				}
			}

			if(config.useProgressiveRendering && typeof renderQueue !== 'undefined'){
				for (i = 0; i < data.length * 2; i++){
					queues.push(renderQueue(renderLineSegment).rate(config.progressiveRenderingRate));
				}
				data.forEach(function(d, i){ queues[i](d.values); });
			}
			else {data.forEach(function(d, i){ d.values.forEach(function(d){ renderLineSegment(d); }); });}

		}

		function renderBarGeometry(){

			// line geometry
			cache.geometryCanvas.attr({
				width: cache.chartW,
				height: cache.chartH
			})
				.style({
					top: config.margin.top + 'px',
					left: config.margin.left + 'px'
				});
			var ctx = cache.geometryCanvas.node().getContext('2d');
			ctx.globalCompositeOperation = "source-over";

			cache.scaleY.range([cache.chartH, 0]);

			var i, j, lineData, datum, prevIndex;

			// bar width
			var barW = cache.scaleX(data[0].values[1].x);
			var barGap = Math.max(barW/4, 1);
			barW = Math.floor(barW - barGap);
			barW = Math.max(1, barW);

			// hover
			function renderBar(datum){
				ctx.strokeStyle = datum.color;
				ctx.lineWidth = datum.barW;
				ctx.beginPath();
				ctx.moveTo(Math.floor(datum.scaledX), cache.chartH - Math.floor(datum.prevTopY));
				ctx.lineTo(Math.floor(datum.scaledX), cache.chartH - Math.floor(datum.topY));
				ctx.stroke();
			}

			var stackedMaxValues;
			var stackedValues = d3.zip.apply(null, data.map(function(d, i){
				return d.values.map(function(d, i){ return d.y; });
			}));
			if(config.geometryType === 'bar'){
				stackedMaxValues = stackedValues.map(function(d, i){ return d3.max(d); });
			}
			else{
				stackedMaxValues = stackedValues.map(function(d, i){ return d3.sum(d); });
			}
			var stackedMaxValueSum = d3.max(stackedMaxValues);

			var scaleYCopy = cache.scaleY.copy();
			scaleYCopy.domain([0, stackedMaxValueSum]).range([0, cache.chartH]);

			for (i = 0; i < data.length; i++) {
				lineData = data[i];
				for (j = 0; j < lineData.values.length; j++) {
					if(config.geometryType === 'percentBar') {scaleYCopy.domain([0, stackedMaxValues[j]]).range([0, cache.chartH]);}
					datum = lineData.values[j];
					prevIndex = Math.max(j-1, 0);
					datum.scaledX = cache.scaleX(datum.x);
					datum.scaledY = scaleYCopy(datum.y);
					datum.prevTopY = (i === 0 || config.geometryType === 'bar') ? 0 : data[Math.max(i-1, 0)].values[j].topY;
					datum.topY = (datum.prevTopY + datum.scaledY);
					datum.color = lineData.color || 'silver';
					datum.name = lineData.name;
					datum.barW = barW;
				}
			}

			if(config.useProgressiveRendering && typeof renderQueue !== 'undefined'){ //TODO share with renderLineGeometry
				for (i = 0; i < data.length * 2; i++){
					queues.push(renderQueue(renderBar).rate(config.progressiveRenderingRate));
				}
				data.forEach(function(d, i){ queues[i](d.values); });
			}
			else {data.forEach(function(d, i){ d.values.forEach(function(d){ renderBar(d); }); });}
		}

		// Brush
		///////////////////////////////////////////////////////////
		function setupBrush(){
			if(!config.useBrush || cache.brush) {return this;}

			cache.brush = d3.svg.brush();

			var brushChange = firespray.utils.throttle(dispatch.brushChange, config.brushThrottleWaitDuration);
			var brushDragMove = firespray.utils.throttle(dispatch.brushDragMove, config.brushThrottleWaitDuration);

			cache.brushExtent = cache.brushExtent || cache.scaleX.domain();
			cache.brush.x(cache.scaleX)
				.extent(cache.brushExtent)
				.on("brush", function () {
					brushChange.call(exports, cache.brushExtent.map(function(d){ return d.getTime(); }));
					if (!d3.event.sourceEvent) {return;} // only on manual brush resize
					cache.brushExtent = cache.brush.extent();
					brushDragMove.call(exports, cache.brushExtent.map(function(d){ return d.getTime(); }));
				})
				.on("brushstart", function(){ dispatch.brushDragStart.call(exports, cache.brushExtent.map(function(d){ return d.getTime(); })); })
				.on("brushend", function(){ dispatch.brushDragEnd.call(exports, cache.brushExtent.map(function(d){ return d.getTime(); })); });
			cache.interactionSvg.select('.brush-group')
				.call(cache.brush)
				.selectAll('rect')
				.attr({height: cache.chartH + cache.axisXHeight, y: 0});
		}

		// Public methods
		///////////////////////////////////////////////////////////
		exports.setData = function (_newData) {
			if(!_newData || _newData.length === 0 || _newData[0].values.length === 0) {return this;}

			data = firespray.utils.cloneJSON(_newData);
			data.forEach(function(d){ d.values.forEach(function(dB){ dB.x = new Date(dB.x); }); });
			data.sort(function(a, b){ // sort by data.values.length, useful for searching hovered dots by the longest dataset first
				var x = a.values.length; var y = b.values.length;
				return ((x > y) ? -1 : ((x < y) ? 1 : 0));
			});
			if(_newData.metadata) {data.metadata = _newData.metadata;} //TODO needed?

			render();
			return this;
		};

		exports.setConfig = function (_newConfig) {
			firespray.utils.override(_newConfig, config);
			return this;
		};

		exports.refresh = function () {
			if(hasValidData()) {render();}
			return this;
		};

		exports.getDataSlice = function(_sliceExtentX){
			var dataSlice = firespray.utils.cloneJSON(data)
				.map(function(d){
					d.values = d.values.map(function(dB){
							dB.x = new Date(dB.x);
							return dB;
						})
						.filter(function(dB){
							return dB.x.getTime() >= _sliceExtentX[0] && dB.x.getTime() <= _sliceExtentX[1];
						});
					return d;
				});
			return dataSlice;
		};

		exports.getDataUnderBrush = function(){
			return exports.getDataSlice(exports.getBrushExtent());
		};

		exports.setZoom = function (_newExtent) {
			config.zoomedExtentX = _newExtent.map(function (d) { return new Date(d); });
			render();
			return this;
		};

		exports.setBrushSelection = function (_brushSelectionExtent) {
			if (cache.brush) {
				cache.brushExtent = _brushSelectionExtent.map(function (d) { return new Date(d); });
				render();
			}
			return this;
		};

		exports.setHovering = function(_dateX){
			if(!hasValidData()) {return;}
			var hoverPosX = cache.scaleX(_dateX);
			showHovering(hoverPosX);
		};

		exports.brushIsFarRight = function () {
			if(cache.brush.extent()) {return cache.brush.extent()[1].getTime() === cache.scaleX.domain()[1].getTime();}
		};

		exports.getBrushExtent = function () {
			if(cache.brush.extent()) {return cache.brush.extent().map(function(d){ return d.getTime(); });}
		};

		exports.getDataExtent = function () {
			if(cache.extentX && cache.extentX) {
				return {x: cache.extentX.map(function(d){ return d.getTime(); }), y:cache.extentY};
			}
		};

		exports.getSvgNode = function () {
			if(cache.bgSvg) {
				return cache.bgSvg.node();
			}
			return null;
		};

		exports.getCanvasNode = function () {
			if(cache.geometryCanvas) {
				return cache.geometryCanvas.node();
			}
			return null;
		};

		exports.getContainer = function(){
			if(config.container) {return config.container;}
		};

		exports.resizeToContainerSize = function(){
			if(config.container) {exports.setConfig({width: config.container.clientWidth, height: config.container.clientHeight}).refresh();}
			return this;
		};

		d3.rebind(exports, dispatch, "on");

		return exports;
	};

	// Static default config
	///////////////////////////////////////////////////////////
	firespray.defaultConfig = {
		width: 500,
		height: 300,
		margin: {top: 0, right: 0, bottom: 0, left: 0},
		container: null,
		showTicksX: true,
		showTicksY: true,
		useBrush: false,
		suggestedXTicks: 10,
		suggestedYTicks: null,
		timeFormat: d3.time.format('%H:%M:%S'),
		axisXHeight: 20,
		isMirror: null,
		dotSize: 4,
		suffix: '',
		stripeWidthInSample: 1,
		tickFormatY: null,
		labelYOffset: 10,
		axisYStartsAtZero: true,
		showStripes: true,
		geometryType: 'line', // bar, percentBar
		showAxisX: true,
		showAxisY: true,
		showLabelsX: true,
		showLabelsY: true,
		progressiveRenderingRate: 300,
		brushThrottleWaitDuration: 10,
		useProgressiveRendering: true,
		theme: null // 'default'
	};

	// Utilities
	///////////////////////////////////////////////////////////
	firespray.utils = {
		override: function (_objA, _objB) { for (var x in _objA) {if (x in _objB) {_objB[x] = _objA[x];}} },
		cloneJSON: function(_obj){ return JSON.parse(JSON.stringify(_obj)); },
		throttle: function throttle (callback, limit, b) {
			var wait = false;
			return function (a, b) {
				if (!wait) {
					callback.apply(this, arguments);
					wait = true;
					setTimeout(function(){wait = false;}, limit);
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
		generateDataPoint: function(options, i){
			var point = {
					x: options.epoch,
					y: Math.random()*100
				};
			if(options.valueCount > 1) {point.y2 = Math.random()*100;}
			return point;
		},
		generateDataLine: function(options, i){
			var pointCount = options.pointCount || 1000;
			var colors = d3.scale.category20().range();
			options.epoch = options.startEpoch;
			return {
				values: d3.range(pointCount).map(function(dB, iB){
					options.epoch += 1000;
					return firespray.utils.generateDataPoint(options);
				}),
				"color": colors[i],
				"name": "line i"
			};
		},
		generateData: function(options){
			options.startEpoch = new Date().getTime();
			var lineCount = options.lineCount || 5;
			return d3.range(lineCount).map(function(d, i){
				return firespray.utils.generateDataLine(options, i);
			});
		}
	};

	if (typeof define === "function" && define.amd) {define(function() {return firespray;}); }
	else if (typeof module === "object" && module.exports){module.exports = firespray;}
	this.firespray = firespray;
}();
