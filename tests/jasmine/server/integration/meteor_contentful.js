'use strict';

describe('start()', function() {

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

describe('fetch()', function() {

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
		}).toThrow(new Meteor.Error(500, 'Cannot fetch this data from Contentful: another'));

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
			collected: function() {
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
		Meteor.wrapAsync(MeteorContentful.fetch('collected'));
		
		expect(Collections.updateToCollection).toHaveBeenCalled();
		/**
		 *	Cleanup and done
		 */
		MeteorContentful.client = false;
		done();
		
	});

});