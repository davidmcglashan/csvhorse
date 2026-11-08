const contextHelp = {
	/**
	 * Check for context help under the recipe text with something relevant
	 * to the user's current cursor position.
	 */
	check: () => {
		let std = document.getElementById( 'std-footer' )
		let help = document.getElementById( 'context-help' )
		let rec = document.getElementById('rec')
		let recipe = rec.value
		let index = rec.selectionEnd-1
		let hasHelp = false

		// This block determines whether there's something to show in the context
		// help element by examining the cursor position and counting back until
		// we encounter a stopper.
		if ( index > 0 ) {
			const stoppers = [ '@', '%', '$', ' ', '\n', '/' ]

			let start = index
			while ( !stoppers.includes( recipe[start] ) ) {
				start -= 1
			}

			// Search that chunk for something we can provide help for.
			let chunk = recipe.substr(start,index-start+1)
			let content = null
			
			// @functions 
			if ( chunk.indexOf( '@' ) !== -1 ) {
				content = contextHelp.checkForFuncs( chunk )
			}

			// $variables
			else if ( chunk.indexOf( '$' ) !== -1 ) {
				content = contextHelp.checkForVars( chunk )
			}

			// %patterns
			else if ( chunk.indexOf( '%' ) !== -1 ) {
				content = contextHelp.checkForPatterns( chunk )
			}

			if ( content ) {
				hasHelp = true
				help.innerHTML = content.message
			}
		}

		// Update the UI
		std.setAttribute( 'class', hasHelp ? 'hidden' : '' )
		help.setAttribute( 'class', !hasHelp ? 'hidden' : '' )
	},

	/**
	 * Writes context help for patterns, returning an object containing
	 * a message to be displayed in the UI.
	 */
	checkForPatterns: ( chunk ) => {
		return { message: 'Patterns replace within { and } - <strong>A</strong> &rarr; uppercase letter, <strong>1</strong> &rarr; a number, <strong>*</strong> &rarr; a number or letter &mdash; e.g. "Your code is %{AAA-11*}"' }
	},

	/**
	 * Writes context help for any variables, returning an object containing
	 * a message to be displayed in the UI.
	 */
	checkForVars: ( chunk ) => {
		let str = ''
		for ( key of variables.keys() ) {
			str += `<strong>\$${key}</strong>, \n`
		}
		str += 'Variables only update when the recipe is executed'
		return { message: str }
	},

	/**
	 * Writes context help for the functions, returning an object containing
	 * a message to be displayed in the UI.
	 */
	checkForFuncs: ( chunk ) => {
		// A single '@' char means we iterate all the funcs.
		if ( chunk === '@' ) {
			let str = ''
			for (const [key,func] of Object.entries( funcs ) ) {
				str += `<strong>@${key}</strong>, \n`
			}
			return { message: str }
		}

		// Something more than a '@' means we count all the functions that match
		// what's in the chunk so far ...
		else {
			let matches = []
			for (const [key,func] of Object.entries( funcs ) ) {
				if ( `@${key}`.startsWith( chunk )  ) {
					matches.push( key )
				}
			}

			// One match is a strict function definition
			if ( matches.length === 1 ) {
				return { message: `<strong>@${matches[0]}(</strong> ${funcs[matches[0]].params} <strong>)</strong>` }
			}

			// More 
			else if ( matches.length > 1 ) {
				let str = ''
				for ( let match of matches ) {
					str += `<strong>@${match}</strong>, \n`
				}
				return { message: `${str}` }
			}
		}

		// Didn't match any functions so return a message
		return { message: `there is no function <strong>${chunk}</strong>` }
	},
}