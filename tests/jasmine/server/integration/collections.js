'use strict';

describe('init()', function() {
	it('should set up the collections', function(done) {

		/**
		 *	Before init() the collections should be null
		 */
		expect(Collections.contentTypes).toBe(null);
		expect(Collections.assets).toBe(null);
		expect(Collections.entries).toBe(null);
		expect(Collections.images).toBe(null);

		/**
		 *	Call init()
		 */
		Collections.init();

		/**
		 *	Test: Now they should be instances of Mongo.Collection
		 */
		expect(Collections.contentTypes instanceof Mongo.Collection).toBe(true);
		expect(Collections.assets instanceof Mongo.Collection).toBe(true);
		expect(Collections.entries instanceof Mongo.Collection).toBe(true);
		expect(Collections.images instanceof Mongo.Collection).toBe(true);

		done();
	});
});

describe('updateToCollection()', function() {
	it('should throw a Meteor error if the collection cannot be found given the name', function(done) {
		/**
		 *	Call updateToCollections() with params
		 */
		expect(function() {
			Collections.updateToCollection('invalid-collection', {}, {x: 'y'});
		}).toThrow();

		done();
	});

	it('should return a number and no error when run', function(done) {

		/**
		 *	Call the function
		 */
		var run = Collections.updateToCollection('entries', {id: 1}, {id: 1, item: 'An Item'});
		
		/**
		 *	Should have no error and return 1 as the number of documents affected
		 */
		expect(run.error).toBeNull();
		expect(run.result).toEqual(1);

		/**
		 *	Cleanup and done
		 */
		Collections.entries.remove({});
		done();
	});

	it('should have the correct number of documents given modifiers and selectors', function(done) {

		var item = {id: 10, an: 'Item', to: 'Insert'},
				updated = {id: 10, an: 'Item', to: 'Update'},
				newItem = {id: 11, an: 'Item', to: 'Add as new'};

		/** 
		 *	Running this should add one document to the collection
		 */
		Collections.updateToCollection('entries', {id: item.id}, item);
		expect(Collections.entries.find({}).count()).toEqual(1);

		/**
		 *	Running with the same selector and a different modifier 
		 *	should still result in one item inside the collection
		 */
		Collections.updateToCollection('entries', {id: updated.id}, updated);
		expect(Collections.entries.find({}).count()).toEqual(1);

		/**
		 *	Running with a different selector and modifier should
		 *	result in two documents being inside the collection
		 */
		Collections.updateToCollection('entries', {id: newItem.id}, newItem);
		expect(Collections.entries.find({}).count()).toEqual(2);

		/**
		 *	Cleanup and done
		 */
		Collections.entries.remove({});
		done();
	});

});

describe('removeFromCollection()', function() {
	it('should throw and error when attempting to remove from a collection that does not exist given a name', function(done) {
		/**
		 *	Call the function with an invalid collection name
		 */
		expect(function() {
			Collections.removeFromCollection('another-invalid-collection', {id: 1});
		}).toThrow();

		done();
	});
});
