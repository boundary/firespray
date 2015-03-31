// Static default config
///////////////////////////////////////////////////////////
fy.defaultConfig = {
	scaleX: 'time', // linear, time
	width: 500,
	height: 300,
	margin: {top: 20, right: 20, bottom: 20, left: 20},
	container: null,
	showTicksX: false,
	showGridX: false,
	showTicksY: true,
	useBrush: false,
	suggestedXTicks: 10,
	suggestedYTicks: null,
	tickFormatX: '%H:%M:%S', //linear: ',.4s', time: '%H:%M:%S'
	axisXHeight: 20,
	axisYWidth: 0,
	isMirror: null,
	dotSize: 4,
	suffix: '',
	stripeWidthInSample: 1,
	tickFormatY: null,
	labelYOffset: 0,
	axisYBgH: null,
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