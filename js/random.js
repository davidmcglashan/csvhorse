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
