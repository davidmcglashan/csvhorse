const recipe = {
	// [major].[minor].[point]
	// - Major releases see significant change to the feature set e.g. multiple minors.
	// - Minor changes when at least one command is added, removed or changed, or a UI feature is added.
	// - Point releases for bug fixes, UI modifications, meta and build changes.
	version: "v0.0.2",

	/*
	* Executes the currently entered recipe.
	*/
	execute: () => {	
		// Store things in localstorage for future use.
		localStorage['csvhorse.recipe'] = document.getElementById('rec').value
		localStorage['csvhorse.variables'] = document.getElementById('vars').value

		// Tidy up the UI.
		recipe.clearLog()

		// Get the recipe text, split by newlines so we can parse each one in turn. Get the variables too ...
		let recipeLines = document.getElementById('rec').value.split('\n')
		let vars = recipe.parseVariables()
		let error = null

		for ( let line of recipeLines ) {
			// Ignore comments and blank lines
			if ( line.length === 0 || line.startsWith('//') ) {
				continue
			}
		}

		// Finished looping. Better print the results ...
		let textarea = document.getElementById('out')
		textarea.value = ''

		if ( error ) { throw error }
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

		return dict
	},

	/**
	 * Checks the ins string for instances of any $variable in vars and swaps in its
	 * value.
	 */
	replaceVariablesInString: ( vars, ins ) => {
		// Do the variables first since that's straightforward.
		for ( const [ key, value ] of Object.entries( vars ) ) {
			ins = ins.replaceAll( '$'+key, value )
		}

		return ins
	},

	/**
	 * Checks the ins string for instances of any %pattern in vars and swaps in its
	 * newly-generated value.
	 */
	replacePatternsInString: ( vars, ins ) => {
		// Patterns are variables prefixed with %. We want to generate a new result every time
		// we do a substitution.
		let index = 0
		for ( const [ key, value ] of Object.entries( vars ) ) {
			index = ins.indexOf( '%'+key )
			while ( index !== -1 ) {
				ins = ins.replace( '%'+key, recipe.getStringFromPattern( value ) )
				index = ins.indexOf( '%'+key )
			}
		}

		// Let the funcs do their func'ing.
		ins = funcs.rng( ins )
		ins = funcs.lorem( ins )
		ins = funcs.list( ins, vars )

		// Send back the finished string
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
				j += 1
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

const funcs = {
	/**
	 * Generates a random number based on the input of the line: @rng(1,10) => picks a number between 1 and 10
	 */
	rng: ( ins ) => {
		// @rng(min,max) generates random numbers
		let start = ins.indexOf( '@rng(' )
		while ( start !== -1 ) {
			// Parses the content, expecting two comma-separated numbers. 
			let end = ins.indexOf( ')', start )
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
			let val = ins.substr(start+7,end-start-7)

			// An 'r' means random words from the sequence, 'c' means capitalise the first word (like a sentence)
			let rnd = val.indexOf( 'r' ) != -1
			let cap = val.indexOf( 'c' ) != -1
			let num = parseInt(val)

			// Any problems result in the original string being returned untouched.
			if ( !isNaN(num) ) {
				ins = ins.substr( 0,start ) + recipe.getLipsum(num,rnd,cap) + ins.substr( end+1 )
			}

			start = ins.indexOf( '@lorem(' )
		}	

		return ins	
	},

	/**
	 * Chooses a random entry from a variable which was defined as a comma-separated list ...
	 * @list(foo) => A random entry from the list in $foo variable
	 */
	list: ( ins, vars ) => {
		let start = ins.indexOf( '@list(' )
		while ( start !== -1 ) {
			// Parses the content, expecting a string. 
			let end = ins.indexOf( ')', start )
			let list = vars[ins.substr(start+6,end-start-6)]

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
