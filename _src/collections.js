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
	images: new Mongo.Collection('images'),

	/**	
	 *	Update collection depending on type
	 */
	updateToCollection: function(collection, selector, modifier) {
		var collection = this[collection],
				current = this.Fiber.current,
				result;

		if(typeof collection === 'undefined') {
			throw new Meteor.Error(500, 'The collection: ' + collection + ' could not be found.');
		}

		collection.update(selector, modifier, {upsert: true}, function(err, res) {
			current.run({error: err, result: result});
		});

		result = this.Fiber.yield();
		return result;
	},

	/**
	 *	Remove an item from the collection
	 */
	removeFromCollection: function(collection, item) {
		var collection = this[collection],
				current = this.Fiber.current,
				res;

		if(typeof collection === 'undefined') {
			throw new Meteor.Error(500, 'The collection: ' + collection + ' could not be found.');
		}
		collection.remove({'sys.id': item.sys.id}, function() {
			current.run();
		});

		res = this.Fiber.yield();
		return res;
	}
};