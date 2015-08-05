'use strict';

describe('MeteorContentful - start()', function() {

	it('should throw if the settings do not exist', function(done) {
		expect(function() {
			MeteorContentful.start();
		}).toThrow();
		done();
	});

	it('should call the createClient() function and Collections init()', function(done) {

		/**
		 *	Stubs
		 */
		Collections.initBackup = Collections.init;
		Collections.init = function(){};

		/**
		 *	Setting up
		 */
		MeteorContentful.settings = {
			space: '12345',
			accessToken: '12345',
			host: 'http://cdn.contentful.com'
		};

		/**
		 *	Spy
		 */
		spyOn(MeteorContentful.Contentful, 'createClient');
		spyOn(Collections, 'init');

		/**
		 *	Test
		 */
		MeteorContentful.start();
		expect(MeteorContentful.Contentful.createClient).toHaveBeenCalledWith({
			space: '12345',
			accessToken: '12345',
			secure: true,
			host: 'http://cdn.contentful.com'
		});
		expect(Collections.init).toHaveBeenCalled();

		/**
		 *	Cleanup and done
		 */
		delete Meteor.settings;
		Collections.init = Collections.initBackup;
		MeteorContentful.client = false;
		done();

	});
});

describe('MeteorContentful - fetch()', function() {

	it('should throw an error if fetch is called without a client', function(done) {
		expect(function() {
			MeteorContentful.fetch('something');
		}).toThrow(new Meteor.Error(500, 'Contentful client not started. Did you forget to call MeteorContentful.start() ?'));
		done();
	});

	it('should throw an error if a client method that does not exist is passed', function(done) {

		/**
		 *	Stubs
		 */
		MeteorContentful.client = {
			test: function() {},
			another: function() {}
		};

		/**
		 *	Run the function
		 */
		expect(function() {
			MeteorContentful.fetch('missing');
		}).toThrow(new Meteor.Error(500, 'Contentful does not support this function: missing'));
		
		/**
		 *	Cleanup and done
		 */
		MeteorContentful.client = false;
		done();
	});

	it('should throw if there was an error fetching the data using the client', function(done) {
		/**
		 *	Stubs
		 */
		MeteorContentful.client = {
			another: function() {
				return {
					then: function(cb) {
						cb(null, {error: 'yes'});
					}
				}
			}
		};
	
		/**
		 *	Run the function
		 */
		expect(function() {
			MeteorContentful.fetch('another');
		}).toThrow(new Meteor.Error(500, 'Failed to bind environment when fetching Contentful data: Error fetching data from Contentful in attempting to call another'));

		/**
		 *	Cleanup and done
		 */
		MeteorContentful.client = false;
		done();
	});

	it('should call Collections.updateToCollection with the correct parameters', function(done) {
		/**
		 *	Stubs
		 */
		MeteorContentful.client = {
			entries: function() {
				return {
					then: function(cb) {
						cb([
							{sys: {id: 1}, fields: {x: 1, y: 2}}
						]);
					}
				}
			}
		};
		/**
		 *	Spies
		 */
		spyOn(Collections, 'updateToCollection');

		/**
		 *	Run the function and test
		 */
		Meteor.wrapAsync(MeteorContentful.fetch('entries'));
		
		expect(Collections.updateToCollection).toHaveBeenCalledWith('entries', jasmine.any(Object), jasmine.any(Object));
		/**
		 *	Cleanup and done
		 */
		Collections.entries.remove({});
		MeteorContentful.client = false;
		done();
	});

});

describe('MeteorContentful - remappedUpdate()', function() {

	it('should return an item passed in as an argument if that item is not an object', function(done) {

		/**
	 	 *	Run the function passing in a Number
		 */
		var item = MeteorContentful.remappedUpdate(1);
		expect(item).toEqual(1);
		item = MeteorContentful.remappedUpdate('A string');
		expect(item).toEqual('A string');
		item = MeteorContentful.remappedUpdate(null);
		expect(item).toBeNull();
		item = MeteorContentful.remappedUpdate();
		expect(item).toBeUndefined();
		done();

	});

	it('should correctly flatten an incoming object with nested fields', function(done) {

		/**
		 *	Two dummy objects
		 */
		var unmapped = {
			fields: {
				name: {
					'en-US': 'Wardrobe'
				},
				age: {
					'en-US': 33
				},
				other: {
					'en-US': 'Another'
				}
			}
		},

		check = {
			fields: {
				name: 'Wardrobe',
				age: 33,
				other: 'Another'
			}
		},
		mapped;

		/**
		 * Run the function and the test
	 	 */
		mapped = MeteorContentful.remappedUpdate(unmapped);
		expect(mapped).toEqual(check);

		done();
	});

});

