const recipe = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v2.0.0-latest",

	/*
	* Executes the currently entered recipe.
	*/
	execute: () => {	
		// Tidy up the UI.
		recipe.clearLog()
		
		// Create an object describing our default configuration ...
		let config = {
			rows: 10,
			columns: {
				blueprints: [],
				models: []
			},
			separator: ',',
			errors: []
		}
		let error = null

		// A first pass strips all the comments from the recipe file.
		let inText = ''
		for ( let line of document.getElementById('rec').value.trim().split('\n') ) {
			line = line.trim()
			if ( line.startsWith( '//' ) ) {
				continue
			}
			inText += line + '\n'
		}

		// Get the recipe text, split by double newlines so we can parse each block in turn. 
		let recipeBlocks = inText.split('\n\n')

		// The first block is always always the directives
		for ( let line of recipeBlocks[0].split( '\n' ) ) {
			directives.parse( line, config )
		}

		// Variables are declared in the next block if it is so annoted ...
		let i = 1
		if ( recipeBlocks[i].startsWith( 'variables:\n' ) ) {
			recipe.parseVariables( recipeBlocks[i] )
			i += 1
		}

		// Everything else is a column
		for ( ; i<recipeBlocks.length; i+= 1 ) {
			config.columns.blueprints.push( recipeBlocks[i] )
		}

		// csvModel is a table model for the CSV. We declare all the storage here.
		let csvModel = {}
		csvModel.rows = []
		csvModel.header = []
		for ( let r=0; r<config.rows; r+=1 ) {
			let row = {}
			csvModel.rows[r] = row
			row.columns = []
		}

		// The number of columns shown is the number of blueprints received ...
		let numberOfCols = config.columns.blueprints.length
		
		// At this point we have the number of rows and columns, and all the blueprints
		// so we can start generating content into the csvModel.
		for ( let c=0; c<numberOfCols; c+=1 ) {
			let blueprint = config.columns.blueprints[c]
			if ( blueprint === 'stop' ) {
				numberOfCols = c
				break
			}

			// Process the blueprint to get a column model. Failure means this column is hidden
			// so we shouldn't process it any further.
			let columnModel = recipe.getColumnModel( blueprint )
			config.columns.models[c] = columnModel
			if ( columnModel.hidden ) {
				continue
			}

			// Does the columnModel contain any header information?
			if ( columnModel.header ) {
				csvModel.header[c] = columnModel.header
				csvModel.showHeader = true
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
							column.content += recipe.getStringFromPattern( recipe.variables[token.pattern] )
						} 
						
						// Functions require some execution
						else if ( token.function ) {
							column.content += funcs[token.function].func( token )
						}
					}
				}
			}
		}

		// Now turn the CSV model into a CSV string
		let str = ''

		// Show the header if the various configurations specifies one ...
		//  1. if the csvModel asks for one and the config doesn't disallow it
		//  2. the config explicitly allows it
		if ( 
			(csvModel.showHeader && !config.showHeader)
			|| (config.showHeader === 'on')
		) {
			for ( let c=0; c<numberOfCols; c+=1 ) {
				let columnModel = config.columns.models[c]
				if ( columnModel.hidden ) {
					continue
				}

				if ( c > 0 ) {
					str += config.separator
				}

				if ( csvModel.header[c] ) {
					str += recipe.makeSafe( csvModel.header[c], config )
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
		for ( let r=0; r<csvModel.rows.length; r+=1 ) {
			let row = csvModel.rows[r]

			for ( let c=0; c<row.columns.length; c+=1 ) {
				let columnModel = config.columns.models[c]
				if ( columnModel.hidden ) {
					continue
				}
				let column = row.columns[c]

				if ( c > 0 ) {
					str += config.separator
				}

				// Non-empty rows don't leave empty cells (unless their content is empty)
				if ( !row.isEmpty || column.isAlwaysShown ) {
					str += recipe.makeSafe( column.content.trim(), config )
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
			recipe.addToLog( config.errors[error] )
		}

		if ( error ) { throw error }
	},

	/**
	 * Turns a string definition into a column model which in turn will help generate the
	 * content of the CSV. A simple object which contain state that can be evaluated into
	 * strings.
	 */
	getColumnModel: ( blueprint ) => {
		// A null blueprint results in a hidden column
		if ( !blueprint || blueprint.length === 0 ) {
			return {hidden:true}
		}

		// Blueprints are multiline - usually of the format: header\ncontent definition\nmeta
		// where meta is optional
		let arr = blueprint.split( '\n' )
		
		let content = arr[1]
		let columnModel = {}
		columnModel.tokens = []
		
		// Process the meta first because it can give us reason not to include this column model at all
		if ( !recipe.processMeta( columnModel, arr[2] ) ) {
			return {hidden:true}
		}

		if ( content ) {
			// Replace any known variables in the template.
			for ( let key in recipe.variables ) {
				content = content.replaceAll( '$'+key, recipe.variables[key] )
				arr[0] = arr[0].replaceAll( '$'+key, recipe.variables[key] )
			}

			// Search for patterns in the template.
			let i = 0
			searchLoop: while ( i < content.length ) {
				// A % char means a pattern might follow ...
				if ( content[i] === '%' ) {
					for ( let key in recipe.variables ) {
						let index = content.indexOf( '%'+key )
						// Does it match any of the variables?
						if ( index === i ) {
							// Tokenise the search string and the %pattern 
							columnModel.tokens.push( content.substr(0,index) )
							columnModel.tokens.push( { pattern:key } )
							
							// Chop the tokenised bits from the content and resume the search
							content = content.substring( index+key.length+1 )
							i = 0
							continue searchLoop
						}
					}
				}

				// An @ means a function call might follow ...
				if ( content[i] === '@' ) {
					for ( let key in funcs ) {
						let index = content.indexOf( '@'+key+'(' )
						// Does it match any of the functions, including the ) at the end?
						if ( index === i ) {
							let end = content.indexOf( ')', index )
							if ( end !== -1 ) {
								// Tokenise the search string.
								columnModel.tokens.push( content.substr(0,index) )

								let vars = content.substring( index+key.length+2,end)
								columnModel.tokens.push( { 
									function: key,
									vars: vars
								} )
								
								// Chop the tokenised bits from the content and resume the search
								content = content.substring( end+1 )
								i = 0
								continue searchLoop
							}
						}
					}				
				}
				i += 1
			}
		}

		// Include everything that's left in the content (could be everything!) and push everything
		// back to be processed. arr[0] should be the header string and arr[2] is the optional meta.
		columnModel.tokens.push( content || ''  )
		columnModel.header = arr[0]
		return columnModel
	},

	/**
	 * Parses the config part of a defn string and configures the column model to act accordingly.
	 */
	processMeta: ( columnModel, meta = '' ) => {
		// Meta strings are space-separated tokens we parse one-by-one
		let tokens = meta.split(' ')

		for ( let t=0; t<tokens.length; t+=1 ) {
			// 'off' means this column Model should never show
			if ( tokens[t] === 'off' ) {
				return false
			}

			// Empty states a %age that the column can be empty for.
			else if ( tokens[t] === 'empty' && !columnModel.isAlwaysShown ) {
				let pctage = parseInt(tokens[t+1])
				columnModel.emptyPercentage = pctage
				continue
			}

			// Always overrides any empty row directive to make the column always show.
			else if ( tokens[t] === 'always' ) {
				columnModel.isAlwaysShown = true
				columnModel.emptyPercentage = 0
				continue
			}
		}

		return true
	},

	/**
	 * Parse the variables from the textarea, returing a dictionary of variable vrs value
	 */
	parseVariables: ( lines ) => {
		let dict = {}

		// Take the contents of the variables text area. If there's an equals we can use it.
		for ( line of lines.split( '\n' ) ) {
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