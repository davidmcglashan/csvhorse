const patterns = {
	/**
	 * Turns the passed-in pattern into a string following the stringhorse rules.
	 */
	convertString: ( pattern ) => {
		let str = ''

		for ( let i=0; i < pattern.length; i++ ) {
			let chr = pattern[i]
			

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


		return str
	},
}
