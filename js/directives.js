const directives = {
	/**
	 * Set the number of rows in the output.
	 */
	rows: {
		params: "[number] (empty [number])",
		short: "Set the desired number of rows in the output",
		long: "Can be omitted and the default value of 10 will be used instead. The 'empty' keyword must be followed by a number representing the percentage of empty lines (lines where all the cells are empty) in the output.",		
		func: ( tokens ) => {		
			// The number of rows is always token 1
			let rows = parseInt( tokens[1] )
			if ( isNaN( rows ) ) {
				recipe.config.errors.push( 'Rows requires a number')
			} else {
				recipe.config.rows = rows
			}
			
			// There can be an empty directive at 2 & 3
			if ( tokens.length > 3 && tokens[2] === 'empty' ) {
				let emptyPercentage = parseInt( tokens[3] )
				if ( isNaN( emptyPercentage ) ) {
					recipe.config.errors.push( 'Rows/empty requires a number')
				} else {
					recipe.config.rowsEmptyPercentage = emptyPercentage
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
		func: ( tokens ) => {		
			for ( let token of tokens ) {
				if ( token === 'off' ) {
					recipe.config.showHeader = 'off'
				} else if ( token === 'on' ) {
					recipe.config.showHeader = 'on'
				} else if ( token === 'numbers' ) {
					recipe.config.headerFormat = 'numbers'
				} else if ( token === 'letters' ) {
					recipe.config.headerFormat = 'letters'
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
		func: ( tokens ) => {
			let val = parseInt(tokens[1])
			if ( isNaN( val ) ) {
				recipe.config.errors.push( 'Seed requires a number')
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
		func: ( tokens ) => {
			if ( tokens[1] && tokens[1].length > 0 ) {
				const supported = ',.;:/|'
				if ( supported.indexOf( tokens[1][0] ) !== -1 ) {
					recipe.config.separator = tokens[1][0]
					return
				}
			}
			recipe.config.errors.push( 'Separator must be one of: , . ; : / |')
		}
	},

	addFromLine: ( line ) => {	
		let tokens = line.split( ' ' )
		let directive = directives[tokens[0]]
		if ( directive ) {
			directive.func( tokens )
		}
	}
};

