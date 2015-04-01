// Geometry
///////////////////////////////////////////////////////////

fy.setupGeometries = function(config, cache) {

	fy._computeGeometryData(config, cache);

	if (config.geometryType === 'line' ||
		config.geometryType === 'stackedLine' ||
		config.geometryType === 'stackedArea') {
		fy.setupLineGeometry(config, cache);
	}
	else if (config.geometryType === 'bar' ||
		config.geometryType === 'percentBar' ||
		config.geometryType === 'stackedBar') {
		fy.setupBarGeometry(config, cache);
	}

	return cache;

};

fy.setupBarGeometry = function(config, cache) {

	if (config.renderer === 'canvas') {
		fy._renderBarGeometry(config, cache);
	}
	else {
		fy._renderBarGeometrySVG(config, cache);
	}

};

fy.setupLineGeometry = function(config, cache) {

	if (config.renderer === 'canvas') {
		fy._renderLineGeometry(config, cache);
	}
	else if (config.geometryType === 'stackedArea') {
		fy._renderAreaGeometrySVG(config, cache);
	}
	else {
		fy._renderLineGeometrySVG(config, cache);
	}

};

fy._computeGeometryData = function(config, cache) {

	if (cache.isMirror) {
		cache.scaleY.range([cache.chartH / 2, 0]);
	}
	else {
		cache.scaleY.range([cache.chartH, 0]);
	}

	var stackedValues = d3.zip.apply(null, cache.data.map(function(d, i) {
		return d.values.map(function(d, i) {
			return d[cache.biggestY];
		});
	}));
	var stackedMaxValues;

	if (config.geometryType === 'stackedLine' ||
		config.geometryType === 'stackedArea' ||
		config.geometryType === 'stackedBar' ||
		config.geometryType === 'percentBar') {
		stackedMaxValues = stackedValues.map(function(d, i) {
			return d3.sum(d);
		});
	}
	else {
		stackedMaxValues = stackedValues.map(function(d, i) {
			return d3.max(d);
		});
	}

	var stackedMaxValue = d3.max(stackedMaxValues);
	var scaleYCopy = cache.scaleY.copy();

	// bar width
	var barW = cache.scaleX(cache.data[0].values[1].x);
	var barGap = Math.max(barW / 4, 1);
	barW = Math.floor(barW - barGap);
	barW = Math.max(1, barW);

	var i, j, lineData, datum, prevIndexI;

	var prevDatum;
	for (i = 0; i < cache.data.length; i++) {
		lineData = cache.data[i];
		prevDatum = lineData.values[0];
		for (j = 0; j < lineData.values.length; j++) {
			if (config.geometryType === 'percentBar') {
				scaleYCopy.domain([0, stackedMaxValues[j]]);
			}
			datum = lineData.values[j];
			prevIndexI = Math.max(i - 1, 0);
			datum.scaledX = cache.scaleX(datum.x);
			datum.prevScaledX = prevDatum.scaledX;
			datum.stackTopY = (i === 0 || config.geometryType === 'line' || config.geometryType === 'bar') ? scaleYCopy.range()[0] : cache.data[prevIndexI].values[j].scaledY;
			datum.scaledY = datum.stackTopY + scaleYCopy(datum.y) - scaleYCopy.range()[0];
			datum.prevStackTopY = prevDatum.stackTopY;
			datum.prevScaledY = prevDatum.scaledY;
			datum.color = lineData.color || 'silver';
			datum.name = lineData.name;
			datum.barW = barW;
			prevDatum = {scaledX: datum.scaledX, scaledY: datum.scaledY, stackTopY: datum.stackTopY};
		}
	}

	if (cache.isMirror) {
		scaleYCopy.range([cache.chartH, cache.chartH / 2]);
		for (i = 0; i < cache.data.length; i++) {
			lineData = cache.data[i];
			prevDatum = lineData.values[0];
			for (j = 0; j < lineData.values.length; j++) {
				datum = lineData.values[j];
				datum.scaledY2 = cache.chartH + cache.chartH / 2 - scaleYCopy(datum.y2);
				datum.prevScaledY2 = prevDatum.scaledY2;
				prevDatum = datum;
			}
		}
	}

};

fy._renderAreaGeometrySVG = function(config, cache) {

	// area geometry SVG
	cache.geometrySVG
		.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});

	var area = d3.svg.area()
		.x(function(d) {
			return d.scaledX;
		})
		.y0(function(d) {
			return d.stackTopY;
		})
		.y1(function(d) {
			return d.scaledY;
		});

	var lines = cache.geometrySVG.selectAll('path.geometry').data(cache.data);
	lines.enter().append('path').classed('geometry', true);
	lines
		.attr({
			d: function(d) {
				return area(d.values);
			}
		})
		.style({
			stroke: function(d) {
				return d.color;
			},
			fill: function(d) {
				return d.color;
			}
		});

};

fy._renderLineGeometrySVG = function(config, cache) {

	// line geometry SVG
	cache.geometrySVG
		.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});

	var line = d3.svg.line()
		.x(function(d) {
			return d.scaledX;
		})
		.y(function(d) {
			return d.scaledY;
		});

	var lines = cache.geometrySVG.selectAll('path.geometry').data(cache.data);
	lines.enter().append('path').classed('geometry', true);
	lines
		.attr({
			d: function(d) {
				return line(d.values);
			}
		})
		.style({
			stroke: function(d) {
				return d.color;
			},
			fill: 'none'
		});

};

fy._renderLineGeometry = function(config, cache) {

	// line geometry canvas
	cache.geometryCanvas
		.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});
	var ctx = cache.geometryCanvas.node().getContext('2d');

	function renderLineSegment(datum) {
		ctx.strokeStyle = datum.color;
		ctx.fillStyle = datum.color;
		ctx.beginPath();
		ctx.moveTo(datum.prevScaledX, datum.prevScaledY);
		ctx.lineTo(datum.scaledX, datum.scaledY);

		if (config.geometryType === 'stackedArea') {
			ctx.lineTo(datum.scaledX, datum.stackTopY);
			ctx.lineTo(datum.prevScaledX, datum.prevStackTopY);
			ctx.lineTo(datum.prevScaledX, datum.prevScaledY);
		}

		if (cache.isMirror) {
			ctx.moveTo(datum.prevScaledX, datum.prevScaledY2);
			ctx.lineTo(datum.scaledX, datum.scaledY2);
		}
		ctx.fill();
		ctx.stroke();
	}

	if (config.useProgressiveRendering && typeof renderQueue !== 'undefined') {
		for (i = 0; i < cache.data.length; i++) {
			cache.queues.push(renderQueue(renderLineSegment).rate(config.progressiveRenderingRate));
			cache.queues.splice(cache.data.length);
		}
		cache.data.forEach(function(d, i) {
			cache.queues[i](d.values);
		});
	}
	else {
		cache.data.forEach(function(d, i) {
			d.values.forEach(function(d) {
				renderLineSegment(d);
			});
		});
	}

};

fy._renderBarGeometrySVG = function(config, cache) {

	// bar geometry SVG
	cache.geometrySVG
		.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});

	var barGroup = cache.geometrySVG.selectAll('g.geometry-group').data(cache.data);
	barGroup.enter().append('g').classed('geometry-group', true);
	barGroup.exit().remove();

	var bars = barGroup.selectAll('rect.geometry').data(function(d) {
		return d.values;
	});
	bars.enter().append('rect').classed('geometry', true);
	bars
		.attr({
			x: function(d) {
				return d.scaledX - d.barW / 2;
			},
			y: function(d) {
				return d.scaledY;
			},
			width: function(d) {
				return d.barW;
			},
			height: function(d) {
				return d.stackTopY - d.scaledY;
			}
		})
		.style({
			stroke: function(d) {
				return d.color;
			},
			fill: function(d) {
				return d.color;
			}
		});

};

fy._renderBarGeometry = function(config, cache) {

	// bar geometry canvas
	cache.geometryCanvas
		.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});
	var ctx = cache.geometryCanvas.node().getContext('2d');
	ctx.globalCompositeOperation = "source-over";

	// hover
	function renderBar(datum) {
		ctx.strokeStyle = datum.color;
		ctx.lineWidth = datum.barW;
		ctx.beginPath();
		ctx.moveTo(Math.floor(datum.scaledX), Math.floor(datum.scaledY));
		ctx.lineTo(Math.floor(datum.scaledX), Math.floor(datum.stackTopY));
		ctx.stroke();
	}

	if (config.useProgressiveRendering && typeof renderQueue !== 'undefined') { //TODO share with renderLineGeometry
		for (i = 0; i < cache.data.length * 2; i++) {
			cache.queues.push(renderQueue(renderBar).rate(config.progressiveRenderingRate));
			cache.queues.splice(cache.data.length);
		}
		cache.data.forEach(function(d, i) {
			cache.queues[i](d.values);
		});
	}
	else {
		cache.data.forEach(function(d, i) {
			d.values.forEach(function(d) {
				renderBar(d);
			});
		});
	}

};
