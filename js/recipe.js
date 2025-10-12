const recipe = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v0.0.7",

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
		
		lineLoop: for ( let line of recipeLines ) {
			// Ignore comments and blank lines
			if ( line.length === 0 || line.startsWith('//') ) {
				continue
			}

			// If the line is a directive then let it update the config
			let tokens = line.split( ' ' )
			for ( let key in directives ) {
				if ( tokens[0] === key ) {
					directives[key]( tokens, config )
					continue lineLoop
				}
			}

			// Treat this line as a column definition.
			config.columns.defns.push(line)
		}

		// Model is a table model for the CSV. We build this before we show it onscreen.
		let model = {}
		model.rows = []
		for ( let r=0; r<config.rows; r+=1 ) {
			let row = {}
			model.rows[r] = row
			row.columns = []
		}

		// The number of columns shown is the number of definitions received ...
		let numberOfCols = config.columns.defns.length
		
		// ... unless the number of columns was stated in the input.
		if ( config.columns.stated ) {
			numberOfCols = config.columns.count
		}

		// At this point we have the number of rows and columns, and all the definitions so we can start generating content
		// into the model.
		for ( let c=0; c<numberOfCols; c+=1 ) {
			let defn = config.columns.defns[c]

			// Process the definition
			let spec = recipe.processDefinition( defn )

			// Now use it to generate content for each row!
			for ( let r=0; r<config.rows; r+=1 ) {
				let column = {}
				model.rows[r].columns[c] = column
				column.content = spec.next( r+1 )
			}
		}

		// Now turn the CSV model into a CSV string
		let str = ''
		for ( let r=0; r<model.rows.length; r+=1 ) {
			let row = model.rows[r]

			for ( let c=0; c<row.columns.length; c+=1 ) {
				let column = row.columns[c]

				if ( c > 0 ) {
					str += ','
				}
				str += column.content
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
	 * Turns a string definition into a spec which can generate content in the CSV.
	 */
	processDefinition: ( defn ) => {
		// A null definition results in an empty string.
		if ( !defn ) {
			return{ next: () => { return '' } }
		}

		let spec = null
		let tokens = defn.split( ' ' )

		// Check for variables
		if ( tokens[0].startsWith( '$' ) ) {
			let value = recipe.variables[tokens[0].substr(1)]
			if ( value ) {
				spec = { compose: ( row ) => { return recipe.replacePatternsInString( value, row ) } }
			}
		}

		// Check for leading "
		if ( tokens[0].startsWith( '"' ) ) {
			let value = defn.substr(1)
			let closing = value.indexOf('"')

			// If the closing quote is at the very end then the definition string is what we'll use
			if ( closing === -1 || closing === value.length-1 ) {
				return{ next: () => { return defn } }
			}

			spec = { compose: () => { return value.substr(0,closing) } }
		}

		// Check for patterns
		if ( tokens[0].startsWith( '%' ) ) {
			let pattern = recipe.variables[tokens[0].substr(1)]
			if ( pattern ) {
				spec = { compose: () => { return recipe.getStringFromPattern( pattern ) } }
			}
		}

		// Check for funcs
		if ( tokens[0].startsWith( '@' ) ) {
			let func = tokens[0].substr(1)
			let brace = func.indexOf('(')

			// If there's no brace then there's no function. Use the defn string instead.
			if ( brace === -1 ) {
				return{ next: () => { return defn } }
			}

			spec = { compose: ( row ) => { return funcs[func.substr(0,brace)]( defn.split(' ')[0], row ) } }
		}

		// If none of the above worked, create a simple next that returns the original definition string.
		if ( spec === null ) {
			return{ next: () => { return defn } }
		}

		// The default next() function calls compose(), unless modified by what follows ...
		spec.next = function( row ) { return this.compose( row ) }

		// Is there an empty keyword?
		for ( let t=0; t<tokens.length; t+=1 ) {
			if ( tokens[t] === 'empty' ) {
				let pctage = parseInt(tokens[t+1])
				spec.next = function( row ) {
					if ( random.get( 0, 100 ) < pctage ) {
						return ''
					} else {
						return this.compose( row )
					}
				}
				break
			}
		}

		return spec
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
	 * Checks the ins string for instances of any %pattern in vars and swaps in its
	 * newly-generated value.
	 */
	replacePatternsInString: ( ins, row ) => {
		// Patterns are variables prefixed with %. We want to generate a new result every time
		// we do a substitution.
		let index = 0
		for ( const [ key, value ] of Object.entries( recipe.variables ) ) {
			index = ins.indexOf( '%'+key )
			while ( index !== -1 ) {
				ins = ins.replace( '%'+key, recipe.getStringFromPattern( value ) )
				index = ins.indexOf( '%'+key )
			}
		}

		// Let the funcs do their func'ing.
		ins = funcs.rng( ins, row )
		ins = funcs.lorem( ins, row )
		ins = funcs.list( ins, row )
		ins = funcs.count( ins, row )

		// Send back the finished string
		return ins
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
		let rows = parseInt(tokens[1])
		if ( isNaN( rows ) ) {
			config.errors.push( 'Rows requires a number')
		} else {
			config.rows = rows
		}
	},

};

const funcs = {
	/**
	 * Implements a count by adding the passed-in row number to the start number defined in the func.
	 */
	count: ( ins, row=1 ) => {
		let start = ins.indexOf( '@count(' )
		while ( start !== -1 ) {
			// Parses the content, expecting a number. 
			let end = ins.indexOf( ')', start )
			if ( end === -1 ) {
				return ins
			}

			let val = ins.substr(start+7,end-start-7)
			let num = parseInt(val)

			// Any problems result in the original string being returned untouched.
			if ( !isNaN(num) ) {
				ins = ins.substr( 0,start ) + (num+row-1) + ins.substr( end+1 )
			} else {
				ins = ins.substr( 0,start ) + (row) + ins.substr( end+1 )
			}

			start = ins.indexOf( '@count(' )
		}	

		return ins	
	},
	
	/**
	 * Generates a random number based on the input of the line: @rng(1,10) => picks a number between 1 and 10
	 */
	rng: ( ins ) => {
		// @rng(min,max) generates random numbers
		let start = ins.indexOf( '@rng(' )
		while ( start !== -1 ) {
			// Parses the content, expecting two comma-separated numbers. 
			let end = ins.indexOf( ')', start )
			if ( end === -1 ) {
				return ins
			}
			let vals = ins.substr(start+5,end-start-5).split(',')
			let result = random.get( parseInt(vals[0]), parseInt(vals[1]) )
			
			// Any problems result in the original string being returned untouched.
			if ( !isNaN(result) ) {
				ins = ins.substr( 0,start ) + result + ins.substr( end+1 )
			}

			start = ins.indexOf( '@rng(' )
		}

		return ins
	},
	
	/**
	 * @lorem(num) inserts N words of lorem ipsum ... @lorem(3) => three words of lipsum
	 */
	lorem: ( ins ) => {
		let start = ins.indexOf( '@lorem(' )
		while ( start !== -1 ) {
			// Parses the content, expecting a number. 
			let end = ins.indexOf( ')', start )
			if ( end === -1 ) {
				return ins
			}

			let val = ins.substr(start+7,end-start-7)

			// An 'r' means random words from the sequence, 'c' means capitalise the first word (like a sentence)
			let rnd = val.indexOf( 'r' ) != -1
			let cap = val.indexOf( 'c' ) != -1
			let num = parseInt(val)

			// Any problems result in the original string being returned untouched.
			if ( !isNaN(num) ) {
				ins = ins.substr( 0,start ) + funcs.getLipsum(num,rnd,cap) + ins.substr( end+1 )
			}

			start = ins.indexOf( '@lorem(' )
		}	

		return ins	
	},

	/**
	 * Generates num words of lower-case Lorem Ipsum text. rnd will shuffle the words. cap will capitalise the first word.
	 */
	getLipsum: ( num, rnd, cap ) => {
		const lipsum = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(' ')
		let ret = ''
		for ( let i=0; i<Math.min(35,num); i++ ) {
			if ( i > 0 ) {
				ret += ' '
			}
			ret += rnd ? lipsum[random.get(0,35)] : lipsum[i]
		}

		if ( cap ) {
			ret = ret[0].toUpperCase() + ret.substr( 1 )
		}
		return ret
	},

	/**
	 * Chooses a random entry from a variable which was defined as a comma-separated list ...
	 * @list(foo) => A random entry from the list in $foo variable
	 */
	list: ( ins ) => {
		let start = ins.indexOf( '@list(' )
		while ( start !== -1 ) {
			// Parses the content, expecting a string. 
			let end = ins.indexOf( ')', start )
			let list = recipe.variables[ins.substr(start+6,end-start-6)]

			// Any problems result in the original string being returned untouched.
			if ( list ) {
				entries = list.split(',')
				ins = ins.substr( 0,start ) + entries[random.get(0,entries.length-1)]+ ins.substr( end+1 )
			}

			start = ins.indexOf( '@list(' )
		}	

		return ins	
	}
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
