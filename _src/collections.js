'use strict';

Collections = {

	/**
	 *	Node dependencies
	 */
	Future: Npm.require('fibers/future'),

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
	 *	@param {String} collection_name - the name of the collection to update
	 *	@param {Object} selector - the selector to fetch what needs to be changed
	 *	@param {Object} modifier - object detailing how to modify what was selected by the selector
	 *	@return {Object} - Node Fiber future that returns only when finished
	 */
	updateToCollection: function(collection_name, selector, modifier) {
		var collection = this[collection_name],
				future = new this.Future();

		if(typeof collection === 'undefined') {
			throw new Meteor.Error('The collection: ' + collection_name + ' could not be found.');
		}
		collection.update(selector, modifier, {upsert: true}, function(err, result) {
			future.return({error: err, result: result});
		});	
		
		return future.wait();
	},

	/**
	 *	Remove an item from the collection
	 *	@param {String} collection - the collection to be updated
	 *	@param {Object} selector - Selector to choose the item to remove
	 *	@return {Object} Node Fiber future that returns only when finished
	 */
	removeFromCollection: function(collection, selector) {
		var collection = this[collection],
				future = new this.Future();

		if(typeof collection === 'undefined') {
			throw new Meteor.Error(500, 'The collection: ' + collection + ' could not be found.');
		}
		collection.remove(selector, function() {
			future.return();
		});

		return future.wait();
	}
};