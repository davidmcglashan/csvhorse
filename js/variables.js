const variables = {
	dict: {},

	/**
	 * Re-initialised the variable dictionary
	 */
	init: () => {
		variables.dict = {}
	},

	keys: () => {
		return Object.keys(variables.dict)
	},

	/**
	 * Read a new variable from the passed in recipe line.
	 */
	addFromLine: ( line ) => {
		if ( line.length > 0 && line.indexOf( '=' ) > 0 ) {
			let bits = line.split(/=(.*)/)
			variables.dict[bits[0].trim()] = bits[1].trim()
		}
	},

	get: ( key ) => {
		return variables.dict[key]
	},

	/**
	 * Perform variable replacements on a string. Returns the new string.
	 */
	replace: ( str ) => {
		// Replace any known variables in the template.
		for ( let key in variables.dict ) {
			str = str.replaceAll( '$'+key, variables.dict[key] )
		}

		return str
	}
}
