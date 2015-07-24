'use strict';

Collections = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),

	/**
	 *	Collections
	 */
	contentTypes: new Mongo.Collection('contentTypes'),
	assets: new Mongo.Collection('assets'),
	entries: new Mongo.Collection('entries'),

	/**	
	 *	Update collection depending on type
	 */
	updateToCollection: function(collection, item) {
		var collection = this[collection],
				current = this.Fiber.current,
				result;

		if(typeof collection === 'undefined') {
			throw {
				type: 'error',
				message: 'Could not find the collection named ' + collection
			};
		}

		collection.update({'sys.id': item.sys.id}, item, {upsert: true}, function() {
			current.run();
		});

		var res = this.Fiber.yield();
		return res;
	}

}