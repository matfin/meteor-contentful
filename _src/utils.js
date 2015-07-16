/**
 *	Class for generic helper functions
 *	
 *	@class Utuls
 *	@static
 */
Utils = {
	/**
	 *	Function to check deply nested objects to see if they 
	 *	exist.
	 *
	 *	@method 	checkNested()
	 *	@param		{Object} - 	the main object containing nested items
	 *	@param		{String} - 	optional string parameters referencing the nested objects
	 *	@return		{Boolean} - true if the nested objects exist, or false if any one of
	 *							them is undefined
	 *
	 */
	checkNested: function(obj) {
		var args = Array.prototype.slice.call(arguments),
			obj = args.shift();

		for(var i = 0; i < args.length; i++) {
			if(!obj || !obj.hasOwnProperty(args[i])) {
				return false;
			}
			obj = obj[args[i]];
		}
		return true;
	},

	/**
	 *	Function to remap incoming fields and reduce to a single nested
	 *	object key pair
	 *
	 *	@method 	flattenObjects()
	 *	@param 		{Object} - 	an array of objects containing fields 
	 *							with deeply nested key value pairs ie:
	 *							{date: {'en-IE': '2015-05-01'}}
	 *
	 *	@param 		{String} - 	A selector to dig the nested value out.
	 *	
	 *	@return 	{Object} - 	Less deeply nested fields ie:
	 *							{date: '2015-05-01'} 
	 */
	flattenObjects: function(fields, selector) {
		
		var filtered = {};
		_.each(fields, function(field, key) {
			/**
			 *	Discard null or undefined values
			 */
			if(field[selector] !== null) {
				filtered[key] = field[selector];
			}
		});
		return filtered;
	}

};