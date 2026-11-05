const recipe = {
	/*
	* Executes the currently entered recipe.
	*/
	read: () => {	
		// Create an object describing our default configuration ...
		recipe.config = {
			rows: 10,
			rowsEmptyPercentage: 0,
			columns: [],
			separator: ',',
			errors: [],
		}

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

		// Everything else in the recipe file is a column
		recipe.parseColumnBlueprintsFrom( recipeText, start )
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
		let arr = []
		let blueprint = []
		for ( i=from; i<recipeText.length; i+= 1 ) {
			let line = recipeText[i]

			// A stop directive will prevent any further columns being added
			if ( line === 'stop' ) {
				break
			}

			// Blank lines end the recipe
			if ( line.length === 0 ) {
				arr.push( blueprint )
				blueprint = []
			} else {
				blueprint.push( line )
			}
		}

		// There'll be a blueprint ready to push when we exit the loop above.
		arr.push( blueprint )
		
		// Blueprints are just text so now we build models out of them
		for ( blueprint of arr ) {
			// Process the blueprint to get a column model. If the column is hidden
			// we discard it.
			let columnModel = recipe.buildColumnModel( blueprint )
			if ( columnModel.hidden ) {
				continue
			}
			recipe.config.columns.push( columnModel )
		}
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

			// Always overrides any empty row directive to make the column always show.
			else if ( tokens[t] === 'upper' ) {
				columnModel.caseModifier = 1
				continue
			}		
			// Always overrides any empty row directive to make the column always show.
			else if ( tokens[t] === 'lower' ) {
				columnModel.caseModifier = 2
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
				// Find the start and end {} for the pattern string. First must be the
				// next char and last must come after first.
				let first = str.indexOf( '{', i )
				let last = str.indexOf( '}', i )
				if ( first === i+1 && last > first ) {
					// Tokenise the search string and the %pattern 
					tokens.push( str.substr(0,i) )
					tokens.push( { pattern:`${ str.substr(first+1,last-first-1)}` } )

					// Chop the tokenised bits from the content and resume the search
					str = str.substring( last+1 )
					i = 0
					continue searchLoop
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
};