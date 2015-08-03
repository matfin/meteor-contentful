'use strict';

Collections = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),

	/**
	 *	Collections
	 */
	contentTypes: null,
	assets: null,
	entries: null,
	images: null,

	init: function() {
		this.contentTypes = new Mongo.Collection('contentTypes');
		this.assets = new Mongo.Collection('assets');
		this.entries = new Mongo.Collection('entries');
		this.images = new Mongo.Collection('images');
	},

	/**	
	 *	Update collection depending on type
	 *	@param {String} collection - the name of the collection to update
	 *	@param {Object} selector - the selector to fetch what needs to be changed
	 *	@param {Object} modifier - object detailing how to modify what was selected by the selector
	 *	@return {Object} - Fiber delayed result returned when the update succeeded/failed
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
	 *	@param {String} collection - the collection to be updated
	 *	@param {Object} selector - Selector to choose the item to remove
	 *	@return {Object} node Fiber returned with details of the update operation
	 */
	removeFromCollection: function(collection, selector) {
		var collection = this[collection],
				current = this.Fiber.current,
				res;

		if(typeof collection === 'undefined') {
			throw new Meteor.Error(500, 'The collection: ' + collection + ' could not be found.');
		}
		collection.remove(selector, function() {
			current.run();
		});

		res = this.Fiber.yield();
		return res;
	}
};