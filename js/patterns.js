const patterns = {
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
}
