// X axis
///////////////////////////////////////////////////////////
fy.setupAxisX = function( config, cache ) {

	if ( !config.showAxisX ) {
		return cache;
	}

	// X axis
	/////////////////////////////
	var axisXSelection = cache.axesSvg.select( '.axis-x' );
	axisXSelection.attr( {transform: 'translate(' + [0, cache.chartH - 2] + ')'} );
	var axisX = d3.svg.axis().scale( cache.scaleX ).orient( 'bottom' ).tickSize( cache.axisXHeight );

	// labels
	var textH = 12;
	if ( config.showLabelsX ) {
		var format = (config.scaleX === 'linear') ? d3.format( config.tickFormatX ) : d3.time.format( config.tickFormatX );
		axisX.tickFormat( format );

		axisXSelection.call( axisX );
		var textOffset = cache.axisXHeight / 2 + textH / 2;
		axisXSelection.selectAll( 'text' )
			.attr( {transform: function() {
				return 'translate(3, -' + textOffset + ')';
			}} );
		if ( config.showTicksX === false ) {
			axisXSelection.selectAll( 'line' ).remove();
		}
		else {
			axisXSelection.selectAll( 'line' ).attr( {y2: cache.axisXHeight / 3} );
		}

		axisXSelection.select( '.domain' ).style( {display: 'none'} );
	}

	// ticks
	if ( config.showGridX ) {
		var bgXSelection = cache.bgSvg.select( '.axis-x' );
		bgXSelection.attr( {transform: 'translate(' + [0, cache.chartH] + ')'} );
		bgXSelection.call( axisX );
		bgXSelection.selectAll( 'text' ).text( null );
		bgXSelection.selectAll( 'line' ).attr( {y1: 0, y2: -cache.chartH} )
			.classed( 'grid-line x', true );

		bgXSelection.select( '.domain' ).style( {display: 'none'} );
	}

	return cache;
};