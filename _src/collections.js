'use strict';

Collections = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),

	/**
	 *	Collections
	 */
	contentTypes: new Mongo.Collection('CFContentTypes'),
	assets: new Mongo.Collection('CFAssets'),
	entries: new Mongo.Collection('CFEntries'),

	/**	
	 *	Update collection depending on type
	 */
	updateToCollection: function(collection, item) {
		var collection = this[collection],
				fiber = this.Fiber.current,
				result;

		if(typeof collection === 'undefined') {
			throw {
				type: 'error',
				message: 'Could not find the collection named ' + collection
			};
		}
		collection.update({'sys.id': item.sys.id}, item, {upsert: true}, function() {
			fiber.run('Update successful');
		});
	
		var res = this.Fiber.yield();
		return res;
	}

}