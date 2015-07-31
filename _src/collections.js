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
	updateToCollection: function(collection, item) {
		var collection = this[collection],
				current = this.Fiber.current,
				now = new Date().getTime(),
				selector = {'sys\uff0eid': item.sys.id},
				modifier = {$setOnInsert: {fetchedAt: now}, $set: {refreshedAt: now, fields: item.fields, sys: item.sys}},
				res;

		if(typeof collection === 'undefined') {
			throw {
				type: 'error',
				message: 'Could not find the collection named ' + collection
			};
		}

		collection.update(selector, modifier, {upsert: true}, function(err, res) {
			console.log(err, res);
			current.run({error: err, result: res});
		});

		res = this.Fiber.yield();
		return res;
	},

	/**
	 *	Remove an item from the collection
	 */
	removeFromCollection: function(collection, item) {
		var collection = this[collection],
				current = this.Fiber.current,
				res;

		if(typeof collection === 'undefined') {
			throw {
				type: 'error',
				message: 'Could not find the collection named ' + collection
			};
		}
		collection.remove({'sys.id': item.sys.id}, function() {
			current.run();
		});

		res = this.Fiber.yield();
		return res;
	}
};