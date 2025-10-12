const ui = {
	/**
	 * Copy the output text into the input.
	 */
	copyToInput: () => {
		let tout = document.getElementById('out')
		let tin = document.getElementById('src')
		tin.value = tout.value
		localStorage.src = tout.value
	},

	/**
	 * Clears all textareas
	 */
	clearAll: () => {
		document.getElementById('src').value = ''
		document.getElementById('rec').value = ''
		localStorage.src = document.getElementById('src').value
		localStorage.recipe = document.getElementById('rec').value
		recipe.execute()
	},

	/**
	 * Toggles wrapping on a text area
	 */
	wrap: ( ta ) => {
		document.getElementById(ta).classList.toggle( 'wrap' )
		document.getElementById(ta+'-wrap-button').classList.toggle( 'wrap' )

		if ( document.getElementById(ta).classList.contains( 'wrap' ) ) {
			localStorage['wrap-'+ta] = 'true'
		} else {
			localStorage.removeItem( 'wrap-'+ta )
		}
	},

	/**
	 * Toggles the slide-in tray so the user can access some help.
	 */
	help: () => {
		document.getElementById('lightbox').classList.toggle('show')
		
		// The tray starts with neither an open or closed class since this triggers an animation. First time
		// through simply set an open class on it. Subsequent goes can then toggle open and closed classes.
		let tray = document.getElementById('tray')
		if ( tray.classList.length === 0 ) {
			tray.classList.add('open')
		} else {
			tray.classList.toggle('closed')
			tray.classList.toggle('open')
		}

		// Finally, find every element was a tabIndex. These are either 'on' (0) or off ('-1') and we want to
		// toggle their states.
		let elems = document.querySelectorAll("[tabindex]");
		for ( let i = 0; i < elems.length; i++ ) {
			elems[i].tabIndex = -1 - elems[i].tabIndex;
		}
	},

	/**
	 * Switches the tab display between the passed-in options.
	 */
	tab: ( tdiv, tab ) => {
		// Grab all the lis and make the passed in tab the selected one.
		let ul = document.getElementById( tdiv+'-ul' )
		let lis = ul.children;
		for ( let i = 0; i < lis.length; i++ ) {
			let li = lis[i];
			li.classList.remove('selected')
		}
		document.getElementById( 'tab-'+tab ).classList.add('selected')

		// Hide all the tabs in the container
		let container = document.getElementById( tdiv )
		let divs = container.children;
		for ( let i = 0; i < divs.length; i++ ) {
			let div = divs[i];
			if ( div.classList.contains('tabs') ) {
				continue;
			}
			div.classList.add('hidden')
		}
		
		// Now make the tab page itself visible
		let selected = document.getElementById(tdiv+'-'+tab)
		selected.classList.remove('hidden')
		selected.scrollIntoView({ behavior: "smooth" })
	},

	/**
	 * Builds the help page programmatically.
	 */
	buildHelp: () => {
		// Programmatically populate from the JSON file of commands imported elsewhere. Draw it into this <div>
		let div = document.getElementById('_tray-commands')
		let ul = document.createElement('ul')
		div.replaceChildren(ul)

		// First the command list at the top ...
		for ( let cmd of command.commands ) {
			let li = document.createElement('li')
			ul.appendChild( li )
			let a = document.createElement('a')
			li.appendChild( a )
			a['tabIndex'] = '-1'
			a['title'] = cmd['desc']
			a['href'] = "#"
			a.setAttribute( 'onclick', "ui.showHelpCommand('" + cmd['command'] + "');" )
			a.innerHTML = '<strong>' + cmd['command'].replaceAll('<','&lt;') + '</strong>'

			let short = a.cloneNode(false)
			short.innerHTML = cmd['short']

			li.insertAdjacentHTML( 'beforeend', '<div class="help-desc">' + short.outerHTML + '</a></div>\n' );
		}

		// Then each command gets a longer description
		for ( let cmd of command.commands ) {
			// first a separator
			let hr = document.createElement('hr')
			div.appendChild( hr )

			// Command and parameters
			let p = document.createElement('p')
			p.classList.add( 'command' )
			p['id'] = cmd['command']
			p.innerHTML = '<strong>' + cmd['command'].replaceAll('<','&lt;') + '</strong>\n'
			if ( cmd['params'] !== undefined ) {
				p.insertAdjacentHTML( 'beforeend', ' <span class="params">' + cmd['params'] + '</span>')
			}
			div.appendChild( p )

			// Description.
			p = document.createElement('p')
			p.innerHTML = cmd['desc']
			div.appendChild( p )
			
			// Example is three panels in a <div>
			if ( cmd['input'] ) {
				let example = document.createElement('div')
				div.appendChild( example )
				example.classList.add( 'example' )

				for ( id of ['input','recipe','output'] ) {
					let subdiv = document.createElement('div')
					example.appendChild( subdiv )
					subdiv.innerHTML = id + '<pre>' + cmd[id].join('<br>') + '</pre>'
				}

				let a = document.createElement( 'a' )
				div.appendChild( a )
				a['title'] = 'Use example'
				a['href'] = "#"
				a.setAttribute( 'onclick', "ui.useExample('" + cmd.command + "');" )
				a['tabIndex'] = '-1'
				a.innerHTML = 'Run this example'
			}

			// Also is an array of related commands.
			if ( cmd['also'] !== undefined ) {
				p = document.createElement('p')
				p.classList.add( 'see-also' )
				p.innerHTML = 'See also ... '
				div.appendChild( p )

				let ul = document.createElement('ul')
				ul.classList.add( 'see-also' )
				div.appendChild( ul )

				for ( let also of cmd['also'] ) {
					let linkedCommand = command.find(also)
					if ( linkedCommand ) {
						let li = document.createElement( 'li' )
						ul.appendChild( li )

						let a = document.createElement( 'a' )
						li.appendChild( a )
						a['title'] = also
						a['href'] = "#"
						a.setAttribute( 'onclick', "ui.showHelpCommand('" + linkedCommand.command + "');" )
						a['tabIndex'] = '-1'
						a.innerHTML = also.replaceAll('<','&lt;')

						a = document.createElement( 'a' )
						li.appendChild( a )
						a['title'] = also
						a['href'] = "#"
						a.setAttribute( 'onclick', "ui.showHelpCommand('" + linkedCommand.command + "');" )
						a['tabIndex'] = '-1'
						a.innerHTML = linkedCommand.short
					} else {
						ul.insertAdjacentHTML( 'beforeend', '<li>NOT FOUND:' + also + '</li>' )
					}
				}			
			}
		}
	},

	/**
	 * Scrolls the viewport to show the passed in command in the help pane of the slide-in tray.
	 */
	showHelpCommand: ( cmd ) => {
		let elem = document.getElementById(cmd)
		elem.scrollIntoView({ behavior: "smooth" })
	},

	/**
	 * Shows an example based on the page source.
	 */
	example: () => {
		document.getElementById('src').value = 'The quick brown fox jumps over the lazy dog'
		document.getElementById('rec').value = '// The input pane on the left now shows a simple sentence. This central pane holds the recipe. The commands in here are executed to provide the output.\n' +
			'\n' +
			'// <-- Two slashes like this is a comment. Lines beginning with these (like this one) are ignored.\n' +
			'\n' +
			'|\nsort\ncap\nk<n 1\n' +
			'\n' +
			'// Above are the commands that make up the recipe. What does each command do ... ?\n' +
			'// | broke the text into words and put each word on a new line ...\n' +
			'// sort put the lines in alphabetical order ...\n' +
			'// cap capitalised the first letter of each line ...\n' +
			'// k<n 1 kept the first character in each line: k for keep, < for the beginning, n for number of characters ...\n\n' +
			'// The end result was an alphabetical list of the initial letters from the input sentence. You can change the recipe to see stringhorse in action. The recipe will run after a short pause and the output will appear in the right hand pane ...\n'

		localStorage.src = document.getElementById('src').value
		localStorage.recipe = document.getElementById('rec').value
		recipe.execute()
	},

	/**
	 * Resets the stringhorse UI with the passed in example from the help.
	 */
	useExample: ( name ) => {
		let cmd = command.find( name )

		document.getElementById('src').value = cmd['input'].join('\n')
		document.getElementById('rec').value = cmd['recipe'].join('\n').replaceAll('&lt;','<')
		localStorage.src = document.getElementById('src').value
		localStorage.recipe = document.getElementById('rec').value

		// Calling help() closes the tray
		ui.help()
		recipe.execute()
	},

	/**
	 * Restores the UI to its previous state invoking localstorage. Called once on page load.
	 */
	restoreState: () => {
		let recipeText = document.getElementById('rec')
		
		// 
		let varsText = document.getElementById('vars')
		varsText.value = localStorage.variables !== undefined ? localStorage.variables : ''

		// Set the size of the variables panel. 'vars-small' is the default.
		let size = localStorage['vars-size']
		if ( size !== undefined ) {
			document.getElementById( 'variables' ).classList.replace( 'vars-small', size )
		}

		// Restore the input text and recipe from localStorage.
		if ( localStorage.recipe === undefined ) {
			recipeText.value = localStorage.recipe !== undefined ? localStorage.recipe : ''
			recipe.execute()
		}

		// Put listeners on the original and recipe textareas to do stuff on a time-delayed keypress.
		let recipeTimerId = 0;
		recipeText.addEventListener("keyup", function(event) {
			clearTimeout(recipeTimerId);
			recipeTimerId = setTimeout( recipe.execute, 750 );
		});

		let varsTimerId = 0;
		varsText.addEventListener("keyup", function(event) {
			clearTimeout(varsTimerId);
			varsTimerId = setTimeout( recipe.execute, 750 );
		});

		// Re-establish the left and right for each pane
		let ids = [ 'input','output','gripper' ]
		for ( let id of ids ) {
			let elem = document.getElementById( id )
			let left = localStorage['csvhorse.'+id+'_left']
			if ( left ) {
				elem.style.left = left
			}
			let right = localStorage['csvhorse.'+id+'_right']
			if ( right ) {
				elem.style.right = right
			}
		}

		// Are we doing dark mode?
		if ( localStorage.hasOwnProperty( 'dark' ) && localStorage['dark'] === 'true' ) {
			let html = document.getElementById('html')
			html.classList.add('dark')
		}

		// Add an escape listener for the slide-in tray.
		document.addEventListener( 'keydown', (event) => {
			if ( tray.classList.contains( 'closed' ) ) {
				return
			}
			if ( event.key === 'Escape' ) {
				ui.help()
			}
		})
	},

	/**
	 * Applies default tabindex values to elements in the DOM.
	 */
	fixTabIndex: () => {
		let elems = document.querySelectorAll("header a, section#ui a, section#ui textarea");
		for ( let i = 0; i < elems.length; i++ ) {
			elems[i].tabIndex = 0;
		}	

		elems = document.querySelectorAll("section#tray a");
		for ( let i = 0; i < elems.length; i++ ) {
			elems[i].tabIndex = -1;
		}	
	},

	/**
	 * Toggles dark mode
	 */
	dark: () => {
		let html = document.getElementById('html')
		html.classList.toggle('dark')

		localStorage['dark'] = html.classList.contains('dark')
	},

	/**
	 * Switch up the size of the variables pane. 
	 */
	vars: ( size ) => {
		let div = document.getElementById('variables')
		div.setAttribute('class', size)
		localStorage['vars-size'] = size
	},

	/**
	 * Initialise the UI. To be called once at point of page load.
	 */
	init: () => {
		ui.buildHelp()
		ui.restoreState()
		ui.fixTabIndex()

		// Put the version string into any elements with a version class.
		let versions = document.getElementsByClassName( 'version' )
		for ( let version of versions ) {
			version.innerHTML = recipe.version
		}

		// Put the current year into any elements with a year class (copyright notices and stuff)
		let years = document.getElementsByClassName( 'year' )
		for ( let year of years ) {
			year.innerHTML = new Date().getFullYear()
		}

		addEventListener("resize", (event) => { ui.windowResized( event )})
	},

	/**
	 * Starts a drag on the gripper between the two columns.
	 */
	dragStart: ( ev ) => {
		ev.preventDefault()
		
		ui.dragLeftElem = document.getElementById('input')
		ui.dragRightElem = document.getElementById('output')
		ui.dragGripElem = document.getElementById('gripper')
		ui.limit = window.innerWidth - ui.dragLeftElem.getBoundingClientRect().left

		document.onmousemove = ui.drag
		document.onmouseup = ui.endDrag
	},

	/**
	 * Called during a drag on the left gripper. Maintains the pane sizes.
	 */
	drag: ( ev ) => {
		let width = window.innerWidth - ev.clientX
		
		// Constrain the new width to prevent any pane getting too small.
		width = Math.max( 320, width )
		width = Math.min( width, ui.limit - 176 )

		ui.dragLeftElem.style.right = (width+5) + 'px'
		ui.dragRightElem.style.left = (window.innerWidth-width+3) + 'px'
		ui.dragGripElem.style.left = (window.innerWidth-width-4) + 'px'
	},

	/**
	 * Called when any drag ends. Resets the state of everything.
	 */
	endDrag: ( ev ) => {
		document.onmouseup = null
		document.onmousemove = null

		let ids = [ 'input','output','gripper' ]
		for ( let id of ids ) {
			let elem = document.getElementById( id )
			localStorage['csvhorse.'+id+'_left'] = elem.style.left
			localStorage['csvhorse.'+id+'_right'] = elem.style.right
		}
	},

	/**
	 * Called when the window is resized. Obliterates all the manual sizing styles so
	 * the layout falls back to the CSS which is width %ages.
	 */
	windowResized: ( ev ) => {
		let ids = [ 'input','output','gripper' ]
		for ( let id of ids ) {
			let elem = document.getElementById( id )
			elem.style.left = ''
			elem.style.right = ''
			localStorage['csvhorse.'+id+'_left'] = elem.style.left
			localStorage['csvhorse.'+id+'_right'] = elem.style.right
		}
	}
}