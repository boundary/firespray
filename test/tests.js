var expect = chai.expect;

describe('Firespray chart rendering', function() {

	var chart, container;
	var minimalConfig = {
		width: 400,
		height: 200,
		theme: 'default',
		geometryType: 'line'
	};

	function addChart(_config, _data){
		container = d3.select('#fixture').style({height: '300px'});
		var data = _data || firespray.utils.generateData(10, 2);
		var config = _config || {};
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
		var container = document.querySelector('#fixture');
		var data = [
			{
				name: 'Data 1',
				color: 'red',
				values: [
					{x: 'Wed Oct 18 2014 10:41:05 GMT-0400 (EDT)', y: 1},
					{x: 'Wed Oct 18 2014 10:41:06 GMT-0400 (EDT)', y: 2}
				]
			}
		];
		var chart = firespray()
			.setConfig({container: container})
			.setData(data);

		expect(container.querySelector('.firespray-chart')).to.exist;

		container.innerHTML = "";
	});

	it.skip('should set default values', function() {
		var defaultConfig = firespray.defaultConfig;

		addChart();
		expect(chart.getSvgNode().clientWidth).to.equal(defaultConfig.width);
		expect(chart.getSvgNode().clientHeight).to.equal(defaultConfig.height);
		removeChart();
	});

});