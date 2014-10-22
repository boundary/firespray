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
			'<g class="hover-group"><line class="hover-guide-x"/></g><g class="brush-group"></g>' +
			'</svg>' +
			'</div>';

		var defaultStyle = '.firespray-chart .axis-x-bg {fill: rgba(220, 220, 220, 1); }' +
			'.firespray-chart .axis-y-bg {fill: rgba(220, 220, 220, 0.5);}' +
			'.firespray-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }' +
			'.firespray-chart .stripe { fill: rgb(250, 250, 250); }' +
			'.firespray-chart .panel-bg { fill: white; }' +
			'.firespray-chart .axis-y line { stroke: #eee; }';

		// Configuration and cached variables
		///////////////////////////////////////////////////////////
		var config = firespray.utils.cloneJSON(firespray.defaultConfig);
		var cache = {
			root: null,
			bgSvg: null,
			axesSvg: null,
			geometryCanvas: null,
			resolutionConfigs: null,
			scaleX: d3.time.scale(),
			scaleY: d3.scale.linear(),
			isMirror: null,
			axisXHeight: null,
			brushExtent: null,
			extentX: null,
			extentY: null
		};
		var resolutionConfigs = {
			second: { dividerMillis: 1000, dateFunc: 'setSeconds', d3DateFunc: d3.time.second},
			minute: { dividerMillis: 60*1000, dateFunc: 'setMinutes', d3DateFunc: d3.time.minute},
			hour: { dividerMillis: 60*60*1000, dateFunc: 'setHours', d3DateFunc: d3.time.hour}
		};

		var data = [], queues = [];
		var brush = d3.svg.brush();
		var dispatch = d3.dispatch('brushChange', 'brushDragStart', 'brushDragMove', 'brushDragEnd', 'dotHover', 'dotMouseOut', 'dotClick', 'chartHover', 'chartOut', 'chartEnter');
		var exports = {};

		// Initialization
		///////////////////////////////////////////////////////////
		function init() {

			// Template
			if(!config.container) {return this;}
			var container = d3.select(config.container).append('div');

			container.html(template);

			cache.root = container.style({position: 'absolute'}).classed('chart firespray-chart', true);
			cache.bgSvg = cache.root.select('svg.bg');
			cache.axesSvg = cache.root.select('svg.axes');
			cache.interactionSvg = cache.root.select('svg.interaction');
			cache.geometryCanvas = cache.root.select('canvas.geometry');
			cache.root.selectAll('svg, canvas').style({position: 'absolute'});

			// Hovering
			if(!config.useBrush) {setupHovering();}

			return this;
		}

		// Hovering
		///////////////////////////////////////////////////////////
		function setupHovering() {
			cache.interactionSvg
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
					if(!cache.interactionSvg.node().contains(d3.event.relatedTarget)) {
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
					dispatch.dotHover.call(exports, e, d);
				})
				.on('mouseout', function(){ dispatch.dotMouseOut.call(exports); })
				.on('click', function(){ dispatch.dotClick.call(exports); });
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
					dispatch.call(exports, e, d);
				})
				.on('mouseout', function(){ dispatch.dotMouseOut.call(exports); })
				.on('click', function(){ dispatch.dotClick.call(exports); });
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

		// Convenience functions
		///////////////////////////////////////////////////////////
		function getFirstDataValue(){
			if(hasValidData()) {return data[0].values[0];}
		}

		function getLastDataValue(){
			if(hasValidData()) {return data[0].values[data[0].values.length-1];}
		}

		function hasValidData(){
			return (data && data.length !== 0 && data[0].values.length !== 0);
		}

		function hasValidDataY2(){
			if(hasValidData() && typeof data[0].values[0].y2 === 'number') {return data[0].values[0];}
			else {return false;}
		}

		function prepareScales (_extentX, _extentY) {
			if (_extentX) {
				cache.scaleX.domain(_extentX);
				cache.extentX = _extentX;
			}
			if (_extentY) {
				var extent = config.axisYStartsAtZero ? [0, _extentY[1]] : _extentY ;
				cache.scaleY.domain(extent);
				cache.extentY = extent;
			}
		}

		// Rendering
		///////////////////////////////////////////////////////////
		function render() {
			if (!cache.geometryCanvas && config.container) {init();}
			prepareContainers();
			if(config.showAxisY) {renderAxisY();}
			if(config.showAxisX) {renderAxisX();}
			if(config.useBrush) {setupBrush();}
			if(!hasValidData()) {return;}
			if(config.showStripes) {showStripes();}
			if(config.geometryType === 'line' ||
				config.geometryType === 'stackedLine' ||
				config.geometryType === 'stackedArea') {renderLineGeometry();}
			else if(config.geometryType === 'bar' ||
				config.geometryType === 'percentBar' ||
				config.geometryType === 'stackedBar') {renderBarGeometry();}
			if(config.theme) {applyStyle();}
		}

		function prepareContainers(){

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

			cache.resolutionConfig = resolutionConfigs[config.resolution];
			cache.isMirror = (typeof config.isMirror === 'boolean') ? config.isMirror : hasValidDataY2();
			cache.isMirror = (config.geometryType === 'percentBar' ||
				config.geometryType === 'stackedBar' ||
				config.geometryType === 'stackedLine' ||
				config.geometryType === 'stackedArea')? false : cache.isMirror;
		}

		// Axes
		///////////////////////////////////////////////////////////
		function renderAxisY(){

			// Y axis
			if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);}
			else {cache.scaleY.range([cache.chartH, 0]);}

			var axisContainerY = cache.axesSvg.select('.axis-y1');
			var bgYSelection = cache.bgSvg.select('.axis-y1');
			var axisY = d3.svg.axis().scale(cache.scaleY).orient('left').tickSize(0);

			function renderAxisPart(axisContainerY, bgYSelection, axisY){
				var ticksY = [].concat(config.suggestedYTicks); // make sure it's an array
				if (ticksY[0]) {axisY.ticks.apply(null, ticksY);}
				// labels
				if(config.showLabelsY){
					axisContainerY.call(axisY);
					var texts = axisContainerY.selectAll('text').attr({transform: 'translate(' + (config.labelYOffset - 2) + ',0)'})
						.style({'text-anchor': 'start'})
						.text(function(d){ return parseFloat(d); });
					texts.filter(function(d, i){ return i === 0; }).text(function(){ return this.innerHTML + ' ' + config.suffix; });
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
				cache.scaleY.range([cache.chartH / 2, cache.chartH]);

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

		function renderAxisX(){

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

				if (config.resolution && config.suggestedXTicks){
					// if below suggested time interval, reduce to 1 interval
					var extentSecondsInterval = (cache.extentX[1].getTime() - cache.extentX[0].getTime()) / cache.resolutionConfig.dividerMillis;
					var suggestedTicks = (extentSecondsInterval <= config.suggestedXTicks) ? Math.floor(extentSecondsInterval) : config.suggestedXTicks;
					axisX.ticks(suggestedTicks);
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

		function showStripes(){

			// stripes
			if(hasValidData() && cache.resolutionConfig){
				var extentXMinusOneStripe = cache.resolutionConfig.d3DateFunc.offset(cache.extentX[0], -config.stripeWidthInSample*2);
				var discretizedDates = cache.resolutionConfig.d3DateFunc.range(extentXMinusOneStripe, cache.extentX[1], config.stripeWidthInSample*2);
				var tickSpacing = cache.scaleX(cache.resolutionConfig.d3DateFunc.offset(getFirstDataValue().x, config.stripeWidthInSample)) - cache.scaleX(getFirstDataValue().x);

				var stripesSelection = cache.bgSvg.select('.background').selectAll('rect.stripe')
					.data(discretizedDates);
				stripesSelection.enter().append('rect').attr({'class': 'stripe'});
				stripesSelection
					.attr({
						x: function(d){ return cache.scaleX(d); },
						y: 0,
						width: isNaN(tickSpacing)? 0 : tickSpacing,
						height: cache.chartH
					})
					.style({stroke: 'none'});
				stripesSelection.exit().remove();
			}
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

			if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);}
			else {cache.scaleY.range([0, cache.chartH]);}

			var scaleYCopy = cache.scaleY.copy();
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
					ctx.lineTo(datum.scaledX, cache.chartH - datum.stackTopY);
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
					datum.prevScaledY = prevDatum.scaledY;
					datum.prevStackTopY = cache.chartH - prevDatum.stackTopY;
					datum.stackTopY = (i === 0 || config.geometryType === 'line') ? scaleYCopy.range()[0] : cache.chartH - data[prevIndexI].values[j].scaledY;
					datum.scaledY = cache.chartH - (datum.stackTopY + scaleYCopy(datum.y));
					datum.color = lineData.color || 'silver';
					datum.name = lineData.name;
					datum.talkerName = lineData.talkerName;
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
						datum.scaledY2 = scaleYCopy(datum.y2);
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
			var barW = cache.scaleX(cache.resolutionConfig.d3DateFunc.offset(cache.extentX[0], 1));
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
					datum.talkerName = lineData.talkerName;
					datum.barW = barW;
				}
			}

			for (i = 0; i < data.length * 2; i++){
				queues.push(renderQueue(renderBar).rate(config.progressiveRenderingRate));
			}
			data.forEach(function(d, i){ queues[i](d.values); });
		}

		// Brush
		///////////////////////////////////////////////////////////
		function setupBrush(){
			var brushChange = firespray.utils.throttle(dispatch.brushChange, config.brushThrottleWaitDuration);
			var brushDragMove = firespray.utils.throttle(dispatch.brushDragMove, config.brushThrottleWaitDuration);
			if (config.useBrush) {
				cache.brushExtent = cache.brushExtent || cache.scaleX.domain();
				brush.x(cache.scaleX)
					.extent(cache.brushExtent)
					.on("brush", function () {
						brushChange.call(exports, cache.brushExtent);
						if (!d3.event.sourceEvent) {return;} // only on manual brush resize
						cache.brushExtent = brush.extent();
						brushDragMove.call(exports, cache.brushExtent);
					})
					.on("brushstart", function(){ dispatch.brushDragStart.call(exports, cache.brushExtent); })
					.on("brushend", function(){ dispatch.brushDragEnd.call(exports, cache.brushExtent); });
				cache.interactionSvg.select('.brush-group')
					.call(brush)
					.selectAll('rect')
					.attr({height: cache.chartH + cache.axisXHeight, y: 0});
			}
		}

		function applyStyle(){
			if(config.theme === 'default'){
				cache.root.append('style').html(defaultStyle);
			}
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
			if(_newData.metadata) {data.metadata = _newData.metadata;}

			function computeExtent(_data, _axis) {
				return d3.extent(d3.merge(_data.map(function(d){ return d.values.map(function(dB){ return dB[_axis]; }); })));
			}

			var extentX = computeExtent(data, 'x');
			var extentY = computeExtent(data, 'y');

			if(cache.isMirror && hasValidDataY2()) {
				var extentY2 = computeExtent(data, 'y2');
				extentY = [Math.min(extentY[0], extentY2[0]), Math.max(extentY[1], extentY2[1])];
			}

			prepareScales(extentX, extentY);
			render();
			return this;
		};

		exports.setConfig = function (_newConfig) {
			firespray.utils.override(_newConfig, config);
			if(_newConfig.container) {init();}
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
							return dB.x.getTime() >= _sliceExtentX[0].getTime() && dB.x.getTime() <= _sliceExtentX[1].getTime();
						});
					return d;
				});
			return dataSlice;
		};

		exports.getDataUnderBrush = function(){
			return exports.getDataSlice(exports.getBrushExtent());
		};

		exports.setZoom = function (_newExtent) {
			prepareScales(_newExtent.map(function (d) { return new Date(d); }));
			render();
			return this;
		};

		exports.setBrushSelection = function (_brushSelectionExtent) {
			if (brush) {
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

		exports.brushIsFarRight = function () {
			if(brush.extent()) {return brush.extent()[1].getTime() === cache.scaleX.domain()[1].getTime();}
		};

		exports.getBrushExtent = function () {
			if(brush.extent()) {return brush.extent();}
		};

		exports.getDataExtent = function () {
			if(cache.extentX && cache.extentX) {
				return {x: cache.extentX, y:cache.extentY};
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
		resolution: 'second',
		stripeWidthInSample: 2,
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
		generateData: function(pointCount, lineCount){
			var currentDate = new Date();
			var pointCount = pointCount || 1000;
			var lineCount = lineCount || 5;
			var colors = d3.scale.category20().range();
			var data = d3.range(lineCount).map(function(d, i){
				return {
					values: d3.range(pointCount).map(function(dB, iB){
						return {
							x: currentDate.getTime() + 1000 * iB,
							y: Math.random()*100,
							y2: Math.random()*100
						};
					}),
					"color": colors[i],
					"name": "line i"
				};
			});
			return data;
		}
	};

	if (typeof define === "function" && define.amd) {define(function() {return firespray;}); }
	else if (typeof module === "object" && module.exports){module.exports = firespray;}
	this.firespray = firespray;
}();
