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
				{x: 'Thu Oct 23 2014 09:28:40 GMT-0400 (EDT)', y: 1},
				{x: 'Thu Oct 23 2014 09:28:50 GMT-0400 (EDT)', y: 2}
			]
		}
	];

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

	describe('Chart rendering', function() {

		it('works with minimal requirements', function() {
			var container = document.querySelector('#fixture');
			var chart = firespray()
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
			secondDataset[0].values[0].x = 'Thu Oct 23 2014 09:28:30 GMT-0400 (EDT)';

			expect(chart.getDataExtent().x[0].getTime()).to.equal(new Date('Thu Oct 23 2014 09:28:40 GMT-0400 (EDT)').getTime());
			chart.setData(secondDataset);
			expect(chart.getDataExtent().x[0].getTime()).to.equal(new Date('Thu Oct 23 2014 09:28:30 GMT-0400 (EDT)').getTime());

			removeChart();
		});

	});

	describe('Data', function() {

		it('generates some data for testing', function() {
			var dummyData = firespray.utils.generateData(10, 2);

			var lineCount = dummyData.length;
			var pointCount = dummyData[0].values.length;
			expect(lineCount).to.equal(2);
			expect(pointCount).to.equal(10);
		});

		it('gets data extent', function() {
			addChart(null, minimalData);

			expect(chart.getDataExtent().x[0].getTime()).to.equal(new Date('Thu Oct 23 2014 09:28:40 GMT-0400 (EDT)').getTime());
			expect(chart.getDataExtent().x[1].getTime()).to.equal(new Date('Thu Oct 23 2014 09:28:50 GMT-0400 (EDT)').getTime());

			removeChart();
		});

	});

	describe('Events', function() {

		it('binds to mouse move', function(done) {
			addChart(null, minimalData);
			chart.on('chartHover', function(d){

				var firstLineData = d[0];
				expect(firstLineData.name).to.equal('Data 1');
				expect(d[0].closestValue.x.getTime()).to.equal(new Date('Thu Oct 23 2014 09:28:40 GMT-0400 (EDT)').getTime());
				expect(d[0].closestValue.y).to.equal(1);
				expect(this).to.equal(chart);

				removeChart();
				done();
			});

			container.select('.interaction .hover-rect').node().dispatchEvent(new MouseEvent('mousemove'));
		});

	});

});