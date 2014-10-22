var expect = chai.expect;

describe('Firespray chart rendering', function() {

	var chart, container;
	var minimalConfig = {
		width: 400,
		height: 200,
		theme: 'default',
		geometryType: 'line'
	};

	function addChart(_config){
		container = d3.select('#fixture').style({height: '300px'});
		var data = firespray.utils.generateData(10, 2);
		config = _config || {};
		config.container = container.node();
		chart = firespray()
			.setConfig(config)
			.setData(data);
	}

	function removeChart(){
		container.style({height: null}).html('');
	}

	before(function() {

	});

	after(function() {

	});

	it('should work with minimal requirements', function() {
		addChart();
		expect(container.select('.firespray-chart').node()).to.exist;
		removeChart();
	});

	it('should set default values', function() {
		var defaultConfig = firespray.defaultConfig;

		addChart();
		expect(chart.getSvgNode().clientWidth).to.equal(defaultConfig.width);
		expect(chart.getSvgNode().clientHeight).to.equal(defaultConfig.height);
		removeChart();
	});

});