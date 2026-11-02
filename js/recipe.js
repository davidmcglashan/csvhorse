const recipe = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v2.0.0-latest",
	config: {},

	/*
	* Executes the currently entered recipe.
	*/
	execute: () => {	
		// Tidy up the UI.
		recipe.clearLog()
		
		// Create an object describing our default configuration ...
		recipe.config = {
			rows: 10,
			columns: {
				blueprints: [],
				models: []
			},
			separator: ',',
			errors: []
		}
		let error = null

		// Make good the recipe text that was entered and start to make sense of it.
		// Variables maintain state across recipe executions and so have to be cleared out
		// before we re-parse the recipe.
		let recipeText = recipe.prepareText()
		variables.init()

		// Parsing the directives and the variables each return the line they finish on,
		// which will tell us when the column definitions start
		let start = Math.max( 
			recipe.parseDirectives( recipeText ),
			recipe.parseVariables( recipeText )
		)

		// Everything else is a column
		recipe.parseColumnBlueprintsFrom( recipeText, start )

		// csvModel is a table model for the CSV. We declare all the storage here.
		let csvModel = {}
		csvModel.rows = []
		csvModel.header = []
		for ( let r=0; r<recipe.config.rows; r+=1 ) {
			let row = {}
			csvModel.rows[r] = row
			row.columns = []
		}

		// The number of columns shown is the number of blueprints received ...
		let numberOfCols = recipe.config.columns.blueprints.length
		
		// At this point we have the number of rows and columns, and all the blueprints
		// so we can start generating content into the csvModel.
		for ( let c=0; c<numberOfCols; c+=1 ) {
			let blueprint = recipe.config.columns.blueprints[c]
			if ( blueprint[0] === 'stop' ) {
				numberOfCols = c
				break
			}

			// Process the blueprint to get a column model. Failure means this column is hidden
			// so we shouldn't process it any further.
			let columnModel = recipe.buildColumnModel( blueprint )
			recipe.config.columns.models[c] = columnModel
			if ( columnModel.hidden ) {
				continue
			}

			// Does the columnModel contain any header information?
			if ( columnModel.header ) {
				csvModel.header[c] = columnModel.header
				csvModel.showHeader = true
			}

			// Now use it to generate content for each row!
			for ( let r=0; r<recipe.config.rows; r+=1 ) {
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

		// Now turn the CSV model into a CSV string
		let str = ''

		// Show the header if the various configurations specifies one ...
		//  1. if the csvModel asks for one and the config doesn't disallow it
		//  2. the config explicitly allows it
		if ( 
			(csvModel.showHeader && !recipe.config.showHeader)
			|| (recipe.config.showHeader === 'on')
		) {
			for ( let c=0; c<numberOfCols; c+=1 ) {
				let columnModel = recipe.config.columns.models[c]
				if ( columnModel.hidden ) {
					continue
				}

				if ( c > 0 ) {
					str += recipe.config.separator
				}

				if ( csvModel.header[c] ) {
					str += recipe.makeSafe( csvModel.header[c], recipe.config )
				} else {
					if ( config.headerFormat === 'letters' ) {
						str += recipe.makeSafe( 'Column '+(String.fromCharCode(c+65)), recipe.config )
					} else {
						str += recipe.makeSafe( 'Column '+(c+1), recipe.config )
					}
				}
			}
			str += '\n'
		}

		// Now the table body
		for ( let r=0; r<csvModel.rows.length; r+=1 ) {
			let row = csvModel.rows[r]

			for ( let c=0; c<row.columns.length; c+=1 ) {
				let columnModel = recipe.config.columns.models[c]
				if ( columnModel.hidden ) {
					continue
				}
				let column = row.columns[c]

				if ( c > 0 ) {
					str += recipe.config.separator
				}

				// Non-empty rows don't leave empty cells (unless their content is empty)
				if ( !row.isEmpty || column.isAlwaysShown ) {
					str += recipe.makeSafe( column.content.trim(), recipe.config )
				}
			}
			if ( numberOfCols > 0 ) {
				str += '\n'
			}
		}

		// Finished looping. Better print the results ...
		let textarea = document.getElementById('out')
		textarea.value = str

		for ( let error in recipe.config.errors ) {
			recipe.addToLog( recipe.config.errors[error] )
		}

		if ( error ) { throw error }
	},

	/**
	 * Prepare the content of the HTML form element into an array of trimmed text with any comments
	 * and duplicates removed. Done in this func() so we only have to do it once.
	 */
	prepareText: () => {
		let recipeText = document.getElementById('rec').value.trim()
		let lastWasBlank = false
		let lines = []

		for ( let line of recipeText.split( '\n' ) ) {
			// Ignore comments
			if ( line.indexOf( '//' ) === 0 ) {
				continue
			}

			// If this line was blank and the last line was blank then don't include this line
			if ( line.length === 0 ) {
				if ( lastWasBlank ) {
					continue
				}
				lastWasBlank = true
			} else {
				lastWasBlank = false
			}

			// All tests passed. Include this line ...
			lines.push( line )
		}

		return lines
	},

	/**
	 * Parse the directives from the recipe text. These are always everything up to the first
	 * empty line, not including comments.
	 */
	parseDirectives: ( recipeText ) => {
		let counter = 0

		for ( let line of recipeText ) {
			counter += 1

			// At the first blank line we stop.
			if ( line.length === 0 ) {
				return counter
			}

			directives.addFromLine( line )
		}

		return counter
	},

	/**
	 * Parse the variables from the recipe text. These are always everything between two blanks lines after
	 * the directives where the first line is 'variables:'
	 */
	parseVariables: ( recipeText ) => {
		let started = false
		let counter = 0

		for ( let line of recipeText ) {
			counter += 1

			// Don't start reading variables until we're told
			if ( !started ) {
				started = line === 'variables:'
				continue
			}

			variables.addFromLine( line )

			// At the first blank line we stop.
			if ( line.length === 0 ) {
				return counter
			}
		}

		return 0
	},

	/**
	 * Reads the column blueprints from the recipe file.
	 */
	parseColumnBlueprintsFrom: ( recipeText, from ) => {
		let blueprint = []
		for ( i=from; i<recipeText.length; i+= 1 ) {
			let line = recipeText[i]
			
			// Blank lines end the recipe
			if ( line.length === 0 ) {
				recipe.config.columns.blueprints.push( blueprint )
				blueprint = []
			} else {
				blueprint.push( line )
			}
		}

		// There'll be a blueprint ready to push when we exit the loop above.
		recipe.config.columns.blueprints.push( blueprint )
	},

	/**
	 * Turns a blueprint into a column model which in turn will help generate the
	 * content of the CSV: a simple object which contain state that can be evaluated
	 * into strings.
	 */
	buildColumnModel: ( blueprint ) => {
		// A null blueprint results in a hidden column
		if ( !blueprint || blueprint.length === 0 ) {
			return {hidden:true}
		}
		
		// Blueprints are arrays - usually of the format: [header,content definition,meta]
		// where meta is optional		
		let columnModel = {}
		columnModel.tokens = []
		
		// Process the meta first because it can give us reason not to include this column model at all
		if ( !recipe.processMeta( columnModel, blueprint[2] ) ) {
			return {hidden:true}
		}

		// Headers can have variable subs, but nothing else.
		columnModel.header = variables.replace( blueprint[0] )

		// Some blueprints don't have a content definition so we need to check
		// for it. This section turns the content string into an array of tokens
		if ( blueprint[1] ) {
			blueprint[1] = variables.replace( blueprint[1] )
			columnModel.tokens = recipe.tokenise( blueprint[1] )
		}

		// Include everything that's left in the content (could be everything!) and push everything
		// back to be processed. blueprint[0] should be the header string and blueprint[2] is the optional meta.
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
	 * Turns the content string into an array of tokens: some are strings and
	 * some represent patterns.
	 */
	tokenise: ( str ) => {
		tokens = []

		// Search for patterns in the template.
		let i = 0
			
		searchLoop: 
		while ( i < str.length ) {
			// A % char means a pattern might follow. Does it match any of the variables ...
			if ( str[i] === '%' ) {
				for ( let key of variables.keys() ) {
					let index = str.indexOf( '%'+key )
					if ( index === i ) {
						// Tokenise the search string and the %pattern 
						tokens.push( str.substr(0,index) )
						tokens.push( { pattern:key } )
						
						// Chop the tokenised bits from the content and resume the search
						str = str.substring( index+key.length+1 )
						i = 0
						continue searchLoop
					}
				}
			}

			// An @ means a function call might follow ...
			if ( str[i] === '@' ) {
				for ( let key in funcs ) {
					let index = str.indexOf( '@'+key+'(' )
					// Does it match any of the functions, including the ) at the end?
					if ( index === i ) {
						let end = str.indexOf( ')', index )
						if ( end !== -1 ) {
							// Tokenise the search string.
							tokens.push( str.substr(0,index) )

							let vars = str.substring( index+key.length+2,end)
							tokens.push( { 
								function: key,
								vars: vars
							} )
							
							// Chop the tokenised bits from the content and resume the search
							str = str.substring( end+1 )
							i = 0
							continue searchLoop
						}
					}
				}				
			}
			i += 1
		}

		// Push any left over bits of str and return the array.
		tokens.push( str || ''  )
		return tokens
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