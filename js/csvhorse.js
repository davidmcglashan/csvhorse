const csvhorse = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v2.0.0-latest",

	/**
	 * Run CSV Horse. This is done in two stages ...
	 *  1. read the recipe. 
	 *  2. produce the output
	 */
	run: () => {
		// Tidy up the UI.
		csvhorse.clearLog()
		
		recipe.read()
		csvhorse.produceOutput()
	},
	
	/**
	 * Produce the CSV output by executing the recipe and write it to the UI.
	 */
	produceOutput: () => {
		const config = recipe.config

		// csvModel is a table model for the CSV. 
		let csvModel = {
			rows: [],
			header: [],
			headerFormat: 'on'
		}
		for ( let r=0; r<config.rows; r+=1 ) {
			csvModel.rows[r] = {
				columns: [],
				isEmpty: random.get( 0, 100 ) < config.rowsEmptyPercentage
			}
		}

		// The number of columns shown is the number of models received ...
		let numberOfCols = config.columns.length
		for ( let c=0; c<numberOfCols; c+=1 ) {
			let columnModel = config.columns[c]

			// Does the columnModel contain any header information?
			if ( columnModel.header ) {
				csvModel.header[c] = columnModel.header
			}

			// Now use it to generate content for each row!
			for ( let r=0; r<config.rows; r+=1 ) {
				let column = {}
				csvModel.rows[r].columns[c] = column

				// Start with an empty string we'll concatenate to.
				column.content = ''
				column.isAlwaysShown = columnModel.isAlwaysShown

				// If the columnModel has an emptyPercentage we can sometimes skip doing any string work.
				if ( columnModel.emptyPercentage ) {
					if ( random.get( 0, 100 ) < columnModel.emptyPercentage ) {
						continue
					}
				}

				// Otherwise cell content is achieved by evaluating and concatenating tokens
				// into the column cell's content.
				for ( let token of columnModel.tokens ) {
					// If the token is a string we can simply concat
					if ( typeof token === 'string' ) {
						column.content += token
					} else {
						// Patterns can simply be written
						if ( token.pattern ) {							
							column.content += patterns.getStringFromPattern( variables.get( token.pattern ) )
						} 
						
						// Functions require some execution
						else if ( token.function ) {
							column.content += funcs[token.function].func( token )
						}
					}
				}
			}
		}

		// Now turn the table model into a CSV string
		let str = ''

		// Show the header if the various configurations specifies one ...
		//  1. if the csvModel asks for one and the config doesn't disallow it
		//  2. the config explicitly allows it
		if ( csvModel.headerFormat ) {
			for ( let c=0; c<numberOfCols; c+=1 ) {
				let columnModel = config.columns[c]
				if ( columnModel.hidden ) {
					continue
				}

				if ( c > 0 ) {
					str += config.separator
				}

				switch ( config.headerFormat ) {
					case 'on':
						str += csvhorse.makeSafe( csvModel.header[c], csvModel.header[c] )
						break
					case 'letters':
						str += csvhorse.makeSafe( 'Column '+(String.fromCharCode(c+65)), config )
						break
					case 'numbers':
						str += csvhorse.makeSafe( 'Column '+(c+1), config )
						break
				}
			}
			str += '\n'
		}

		// Now the table body
		for ( let r=0; r<csvModel.rows.length; r+=1 ) {
			let row = csvModel.rows[r]

			for ( let c=0; c<row.columns.length; c+=1 ) {
				let columnModel = config.columns[c]
				if ( columnModel.hidden ) {
					continue
				}
				let column = row.columns[c]

				if ( c > 0 ) {
					str += config.separator
				}

				// Non-empty rows don't leave empty cells (unless their content is empty)
				if ( !row.isEmpty || column.isAlwaysShown ) {
					str += csvhorse.makeSafe( column.content.trim(), config )
				}
			}
			if ( numberOfCols > 0 ) {
				str += '\n'
			}
		}

		// Finished looping. Better print the results ...
		let textarea = document.getElementById('out')
		textarea.value = str

		for ( let error in config.errors ) {
			csvhorse.addToLog( config.errors[error] )
		}
	},

	/**
	 * Make a string 'safe' for use in a CSV file.
	 * If the separator is detected then the string is encased in quotes. If quotes were present then they become double-quotes.
	 */
	makeSafe: ( str, config ) => {
		if ( str.indexOf( config.separator ) !== -1 ) {
			return '"' + str.replaceAll( '"', '""' ) + '"'
		}
		return str
	},

	/**
	 * Clear the log down, usually in readiness for a new recipe execution!
	 */
	clearLog: () => {
		let log = document.getElementById( 'log' )
		log.innerHTML = ''
	},

	/**
	 * Writes a new message to the error log
	 */
	addToLog: ( msg, cmd ) => {
		// If a command was included, safely format and add it to the message
		if ( cmd ) {
			msg = '<strong>' + cmd.replaceAll( '<','&lt;' ) + '</strong> &mdash; ' + msg
		}

		// Build the error UI
		let entry = document.createElement( 'li' )
		entry.innerHTML = msg
		let log = document.getElementById( 'log' )
		log.appendChild( entry )
	}
}