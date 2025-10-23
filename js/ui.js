const ui = {
	/**
	 * Clears all textareas
	 */
	clearAll: () => {
		document.getElementById('rec').value = ''
		localStorage['csvhorse.recipe'] = ''
		
		ui.ratio = 30
		localStorage['csvhorse.ui_ratio'] = 30
		document.getElementById( 'input' ).style.right = 'calc(' + (100-ui.ratio) + 'vw + 1px)'
		document.getElementById( 'output' ).style.left = 'calc(' + ui.ratio + 'vw + 7px)'
		document.getElementById( 'gripper' ).style.left = 'calc(' + ui.ratio + 'vw)'
		
		recipe.execute()
	},

	/**
	 * Toggles wrapping on a text area
	 */
	wrap: ( ta ) => {
		document.getElementById(ta).classList.toggle( 'wrap' )
		document.getElementById(ta+'-wrap-button').classList.toggle( 'wrap' )

		if ( document.getElementById(ta).classList.contains( 'wrap' ) ) {
			localStorage['csvhorse.wrap-'+ta] = 'true'
		} else {
			localStorage.removeItem( 'csvhorse.wrap-'+ta )
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
	 * Shows an example based on the page source.
	 */
	example: () => {
		document.getElementById('rec').value = '// How big is the output?\n' +
		'rows 25\n' +
		'columns 6\n' +
		'\n' +
		'// Strings are included as is\n' +
		'hello world\n' +
		'\n' +
		'// Count in ones or twos\n' +
		'@count()\n' +
		'@count(step 2)\n' +
		'\n' +
		'// 5 random words of lorem ipsum\n' +
		'@lorem(5 random)\n' +
		'\n' +
		'// Date and time\n' +
		'@date()\n' +
		'@time()\n' +
		'\n' +
		'// This seventh column doesn\'t show because only six columns were requested at the top.\n' +
		'HIDDEN\n' +
		'\n' +
		'// Comments and blank lines are ignored. Try changing the recipe ... !\n'

		localStorage['csvhorse.recipe'] = document.getElementById('rec').value
		recipe.execute()
	},

	/**
	 * Restores the UI to its previous state invoking localstorage. Called once on page load.
	 */
	restoreState: () => {
		let recipeText = document.getElementById('rec')
		recipeText.value = localStorage['csvhorse.recipe'] !== undefined ? localStorage['csvhorse.recipe'] : ''
		recipeText.addEventListener( 'keydown', ui.cmdEnter )

		// 
		let varsText = document.getElementById('vars')
		varsText.value = localStorage['csvhorse.variables'] !== undefined ? localStorage['csvhorse.variables'] : ''
		varsText.addEventListener( 'keydown', ui.cmdEnter )

		// Set the size of the variables panel. 'vars-small' is the default.
		let size = localStorage['csvhorse.vars-size']
		if ( size !== undefined ) {
			document.getElementById( 'variables' ).classList.replace( 'vars-small', size )
		}

		// Re-establish the left and right for each pane
		if ( localStorage['csvhorse.ui_ratio'] ) {
			ui.ratio = localStorage['csvhorse.ui_ratio']
		} else {
			ui.ratio = 30
		}
		document.getElementById( 'input' ).style.right = 'calc(' + (100-ui.ratio) + 'vw + 1px)'
		document.getElementById( 'output' ).style.left = 'calc(' + ui.ratio + 'vw + 7px)'
		document.getElementById( 'gripper' ).style.left = 'calc(' + ui.ratio + 'vw)'

		// Are we doing dark mode?
		if ( localStorage.hasOwnProperty( 'csvhorse.dark' ) && localStorage['csvhorse.dark'] === 'true' ) {
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

		// Put a listener on the input textareas to store their contents in localstorage on a time-delay.
		let recipeTimerId = 0;
		recipeText.addEventListener("keyup", function(event) {
			clearTimeout(recipeTimerId);
			recipeTimerId = setTimeout( ui.storage, 750 );
		});
		let varsTimerId = 0;
		varsText.addEventListener("keyup", function(event) {
			clearTimeout(varsTimerId);
			varsTimerId = setTimeout( ui.storage, 750 );
		});
	},

	/**
	 * Store textarea inputs in localstorage for future use.
	 */
	storage: () => {
		localStorage['csvhorse.recipe'] = document.getElementById('rec').value
		localStorage['csvhorse.variables'] = document.getElementById('vars').value
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

		localStorage['csvhorse.dark'] = html.classList.contains('dark')
	},

	/**
	 * Switch up the size of the variables pane. 
	 */
	vars: ( size ) => {
		let div = document.getElementById('variables')
		div.setAttribute('class', size)
		localStorage['csvhorse.vars-size'] = size
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
	},

	buildHelp: () => {
		let elem = document.getElementById( 'help-directives')
		for (const [key, directive] of Object.entries(directives)) {
			// Command and parameters
			let p = document.createElement('p')
			p.classList.add( 'command' )
			p.innerHTML = `<strong>${key}</strong>\n`
			if ( directive['params'] !== undefined ) {
				p.insertAdjacentHTML( 'beforeend', ' <span class="params">' + directive['params'] + '</span>')
			}
			elem.appendChild( p )

			// Description.
			p = document.createElement('p')
			p.innerHTML = directive['long']
			elem.appendChild( p )			   
		}

		elem = document.getElementById( 'help-functions')
		for (const [key, func] of Object.entries(funcs)) {
			// Command and parameters
			let p = document.createElement('p')
			p.classList.add( 'command' )
			p.innerHTML = `<strong>@${key}(</strong>\n`
			if ( func['params'] !== undefined ) {
				p.insertAdjacentHTML( 'beforeend', ' <span class="params">' + func['params'] + '</span>')
			}
			p.insertAdjacentHTML( 'beforeend', ' <strong>)</strong>')
			elem.appendChild( p )

			// Description.
			p = document.createElement('p')
			p.innerHTML = func['short']
			elem.appendChild( p )			   

			if ( func['long'] ) {
				let ul = document.createElement('ul')
				elem.appendChild( ul )
				for ( let lng of func['long'] ) {
					let li = document.createElement('li')
					ul.appendChild( li )
					li.innerHTML = lng
				}
			}
		}
	},

	/**
	 * Starts a drag on the gripper between the two columns.
	 */
	dragStart: ( ev ) => {
		ev.preventDefault()
		
		document.onmousemove = ui.drag
		document.onmouseup = ui.endDrag
	},

	/**
	 * Called during a drag on the left gripper. Maintains the pane sizes.
	 */
	drag: ( ev ) => {
		ui.ratio = ( ev.clientX / window.innerWidth ) * 100
		
		// Constrain the new width to prevent any pane getting too small.
		ui.ratio = Math.max( 15, ui.ratio )
		ui.ratio = Math.min( ui.ratio, 85 )

		document.getElementById( 'input' ).style.right = 'calc(' + (100-ui.ratio) + 'vw + 1px)'
		document.getElementById( 'output' ).style.left = 'calc(' + ui.ratio + 'vw + 7px)'
		document.getElementById( 'gripper' ).style.left = 'calc(' + ui.ratio + 'vw)'
	},

	/**
	 * Called when any drag ends. Resets the state of everything.
	 */
	endDrag: ( ev ) => {
		document.onmouseup = null
		document.onmousemove = null
		localStorage['csvhorse.ui_ratio'] = ui.ratio
	},

	/**
	 * Listens for Cmd+Enter keypresses and executes the recipe.
	 */
	cmdEnter: ( ev ) => {
		if ( ev.metaKey && ev.keyCode === 13 ) {
			recipe.execute()
		}
	}
}