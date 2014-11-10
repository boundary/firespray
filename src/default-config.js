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
	renderer: 'canvas',
	theme: null // 'default'
};