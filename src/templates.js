// Templates
///////////////////////////////////////////////////////////
firespray.template = '<div>' +
	'<svg xmlns="http://www.w3.org/2000/svg" class="bg">' +
	'<g class="chart-group">' +
	'<g class="background"><rect class="panel-bg" /></g>' +
	'<g class="axis-y axis-y2"></g><g class="axis-y axis-y1"></g><rect class="axis-x-bg" /><g class="axis-x"></g>' +
	'</g>' +
	'</svg>' +
	'<canvas class="geometry"></canvas>' +
	'<svg xmlns="http://www.w3.org/2000/svg" class="geometry-svg"></svg>' +
	'<svg xmlns="http://www.w3.org/2000/svg" class="axes">' +
	'<g class="chart-group">' +
	'<g class="axis-x"></g><rect class="axis-y-bg" /><g class="axis-y axis-y2"></g><g class="axis-y axis-y1"></g>' +
	'</g>' +
	'</svg>' +
	'<svg xmlns="http://www.w3.org/2000/svg" class="interaction">' +
	'<g class="hover-group"><line class="hover-guide-x"/>' +
	'<rect class="hover-rect" width="100%" height="100%" pointer-events="all" fill="none"/></rect>' +
	'</g><g class="brush-group"></g>' +
	'</svg>' +
	'</div>';

firespray.themes = {

	default: '.firespray-chart .axis-x-bg {fill: white; }' +
		'.firespray-chart .axis-y-bg {fill: rgba(220, 220, 220, 0.5);}' +
		'.firespray-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }' +
		'.firespray-chart .stripe { fill: none; }' +
		'.firespray-chart .stripe.even { fill: rgb(250, 250, 250); }' +
		'.firespray-chart .panel-bg { fill: white; }' +
		'.firespray-chart .axis-y line { stroke: #eee; }' +
		'.firespray-chart  text { font-size: 10px; fill: #aaa; }' +
		'.firespray-chart  .hovered-geometry, .hover-guide-x{ stroke: #555; }' +
		'.firespray-chart  .domain{ display: none}',

	dark: '.firespray-chart .axis-x-bg {fill: #222; }' +
		'.firespray-chart .axis-y-bg {fill: rgba(50, 50, 50, 0.5);}' +
		'.firespray-chart .extent {fill: rgba(200, 200, 200, .5); stroke: rgba(255, 255, 255, .5); }' +
		'.firespray-chart .stripe { fill: none; }' +
		'.firespray-chart .stripe.even { fill: #222; }' +
		'.firespray-chart .panel-bg { fill: #111; }' +
		'.firespray-chart .axis-y line { stroke: #111; }' +
		'.firespray-chart  text { font-size: 10px; fill: #aaa; }' +
		'.firespray-chart  .hovered-geometry, .hover-guide-x{ stroke: #555; }' +
		'.firespray-chart  .domain{ display: none}'

};