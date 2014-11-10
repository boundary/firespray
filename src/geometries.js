// Geometry
///////////////////////////////////////////////////////////

firespray.setupGeometries = function(config, cache){

	if(!firespray.convenience.hasValidData(cache)) {return;} //TODO get rid of these checks

	if(config.geometryType === 'line' ||
		config.geometryType === 'stackedLine' ||
		config.geometryType === 'stackedArea') {firespray.setupLineGeometry(config, cache);}
	else if(config.geometryType === 'bar' ||
		config.geometryType === 'percentBar' ||
		config.geometryType === 'stackedBar') {firespray.renderBarGeometry(config, cache);}
};

firespray.setupLineGeometry = function(config, cache){
	firespray._computeGeometryData(config, cache);
	if(config.renderer === 'canvas'){
		firespray._renderLineGeometry(config, cache);
	}
	else if(config.geometryType === 'stackedArea'){
		firespray._renderAreaGeometrySVG(config, cache);
	}
	else {
		firespray._renderLineGeometrySVG(config, cache);
	}
};

firespray._computeGeometryData = function(config, cache){

	if (cache.isMirror) {cache.scaleY.range([cache.chartH / 2, 0]);} // TODO use in common with  setupAxisY
	else {cache.scaleY.range([cache.chartH, 0]);}

	var scaleYCopy = cache.scaleY.copy(); //TODO ?
	if(config.geometryType === 'stackedLine' ||
		config.geometryType === 'stackedArea' ||
		config.geometryType === 'stackedBar'){
		var stackedMaxValues = d3.zip.apply(null, cache.data.map(function(d, i){
				return d.values.map(function(d, i){ return d.y; });
			}))
			.map(function(d, i){ return d3.sum(d); });
		var stackedMaxValueSum = d3.max(stackedMaxValues);
		scaleYCopy.domain([0, stackedMaxValueSum]);
	}

	var i, j, lineData, datum, prevIndexI;

	var prevDatum;
	for (i = 0; i < cache.data.length; i++) {
		lineData = cache.data[i];
		prevDatum = lineData.values[0];
		for (j = 0; j < lineData.values.length; j++) {
			datum = lineData.values[j];
			prevIndexI = Math.max(i-1, 0);
			datum.scaledX = cache.scaleX(datum.x);
			datum.prevScaledX = prevDatum.scaledX;
			datum.stackTopY = (i === 0 || config.geometryType === 'line') ? scaleYCopy.range()[0] : cache.data[prevIndexI].values[j].scaledY;
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

firespray._renderAreaGeometrySVG = function(config, cache){
	// area geometry
	cache.geometrySVG.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});

	var area = d3.svg.area()
		.x(function(d){ return d.scaledX; })
		.y0(function(d){ return d.stackTopY; })
		.y1(function(d){ return d.scaledY; });


	var lines = cache.geometrySVG.selectAll('path.geometry').data(cache.data);
	lines.enter().append('path').classed('geometry');
	lines.attr({
			d: function(d){ return area(d.values); }
		})
		.style({
			stroke: function(d){ return d.color; },
			fill: function(d){ return d.color; }
		});

};

firespray._renderLineGeometrySVG = function(config, cache){

	// line geometry
	cache.geometrySVG.attr({
			width: cache.chartW,
			height: cache.chartH
		})
		.style({
			top: config.margin.top + 'px',
			left: config.margin.left + 'px'
		});

	var line = d3.svg.line()
		.x(function(d){ return d.scaledX; })
		.y(function(d){ return d.scaledY; });

	var lines = cache.geometrySVG.selectAll('path.geometry').data(cache.data);
	lines.enter().append('path').classed('geometry');
	lines.attr({
		d: function(d){ return line(d.values); }
	})
	.style({
		stroke: function(d){ return d.color; },
		fill: 'none'
	});

};

firespray._renderLineGeometry = function(config, cache){

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

	if(config.useProgressiveRendering && typeof renderQueue !== 'undefined'){
		for (i = 0; i < cache.data.length; i++){
			cache.queues.push(renderQueue(renderLineSegment).rate(config.progressiveRenderingRate));
			cache.queues.splice(cache.data.length);
		}
		cache.data.forEach(function(d, i){ cache.queues[i](d.values); });
	}
	else {cache.data.forEach(function(d, i){ d.values.forEach(function(d){ renderLineSegment(d); }); });}
};

firespray.renderBarGeometry = function(config, cache){

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
	var barW = cache.scaleX(cache.data[0].values[1].x);
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
	var stackedValues = d3.zip.apply(null, cache.data.map(function(d, i){
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

	for (i = 0; i < cache.data.length; i++) {
		lineData = cache.data[i];
		for (j = 0; j < lineData.values.length; j++) {
			if(config.geometryType === 'percentBar') {scaleYCopy.domain([0, stackedMaxValues[j]]).range([0, cache.chartH]);}
			datum = lineData.values[j];
			prevIndex = Math.max(j-1, 0);
			datum.scaledX = cache.scaleX(datum.x);
			datum.scaledY = scaleYCopy(datum.y);
			datum.prevTopY = (i === 0 || config.geometryType === 'bar') ? 0 : cache.data[Math.max(i-1, 0)].values[j].topY;
			datum.topY = (datum.prevTopY + datum.scaledY);
			datum.color = lineData.color || 'silver';
			datum.name = lineData.name;
			datum.barW = barW;
		}
	}

	if(config.useProgressiveRendering && typeof renderQueue !== 'undefined'){ //TODO share with renderLineGeometry
		for (i = 0; i < cache.data.length * 2; i++){
			cache.queues.push(renderQueue(renderBar).rate(config.progressiveRenderingRate));
			cache.queues.splice(cache.data.length);
		}
		cache.data.forEach(function(d, i){ cache.queues[i](d.values); });
	}
	else {cache.data.forEach(function(d, i){ d.values.forEach(function(d){ renderBar(d); }); });}
};
