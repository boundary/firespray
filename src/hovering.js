// Hovering
///////////////////////////////////////////////////////////
firespray.setupHovering = function(config, cache) {

	if(config.useBrush) {return cache;}
	var that = this;

	cache.interactionSvg.select('.hover-rect')
		.on('mousemove', function () {
			if(!firespray.convenience.hasValidData(cache)) {return;}
			var mouseX = d3.mouse(cache.geometryCanvas.node())[0];
			var closestPointsScaledX = firespray._hovering.injectClosestPointsFromX(mouseX, config, cache);
			cache.interactionSvg.select('.hover-group').style({visibility: 'visible'});
			if (typeof closestPointsScaledX !== 'undefined') {
				firespray._hovering.displayHoveredGeometry(config, cache);
				cache.dispatch.chartHover.call(that, cache.data);
				firespray._hovering.displayVerticalGuide(closestPointsScaledX, config, cache);
			}
			else {
				firespray._hovering.hideHoveredGeometry(config, cache);
				firespray._hovering.displayVerticalGuide(mouseX, config, cache);
			}
		})
		.on('mouseenter', function(){ cache.dispatch.chartEnter.call(that); })
		.on('mouseout', function () {
			var svg = cache.interactionSvg.node();
			var target = d3.event.relatedTarget;
			if((svg.contains && !svg.contains(target)) ||
				(svg.compareDocumentPosition && !svg.compareDocumentPosition(target))) {
				cache.interactionSvg.select('.hover-group').style({visibility: 'hidden'});
				cache.dispatch.chartOut.call(that);
			}
		})
		.select('.hover-group');

	return cache;
};

firespray._hovering = {

	injectClosestPointsFromX: function(fromPointX, config, cache) {
		var found = false, closestIndex, closestScaledX;
		cache.data.forEach(function (d) {
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
	},

	displayHoveredGeometry: function(config, cache){
		if(config.geometryType === 'bar' ||
			config.geometryType === 'percentBar' ||
			config.geometryType === 'stackedBar') {firespray._hovering.displayHoveredRects(config, cache);}
		else {firespray._hovering.displayHoveredDots(config, cache);}
	},

	displayHoveredDots: function(config, cache) {

		var hoverData = cache.data.map(function(d){ return d.closestValue; });
		if (cache.isMirror) {
			var hoverData2 = cache.data.map(function(d){
				return d.closestValue;
			});
			hoverData = hoverData.concat(hoverData2);
		}

		var hoveredDotsSelection = cache.interactionSvg.select('.hover-group').selectAll('circle.hovered-geometry')
			.data(hoverData);
		hoveredDotsSelection.enter().append('circle').attr({'class': 'hovered-geometry'})
			.on('mousemove', function(d, i){
				// format output data
				var isFromMirror = (cache.isMirror && i >= cache.data.length);
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
				cache.dispatch.geometryHover.call(this, e, d);
			})
			.on('mouseout', function(){ cache.dispatch.geometryOut.call(this); })
			.on('click', function(){ cache.dispatch.geometryClick.call(this); });
		hoveredDotsSelection
			.filter(function(d, i){ return typeof d !== 'undefined' && !isNaN(d.y); })
			.style({
				fill: function (d) { return d.color || 'silver'; }
			})
			.attr({
				r: config.dotSize,
				cx: function (d) { return d.scaledX; },
				cy: function (d, i) {
					var scaledY = (cache.isMirror && i >= cache.data.length && d.scaledY2) ? d.scaledY2 : d.scaledY;
					return scaledY;
				}
			});
		hoveredDotsSelection.exit().remove();
		return this;
	},

	displayHoveredRects: function(config, cache) {

		var hoverData = cache.data.map(function(d){ return d.closestValue; });
		if (cache.isMirror) {
			var hoverData2 = cache.data.map(function(d){
				return d.closestValue;
			});
			hoverData = hoverData.concat(hoverData2);
		}

		var hoveredDotsSelection = cache.interactionSvg.select('.hover-group').selectAll('rect.hovered-geometry')
			.data(hoverData);
		hoveredDotsSelection.enter().append('rect').attr({'class': 'hovered-geometry'})
			.on('mousemove', function(d, i){
				// format output data
				var isFromMirror = (cache.isMirror && i >= cache.data.length);
//				var scaledY = isFromMirror ?  d.scaledY2 :  d.scaledY;
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
				cache.dispatch.geometryHover.call(this, e, d);
			})
			.on('mouseout', function(){ cache.dispatch.geometryOut.call(this); })
			.on('click', function(){ cache.dispatch.geometryClick.call(this); });
		hoveredDotsSelection
			.filter(function(d, i){ return typeof d !== 'undefined' && !isNaN(d.y); })
			.style({
				fill: function (d) { return d.color || 'silver'; }
			})
			.attr({
				x: function(d){ return d.scaledX - d.barW / 2; },
				y: function(d){ return d.scaledY; },
				width: function(d){ return d.barW; },
				height: function(d){ return d.stackTopY - d.scaledY; }
			});
		hoveredDotsSelection.exit().remove();
		return this;
	},

	hideHoveredGeometry: function(config, cache) {
		cache.interactionSvg.select('.hover-group').selectAll('circle.hovered-geometry').remove();
	},

	displayVerticalGuide: function(mouseX, config, cache) {
		cache.interactionSvg.select('line.hover-guide-x')
			.attr({x1: mouseX, x2: mouseX, y1: 0, y2: cache.chartH})
			.style({'pointer-events': 'none'});
		return this;
	}
};