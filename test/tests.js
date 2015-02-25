var expect = chai.expect;

describe('Firespray', function() {

	var chart, container;
	var minimalConfig = {
		width: 400,
		height: 200,
		theme: 'default',
		geometryType: 'line'
	};
	var minimalData = [
		{
			name: 'Data 1',
			color: 'red',
			values: [
				{x: 1414070920000, y: 1},
				{x: 1414070930000, y: 2}
			]
		}
	];

	function addChart(_config, _data) {
		container = d3.select('#fixture').style({height: '300px'});
		var data = _data || firespray.dataUtils.generateData(10, 2);
		var config = _config || {};
		config.container = container.node();
		chart = firespray.chart()
			.setConfig(config)
			.setData(data);
	}

	function removeChart() {
		container.style({height: null}).html('');
	}

	describe('Chart rendering', function() {

		it('works with minimal requirements', function() {
			var container = document.querySelector('#fixture');

			var chart = firespray.chart()
				.setConfig({container: container})
				.setData(minimalData);

			expect(container.querySelector('.firespray-chart')).to.exist;

			container.innerHTML = "";
		});

		it('sets default values', function() {
			var defaultConfig = firespray.defaultConfig;
			addChart();

			expect(chart.getSvgNode().clientWidth).to.equal(defaultConfig.width);
			expect(chart.getSvgNode().clientHeight).to.equal(defaultConfig.height);

			removeChart();
		});

		it('gets the container', function() {
			addChart();

			expect(chart.getContainer()).to.equal(container.node());

			removeChart();
		});

		it('changes config', function() {
			addChart();

			expect(chart.getSvgNode().clientWidth).to.equal(500);
			chart.setConfig({width: 200}).refresh();
			expect(chart.getSvgNode().clientWidth).to.equal(200);

			removeChart();
		});

		it('re-render on data change', function() {
			addChart(null, minimalData);
			var secondDataset = firespray.utils.cloneJSON(minimalData);
			secondDataset[0].values[0].x = 1414070910000;

			expect(chart.getDataExtent().x[0]).to.equal(1414070920000);
			chart.setData(secondDataset);
			expect(chart.getDataExtent().x[0]).to.equal(1414070910000);

			removeChart();
		});

	});

	describe('Data', function() {

		it('generates some data for testing', function() {
			var dummyData = firespray.dataUtils.generateData({pointCount: 10, lineCount: 2});

			var lineCount = dummyData.length;
			var pointCount = dummyData[0].values.length;
			expect(lineCount).to.equal(2);
			expect(pointCount).to.equal(10);
		});

		it('gets data extent', function() {
			addChart(null, minimalData);

			expect(chart.getDataExtent().x[0]).to.equal(1414070920000);
			expect(chart.getDataExtent().x[1]).to.equal(1414070930000);

			removeChart();
		});

	});

	describe('Events', function() {

		it('binds to mouse move', function(done) {
			addChart(null, minimalData);
			chart.on('chartHover', function(d) {

				var firstLineData = d[0];
				expect(firstLineData.name).to.equal('Data 1');
				expect(d[0].closestValue.x).to.equal(1414070920000);
				expect(d[0].closestValue.y).to.equal(1);

				removeChart();
				done();
			});

			container.select('.interaction .hover-rect').node().dispatchEvent(new MouseEvent('mousemove'));
		});

	});

});