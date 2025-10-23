const directives = {
	/**
	 * Set the number of columns in the output.
	 */
	columns: {
		params: "[number]",
		short: "Set the number of columns shown the output",
		long: "Can be omitted entirely and all the columns defined in the recipe will be shown.",
		func: ( tokens, config ) => {
			let cols = parseInt(tokens[1])
			if ( isNaN( cols ) ) {
				config.errors.push( 'Columns requires a number')
			} else {
				config.columns.count = cols
				config.columns.stated = true
			}
		}
	},

	/**
	 * Set the number of rows in the output.
	 */
	rows: {
		params: "[number] (empty [number])",
		short: "Set the desired number of rows in the output",
		long: "Can be omitted and the default value of 10 will be used instead. The 'empty' keyword must be followed by a number representing the percentage of empty lines (lines where all the cells are empty) in the output.",		
		func: ( tokens, config ) => {		
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
		}
	},

	/**
	 * Configure the header: forced off, numbered, lettered, forced on
	 */
	header: {
		params: "(on|off) (numbers|letters)",
		short: "Set the header row behaviour",
		long: "Header texts can be defined on individual columns. Any column defining a header turns the header row on for all columns. 'letters' and 'numbers' control the appearance of headers for columns that do not define a header string: 'Column 1' or 'Column A' etc. 'off' will cause the header row to not be shown.",
		func: ( tokens, config ) => {		
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
		}
	},

	/**
	 * Sets a seed for random{} to use. This works best when it's the first line of a
	 * recipe since some funcs and directives will call random during their set up.
	 */
	seed: {
		params: '[number]',
		short: 'Set the seed for the random number generator',
		long: "Setting a seed will 'fix' the output such that it's the same every time. When omitted, a seed based on the clock time at execution is used.",
		func: ( tokens, config ) => {
			let val = parseInt(tokens[1])
			if ( isNaN( val ) ) {
				config.errors.push( 'Seed requires a number')
			} else {
				random.SEED = val
			}
		}
	},

	/**
	 * Sets a separator to replace the default of ,
	 */
	separator: {
		params: "[string]",
		short: "Set the character used to separate values",
		long: "Change the separator character from , to something else. Only one of , . ; : / and | are supported.",
		func: ( tokens, config ) => {
			if ( tokens[1] && tokens[1].length > 0 ) {
				const supported = ',.;:/|'
				if ( supported.indexOf( tokens[1][0] ) !== -1 ) {
					config.separator = tokens[1][0]
					return
				}
			}
			config.errors.push( 'Separator must be one of: , . ; : / |')
		}
	}
};

