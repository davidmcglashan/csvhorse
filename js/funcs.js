const funcs = {
	/**
	 * Count function
	 */
	count: {
		params: "(start) ('step' [number]) ('skip' [number)",
		short: "A counter with controllable start, steps, and skips.",
		long: [
			'@count() starts from 1 and increments by 1',
			'@count(23) starts from 23 and increments by 1',
			'@count(5 step 5) starts from 5 and increments by 5',
			'@count(step 10) starts from 1 and increments by 10',
			'@count(skip 50) starts from 1 and increments by 1 with a 50% probability of a value being skipped.'
		],
		func: ( func ) => {
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
		}
	},
	
	/**
	 * Implements a random number generator. The genreated value is returned for inclusion in the CSV.
	 */
	rng: {
		params: "(min),(max)",
		short: "Random number generator",
		long: [
			'@rng() generates a number between 1 and 100',
			'@rng(10) generates a number between 1 and 10',
			'@rng(25,75) generates a number between 25 and 75'
		],
		func: ( func ) => {
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
		}
	},

	/**
	 * Implements a date using the function's saved state to increment. 
	 */
	date: {
		params: "(start) ('step' [number]) ('skip' [number)",
		short: "Inserts the current or random date with stepping for chronological sequences",
		long: [
			'@date() inserts the current date',
	 		'@date(23) starts from 23 days time',
	 		'@date(-1) starts from yesterday',
	 		'@date(step 1) starts from today and increments by 1 day with each call',
	 		'@date(step 1 skip 50) starts from today and increments by 1 with a 50% probability of a value being skipped.',
		],
		func: ( func ) => {
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
			let d = func.current.getDate()
			let dd = d < 10 ? '0' + d : d
			let m = func.current.getMonth()
			let mm = m < 9 ? '0' + (m+1) : (m+1)
			let y = func.current.getFullYear()
			let sep = func.separator

			switch ( func.format ) {
				case 'dmy':
					return `${dd}${sep}${mm}${sep}${y}`
				case 'dMy':
					return `${d}${sep}${months[m]}${sep}${y}`
				case 'mdy':
					return `${mm}${sep}${dd}${sep}${y}`
				case 'Mdy':
					return `${months[m]}${sep}${d}${sep}${y}`
				case 'ymd':
					return `${y}${sep}${mm}${sep}${dd}`
				case 'yMd':
					return `${y}${sep}${months[m]}${sep}${d}`
			}

			return func.current.toDateString()
		}
	},

	/**
	 * Writes the time using the function's saved state to increment. The next value of the
	 * function is returned for inclusion in the CSV.
	 * @time() inserts the current time
	 */
	time: {
		params: "(random|am|pm|day) (step)",
		short: "Inserts the current or random time with stepping for chronological sequences",
		long: [
			"@time() inserts the current time",
			"@time(random) inserts a random 24 hour time",
			"@time(am) inserts a time from the morning",
			"@time(pm) inserts a time from the afternoon or evening",
			"@time(day) inserts a time from 6am to 6pm",
			"@time(step) inserts a time between 2 and 20 minutes later than the previous call",
			"@time(am step) starts in the morning but subsequently inserts later times"
		],
		func: ( func ) => {
			// Set up the function first.
			if ( !func.setup ) {
				func.setup = true

				// Set up to use the current time. This may be overriden later on.
				let time = new Date()
				func.hour = time.getHours()
				func.minute = time.getMinutes()
				func.second = time.getSeconds()

				// Parse the parameters if there are any ...
				if ( func.vars ) {
					let vars = func.vars.split( ' ' )

					for ( let i=0; i < vars.length; i+= 1 ) {
						if ( vars[i] === 'random' ) {
							func.randomise = true
							func.min = 0
							func.max = 23
						} else if ( vars[i] === 'am' ) {
							func.randomise = true
							func.min = 0
							func.max = 11
						} else if ( vars[i] === 'pm' ) {
							func.randomise = true
							func.min = 12
							func.max = 23
						} else if ( vars[i] === 'day' ) {
							func.randomise = true
							func.min = 6
							func.max = 18
						} else if ( vars[i] === 'step' ) {
							func.step = true
						} else if ( vars[i].length > 0 ) {
							func.format = vars[i]
						}
					}
				}

				if ( func.randomise ) {
					func.hour = random.get(func.min,func.max)
					func.minute = random.get(0,59)
					func.second = random.get(0,59)
					if ( func.step ) {
						func.randomise = false
					}
				}
			}
			
			// Are we set to randomise the minutes and seconds with every iteration?
			if ( func.randomise )  {
				func.hour = random.get(func.min,func.max)
				func.minute = random.get(0,59)
				func.second = random.get(0,59)
			}

			else if ( func.step ) {
				func.minute += random.get(2,20)
				if ( func.minute > 59 ) {
					func.hour += 1
					func.minute -= 60
				}
				func.second = random.get(0,59)
			}

			// Display the current value based on formatting rules.
			let hh = (func.hour < 10 ? '0' : '' ) + func.hour
			let mm = (func.minute < 10 ? '0' : '' ) + func.minute
			let ss = (func.second < 10 ? '0' : '' ) + func.second

			if ( func.format === 'hm' ) {
				return `${hh}:${mm}`
			} else {
				return `${hh}:${mm}.${ss}`
			}
		}
	},
	
	/**
	 * Generates Lorem Ipsum passages for inclusion in the CSV. Returned strings are capitalised.
	 */
	lorem: {
		params: "(words) ('random')",
		short: "Insert strings of Lorem Ipsum text",
		long: [
			'@lorem() returns 5 words of lorem ipsum',
	 		'@lorem(10) returns the first 10 words of lorem ipsum',
			'@lorem(7 random) returns 7 _random_ words of lorem ipsum',
			'@lorem(7 random spread) returns 5-to-9 _random_ words of lorem ipsum'
		],
		func: ( func ) => {
			// Set the function up if it hasn't yet been.
			if ( !func.numberOfWords ) {
				func.numberOfWords = 5
				func.random = false
				func.capitalise = true
				func.spread = false 

				if ( func.vars ) {
					func.random = func.vars.indexOf( 'random' ) != -1
					func.spread = func.vars.indexOf( 'spread' ) != -1

					//func.capitalise = func.vars.indexOf( 'c' ) != -1
					func.numberOfWords = Math.min( 35, parseInt(func.vars) )
					if ( func.numberOfWords === 0 || isNaN(func.numberOfWords)) {
						func.numberOfWords = 5
					}
				}
			}

			const lipsum = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(' ')
			let ret = ''
			
			// Tweak the number of words to be _around_ func.numberOfWords
			let numberOfWords = func.numberOfWords
			if ( func.spread ) {
				numberOfWords = random.get( numberOfWords*0.6, numberOfWords*1.25 )
			}

			// Output the lorem text. Capitalise the first letter.
			for ( let i=0; i<numberOfWords; i++ ) {
				if ( i > 0 ) {
					ret += ' '
				}
				ret += func.random ? lipsum[random.get(0,35)] : lipsum[i]
			}
			if ( func.capitalise && ret.length > 0 ) {
				ret = ret[0].toUpperCase() + ret.substring( 1 )
			}
			return ret
		}
	},

	/**
	 * Chooses a random entry from a variable's value which was defined as a comma-separated list for
	 * inclusion in the CSV.
	 * @oneof(foo) => A random entry from the list in $foo variable
	 */
	oneof: {
		params: "[variable]",
		short: "Selects a random entry from a variable's value which was defined as a comma-separated list",
		long: [
			'@oneof(foo) inserts a random entry from the list in $foo variable'
		],
			func: ( func ) => {
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
		}
	},

	/**
	 * Generates a random UUID for inclusion in the CSV. Takes no parameters, maintains no state!
	 */
	uuid: {
		params: "",
		short: "Generate a UUID",
		long: ["@uuid() produces a new random UUID"],
		func: ( func ) => {
			return self.crypto.randomUUID()
		}
	},
};
