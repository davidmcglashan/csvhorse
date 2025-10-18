const recipe = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v0.2.4",

	/*
	* Executes the currently entered recipe.
	*/
	execute: () => {	
		// Tidy up the UI.
		recipe.clearLog()
		
		// Get the variables and the default configuration ...
		recipe.parseVariables()
		let config = {
			rows: 10,
			columns: {
				stated: false,
				count: 5,
				defns: []
			},
			separator: ',',
			errors: []
		}
		let error = null

		// Get the recipe text, split by newlines so we can parse each one in turn. 
		let recipeLines = document.getElementById('rec').value.split('\n')
		
		for ( let line of recipeLines ) {
			// Ignore comments and blank lines
			if ( line.length === 0 || line.startsWith('//') ) {
				continue
			}

			// If the line is a directive then let it update the config.
			let tokens = line.split( ' ' )
			let directive = directives[tokens[0]]
			if ( directive ) {
				directive( tokens, config )
				continue
			}

			// Treat this line as a column definition.
			config.columns.defns.push(line)
		}

		// Model is a table model for the CSV. We build this before we show it onscreen.
		let model = {}
		model.rows = []
		model.header = []

		for ( let r=0; r<config.rows; r+=1 ) {
			let row = {}
			model.rows[r] = row
			row.columns = []

			// If the row is empty we can sometimes skip doing any string work.
			row.isEmpty = config.rowsEmptyPercentage && random.get( 0, 100 ) < config.rowsEmptyPercentage
		}

		// The number of columns shown is the number of definitions received ...
		let numberOfCols = config.columns.defns.length
		
		// ... unless the number of columns was stated in the input.
		if ( config.columns.stated ) {
			numberOfCols = config.columns.count
		}

		// At this point we have the number of rows and columns, and all the definitions
		// so we can start generating content into the model.
		for ( let c=0; c<numberOfCols; c+=1 ) {
			let defn = config.columns.defns[c]

			// Process the definition to get an array of tokens.
			let spec = recipe.getSpecification( defn )

			// Did the spec contain any header information?
			if ( spec.header ) {
				model.header[c] = spec.header
				model.showHeader = true
			}

			// Now use it to generate content for each row!
			for ( let r=0; r<config.rows; r+=1 ) {
				let column = {}
				model.rows[r].columns[c] = column

				// Start with an empty string we'll concatenate to.
				column.content = ''
				column.isAlwaysShown = spec.isAlwaysShown

				// If the spec has an emptyPercentage we can sometimes skip doing any string work.
				if ( spec.emptyPercentage ) {
					if ( random.get( 0, 100 ) < spec.emptyPercentage ) {
						continue
					}
				}

				// Otherwise cell content is achieved by evaluating and concatenating tokens
				// into the column cell's content.
				for ( let token of spec.tokens ) {
					// If the token is a string we can simply concat
					if ( typeof token === 'string' ) {
						column.content += token
					} else {
						// Patterns can simply be written
						if ( token.pattern ) {							
							column.content += recipe.getStringFromPattern( recipe.variables[token.pattern] )
						} 
						
						// Functions require some execution
						else if ( token.function ) {
							column.content += funcs[token.function]( token )
						}
					}
				}
			}
		}

		// Now turn the CSV model into a CSV string
		let str = ''

		// Show the header if the various configurations specifies one ...
		//  1. if the model asks for one and the config doesn't disallow it
		//  2. the config explicitly allows it
		if ( 
			(model.showHeader && !config.showHeader)
			|| (config.showHeader === 'on')
		) {
			for ( let c=0; c<numberOfCols; c+=1 ) {
				if ( c > 0 ) {
					str += config.separator
				}

				if ( model.header[c] ) {
					str += recipe.makeSafe( model.header[c], config )
				} else {
					if ( config.headerFormat === 'letters' ) {
						str += recipe.makeSafe( 'Column '+(String.fromCharCode(c+65)), config )
					} else {
						str += recipe.makeSafe( 'Column '+(c+1), config )
					}
				}
			}
			str += '\n'
		}

		// Now the table body
		for ( let r=0; r<model.rows.length; r+=1 ) {
			let row = model.rows[r]

			for ( let c=0; c<row.columns.length; c+=1 ) {
				let column = row.columns[c]

				if ( c > 0 ) {
					str += config.separator
				}

				// Non-empty rows don't leave empty cells (unless their content is empty)
				if ( !row.isEmpty || column.isAlwaysShown ) {
					str += recipe.makeSafe( column.content.trim(), config )
				}
			}
			str += '\n'
		}

		// Finished looping. Better print the results ...
		let textarea = document.getElementById('out')
		textarea.value = str

		for ( let error in config.errors ) {
			recipe.addToLog( config.errors[error] )
		}

		if ( error ) { throw error }
	},

	/**
	 * Turns a string definition into a specification which in turn will help generate the
	 * content of the CSV. Tokens are either strings or objects which contain state that can
	 * be evaluated into strings.
	 */
	getSpecification: ( defn ) => {
		// A null definition results in a single empty string in the CSV.
		if ( !defn || defn.length === 0 ) {
			return {tokens:['']}
		}

		// Definitions can come in two halves separated by a | e.g. "template|config"
		let arr = defn.split('|')
		let template = arr[0]
		let spec = {}
		spec.tokens = []

		// Replace any known variables in the template.
		for ( let key in recipe.variables ) {
			template = template.replaceAll( '$'+key, recipe.variables[key] )
		}

		// Search for patterns in the template.
		let i = 0
		searchLoop: while ( i < template.length ) {
			// A % char means a pattern might follow ...
			if ( template[i] === '%' ) {
				for ( let key in recipe.variables ) {
					let index = template.indexOf( '%'+key )
					// Does it match any of the variables?
					if ( index === i ) {
						// Tokenise the search string and the %pattern 
						spec.tokens.push( template.substr(0,index) )
						spec.tokens.push( { pattern:key } )
						
						// Chop the tokenised bits from the template and resume the search
						template = template.substring( index+key.length+1 )
						i = 0
						continue searchLoop
					}
				}
			}

			// An @ means a function call might follow ...
			if ( template[i] === '@' ) {
				for ( let key in funcs ) {
					let index = template.indexOf( '@'+key+'(' )
					// Does it match any of the functions, including the ) at the end?
					if ( index === i ) {
						let end = template.indexOf( ')', index )
						if ( end !== -1 ) {
							// Tokenise the search string.
							spec.tokens.push( template.substr(0,index) )

							let vars = template.substring( index+key.length+2,end)
							spec.tokens.push( { 
								function: key,
								vars: vars
							} )
							
							// Chop the tokenised bits from the template and resume the search
							template = template.substring( end+1 )
							i = 0
							continue searchLoop
						}
					}
				}				
			}
			i += 1
		}
		// Include everything that's left in the template (could be everything!)
		spec.tokens.push( template )

		// Configs are easy to configure
		if ( arr.length === 2 ) {
			recipe.processConfig( arr[1], spec )
		}

		return spec
	},

	/**
	 * Parses the config part of a defn string and configures the column spec to act accordingly.
	 */
	processConfig: ( config, spec ) => {
		// Configs are space-separated directives we parse one-by-one
		let tokens = config.split(' ')
		let header = false

		// Is there an empty keyword?
		for ( let t=0; t<tokens.length; t+=1 ) {
			// Empty states a %age that the column can be empty for.
			if ( !header && tokens[t] === 'empty' && !spec.isAlwaysShown ) {
				let pctage = parseInt(tokens[t+1])
				spec.emptyPercentage = pctage
				continue
			}

			// Always overrides any empty row directive to make the column always show.
			else if ( !header && tokens[t] === 'always' ) {
				spec.isAlwaysShown = true
				spec.emptyPercentage = 0
				continue
			}

			// Column headers begin and end with a "
			else if ( tokens[t].startsWith( '"' ) ) {
				header = !header
			} 
			if ( header ) {
				if ( !spec.header ) {
					spec.header = ''
				}
				spec.header += ' ' + tokens[t]
			}
			if ( header && tokens[t].endsWith( '"' ) ) {
				header = false
			}
		}

		if ( spec.header ) {
			spec.header = spec.header.replaceAll( '"', '' ).trim()
		}
	},

	/**
	 * Parse the variables from the textarea, returing a dictionary of variable vrs value
	 */
	parseVariables: () => {
		let dict = {}

		// Take the contents of the variables text area. If there's an equals we can use it.
		let lines = document.getElementById( 'vars' ).value.split( '\n' )
		for ( line of lines ) {
			if ( line.length > 0 && line.indexOf( '=' ) > 0 ) {
				let bits = line.split(/=(.*)/)
				dict[bits[0].trim()] = bits[1].trim()
			}
		}

		recipe.variables = dict
	},

	/**
	 * Turns the passed-in pattern into a string following the stringhorse rules.
	 */
	getStringFromPattern: ( pattern ) => {
		let str = ''
		let on = false;

		for ( let i=0; i < pattern.length; i++ ) {
			let chr = pattern[i]
			
			// 'on' is when we are converting chr into something else.
			if ( on ) {
				if ( chr === '}' ) {
					on = false
					continue
				}

				switch( chr ) {
					case '1':
						str += random.get( 0, 9 )
						break
					case 'A':
						str += String.fromCharCode( random.get( 65,90 ) )
						break
					case '*':
						str += random.get(0,1) === 0 ? random.get(0,9) : String.fromCharCode( random.get( 65,90 ) )
						break
					default:
						str += chr
						break
				}
			} 
			
			// 'off' is when we are simply copying chr into the out buffer.
			else {
				// { and } switch between on and off modes.
				if ( chr === '{' ) {
					on = true
					continue
				}
				
				str += chr
			}
		}


		return str
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
};