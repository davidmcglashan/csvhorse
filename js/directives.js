const directives = {
	/**
	 * Set the number of columns in the output.
	 */
	columns: ( tokens, config ) => {
		let cols = parseInt(tokens[1])
		if ( isNaN( cols ) ) {
			config.errors.push( 'Columns requires a number')
		} else {
			config.columns.count = cols
			config.columns.stated = true
		}
	},

	/**
	 * Set the number of rows in the output.
	 */
	rows: ( tokens, config ) => {		
		// The number of rows is always token 1
		let rows = parseInt( tokens[1] )
		if ( isNaN( rows ) ) {
			config.errors.push( 'Rows requires a number')
		} else {
			config.rows = rows
		}

		// There can be an empty directive at 2 & 3
		if ( tokens.length > 3 && tokens[2] === 'empty' ) {
			let emptyPercentage = parseInt( tokens[3] )
			if ( isNaN( emptyPercentage ) ) {
				config.errors.push( 'Rows/empty requires a number')
			} else {
				config.rowsEmptyPercentage = emptyPercentage
			}
		}
	},

	/**
	 * Configure the header: forced off, numbered, lettered, forced on
	 */
	header: ( tokens, config ) => {		
		for ( let token of tokens ) {
			if ( token === 'off' ) {
				config.showHeader = 'off'
			} else if ( token === 'on' ) {
				config.showHeader = 'on'
			} else if ( token === 'numbers' ) {
				config.headerFormat = 'numbers'
			} else if ( token === 'letters' ) {
				config.headerFormat = 'letters'
			}
		}
	},

	/**
	 * Sets a seed for random{} to use. This works best when it's the first line of a
	 * recipe since some funcs and directives will call random during their set up.
	 */
	seed: ( tokens, config ) => {
		let val = parseInt(tokens[1])
		if ( isNaN( val ) ) {
			config.errors.push( 'Seed requires a number')
		} else {
			random.SEED = val
		}

	}
};

