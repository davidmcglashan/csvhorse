const recipe = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v0.2.1",

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
					str += ','
				}

				if ( model.header[c] ) {
					str += model.header[c]
				} else {
					if ( config.headerFormat === 'letters' ) {
						str += 'Column '+(String.fromCharCode(c+65))
					} else {
						str += 'Column '+(c+1)
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
					str += ','
				}

				// Non-empty rows don't leave empty cells (unless their content is empty)
				if ( !row.isEmpty || column.isAlwaysShown ) {
					str += column.content.trim()
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
};

const funcs = {
	/**
	 * Implements a counter using the function's saved state to increment. The next value of the
	 * function is returned for inclusion in the CSV.
	 * @count() starts from 1 and increments by 1
	 * @count(23) starts from 23 and increments by 1
	 * @count(5 step 5) starts from 5 and increments by 5
	 * @count(step 10) starts from 1 and increments by 10
	 * @count(skip 50) starts from 1 and increments by 1 with a 50% probability of a value being skipped.
	 */
	count: ( func ) => {
		// Set up the function first.
		if ( !func.current ) {
			// These are the default values. We'll use these if something goes wrong.
			func.current = 1
			func.step = 1
			func.skip = 0

			if ( func.vars ) {
				let vars = func.vars.split( ' ' )
				let i = 0

				// The first parameter being a number can only be a starting index.
				let start = parseInt( vars[i] )
				if ( !isNaN( start ) ) {
					func.current = start
					i += 1
				}

				while ( i < vars.length ) {
					// Next parameter must be a recognised word.
					if ( vars[i] === 'step' ) {
						if ( vars[i+1] ) {
							let step = parseInt( vars[i+1] )
							if ( !isNaN( step ) ) {
								func.step = step
							}	
						}
					}
					// Next parameter must be a recognised word.
					else if ( vars[i] === 'skip' ) {
						if ( vars[i+1] ) {
							let skip = parseInt( vars[i+1] )
							if ( !isNaN( skip ) ) {
								func.skip = skip
							}	
						}
					}

					i += 1
				}
			}

			return func.current
		}

		// Non-zero skips mean that sometimes we skip a value when counting.
		if ( func.skip > 0 ) {
			while ( random.get(0,100) < func.skip ) {
				func.current += func.step
			}
		}

		// Increment the counter and return the new value.
		func.current += func.step
		return func.current
	},

	/**
	 * Implements a date using the function's saved state to increment. The next value of the
	 * function is returned for inclusion in the CSV.
	 * @date() inserts the current date
	 * @date(23) starts from 23 days time
	 * @date(-1) starts from yesterday
	 * @date(step 1) starts from today and increments by 1 day with each call
	 * @date(step 1 skip 50) starts from today and increments by 1 with a 50% probability of a value being skipped.
	 */
	date: ( func ) => {
		// Set up the function first.
		if ( !func.current ) {
			// These are the default values. We'll use these if something goes wrong.
			func.current = new Date()
			func.step = 0
			func.skip = 0
			func.format = 'dMy'
			func.separator = ' '

			if ( func.vars ) {
				let vars = func.vars.split( ' ' )
				let i = 0

				// The first parameter being a number can only be a starting index.
				let start = parseInt( vars[i] )
				if ( !isNaN( start ) ) {
					func.current = new Date( new Date().setDate( new Date().getDate() + start ) )
					i += 1
				}

				while ( i < vars.length ) {
					// Next parameter must be a recognised word.
					if ( vars[i] === 'step' ) {
						if ( vars[i+1] ) {
							let step = parseInt( vars[i+1] )
							if ( !isNaN( step ) ) {
								func.step = step
							}	
						}
					}

					// Next parameter must be a recognised word.
					else if ( vars[i] === 'skip' ) {
						if ( vars[i+1] ) {
							let skip = parseInt( vars[i+1] )
							if ( !isNaN( skip ) ) {
								func.skip = skip
							}	
						}
					}

					// Next parameter will take some working out
					else if ( vars[i] === '/' ) {
						func.separator = '/'
					} else if ( vars[i] === '-' ) {
						func.separator = '-'
					} else if ( vars[i] === '.' ) {
						func.separator = '.'
					} else if ( vars[i] === '!' ) {
						func.separator = ''
					} else if ( vars[i].indexOf( 'y' ) !== -1 ) {
						func.format = vars[i]
					}

					i += 1
				}
			}
		} 
		
		// We're already set up so do the increment and skip if appropriate ...
		else {
			// Non-zero skips mean that sometimes we skip a value when counting.
			if ( func.skip > 0 ) {
				while ( random.get(0,100) < func.skip ) {
					func.current = new Date( func.current.setDate( func.current.getDate() + func.step ) )
				}
			}

			// Increment the counter and return the new value.
			func.current = new Date( func.current.setDate( func.current.getDate() + func.step ) )
		}

		// Format the date based on the ourput parameters
		const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
		switch ( func.format ) {
			case 'dmy':
				return `${func.current.getDate()}${func.separator}${func.current.getMonth()+1}${func.separator}${func.current.getFullYear()}`
			case 'dMy':
				return `${func.current.getDate()}${func.separator}${months[func.current.getMonth()]}${func.separator}${func.current.getFullYear()}`
			case 'mdy':
				return `${func.current.getMonth()+1}${func.separator}${func.current.getDate()}${func.separator}${func.current.getFullYear()}`
			case 'Mdy':
				return `${months[func.current.getMonth()]}${func.separator}${func.current.getDate()}${func.separator}${func.current.getFullYear()}`
			case 'ymd':
				return `${func.current.getFullYear()}${func.separator}${func.current.getMonth()+1}${func.separator}${func.current.getDate()}`
			case 'yMd':
				return `${func.current.getFullYear()}${func.separator}${months[func.current.getMonth()]}${func.separator}${func.current.getDate()}`
		}

		return func.current.toDateString()
	},
	
	/**
	 * Implements a random number generator. The genreated value is returned for inclusion in the CSV.
	 * @rng() generates a number between 1 and 100
	 * @rng(10) generates a number between 1 and 10
	 * @rng(25,75) generates a number between 25 and 75
	 */
	rng: ( func ) => {
		// Set the function up if it hasn't yet been.
		if ( !func.max ) {
			func.max = 100
			func.min = 1

			// We may have one or two comma-separated numbers in the variables.
			if ( func.vars ) {
				let vars = func.vars.split( ',' )

				// One parameter means we're changing the max.
				if ( vars.length === 1 ) {
					let max = parseInt( vars[0] )
					if ( !isNaN( max ) ) {
						func.max = max
					}
				}

				// Two parameters means changing both min and max
				if ( vars.length > 1 ) {
					let min = parseInt( vars[0] )
					if ( !isNaN( min ) ) {
						func.min = min
					}
					let max = parseInt( vars[1] )
					if ( !isNaN( max ) ) {
						func.max = max
					}
				}
			}
		}

		return random.get( func.min, func.max )
	},
	
	/**
	 * Generates Lorem Ipsum passages for inclusion in the CSV. Returned strings are capitalised.
	 * @lorem() returns 5 words of lorem ipsum
	 * @lorem(10) returns 10 words of lorem ipsum
	 * @lorem(7 random) returns 10 _random_ words of lorem ipsum
	 */
	lorem: ( func ) => {
		// Set the function up if it hasn't yet been.
		if ( !func.numberOfWords ) {
			func.numberOfWords = 5
			func.random = false
			func.capitalise = true

			if ( func.vars ) {
				// An 'r' means random words from the sequence, 'c' means capitalise the first word (like a sentence)
				func.random = func.vars.indexOf( 'random' ) != -1
				//func.capitalise = func.vars.indexOf( 'c' ) != -1
				func.numberOfWords = Math.min( 35, parseInt(func.vars) )
			}
		}

		const lipsum = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(' ')
		let ret = ''

		for ( let i=0; i<func.numberOfWords; i++ ) {
			if ( i > 0 ) {
				ret += ' '
			}
			ret += func.random ? lipsum[random.get(0,35)] : lipsum[i]
		}
	
		if ( func.capitalise ) {
			ret = ret[0].toUpperCase() + ret.substring( 1 )
		}
		return ret
	},

	/**
	 * Chooses a random entry from a variable's value which was defined as a comma-separated list for
	 * inclusion in the CSV.
	 * @oneof(foo) => A random entry from the list in $foo variable
	 */
	oneof: ( func ) => {
		if ( !func.entries ) {
			// Use an empty list if we can't find the specified list.
			func.entries = ['']

			if ( func.vars ) {
				let list = recipe.variables[func.vars.trim()]
				if ( list ) {
					func.entries = list.split( ',' )
				}
			}
		}

		return func.entries[ random.get( 0, func.entries.length-1 ) ]
	},

	/**
	 * Generates a random UUID for inclusion in the CSV. Takes no parameters, maintains no state!
	 */
	uuid: ( func ) => {
		return self.crypto.randomUUID()
	},
};

const random = {
	SEED: 0,

	/**
	 * Does random numbers based on the global SEED which is manipulated a bit!
	 * https://stackoverflow.com/a/65793426
	 */ 
	get: ( min,max ) => {
		if ( random.SEED === 0 ) {
			random.SEED = parseInt( random.getSeed() ) || 1
		}

		// Robert Jenkins’ 32 bit integer hash function ...
		random.SEED = ((random.SEED + 0x7ED55D16) + (random.SEED << 12))  & 0xFFFFFFFF
		random.SEED = ((random.SEED ^ 0xC761C23C) ^ (random.SEED >>> 19)) & 0xFFFFFFFF
		random.SEED = ((random.SEED + 0x165667B1) + (random.SEED << 5))   & 0xFFFFFFFF
		random.SEED = ((random.SEED + 0xD3A2646C) ^ (random.SEED << 9))   & 0xFFFFFFFF
		random.SEED = ((random.SEED + 0xFD7046C5) + (random.SEED << 3))   & 0xFFFFFFFF
		random.SEED = ((random.SEED ^ 0xB55A4F09) ^ (random.SEED >>> 16)) & 0xFFFFFFFF
		let rnd = (random.SEED & 0xFFFFFFF) / 0x10000000

		return min + Math.floor( rnd*(max-min+1) )
	},

	/**
	 * Gets or derives the seed.
	 */
	getSeed: () => {		
		const urlParams = new URLSearchParams( window.location.search );
		const seed = urlParams.get( 'seed' );

		// Did we get one?
		if ( seed !== null ) {
			return seed
		}

		// Never mind. Fashion one out of today's date.
		return '' + new Date().getMilliseconds()
	},
}
