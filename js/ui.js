const ui = {
	/**
	 * Clears all textareas
	 */
	clearAll: () => {
		document.getElementById('rec').value = ''
		localStorage['csvhorse.recipe'] = ''
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