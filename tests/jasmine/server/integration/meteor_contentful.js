'use strict';

describe('MeteorContentful', function() {

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

		it('should call the Contentful fetching functions with the correct limit if one has been defined', function(done) {
			/**
			 *	Spies
			 */
			spyOn(MeteorContentful, 'Future').and.returnValue({
				wait: function(){},
				return: function(){} 
			});
			/**
			 *	Stubs
			 */
			MeteorContentful.client = {
				assets: function(limit) {
					expect(limit).toEqual({limit: 33});
					return {
						then: function() {}
					};
				},
				entries: function(limit) {
					expect(limit).toEqual({limit: 33});
					return {
						then: function() {}
					};
				},
				contentTypes: function(limit) {
					expect(limit).toEqual({limit: 33});
					return {
						then: function() {}
					};
				}
			};

			/**
			 *	Set an arbitary limit and then call the function and run the tests
			 */
			MeteorContentful.settings.limit = 33;
			MeteorContentful.fetch('assets');
			MeteorContentful.fetch('entries');
			MeteorContentful.fetch('contentTypes');

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.settings.limit = undefined;
			MeteorContentful.client = false;
			done();
		});

		it('should call the Contentful fetching functions with the default limit of 100 if a limit has not been defined', function(done) {
			/**
			 *	Spies
			 */
			spyOn(MeteorContentful, 'Future').and.returnValue({
				wait: function(){},
				return: function(){} 
			});
			/**
			 *	Stubs
			 */
			MeteorContentful.client = {
				assets: function(limit) {
					expect(limit).toEqual({limit: 100});
					return {
						then: function() {}
					};
				},
				entries: function(limit) {
					expect(limit).toEqual({limit: 100});
					return {
						then: function() {}
					};
				},
				contentTypes: function(limit) {
					expect(limit).toEqual({limit: 100});
					return {
						then: function() {}
					};
				}
			};

			/**
			 *	Set an arbitary limit and then call the function and run the tests
			 */
			MeteorContentful.fetch('assets');
			MeteorContentful.fetch('entries');
			MeteorContentful.fetch('contentTypes');

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.settings.limit = undefined;
			MeteorContentful.client = false;
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

	describe('remappedUpdate()', function() {

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

	describe('authenticateCallback()', function() {

		it('should return true if the authorisation header matches', function(done) {

			/**
			 *	Setting up
			 */
			MeteorContentful.settings = {
				callbackToken: '12345'
			};

			/**
			 *	Run the function and the test
			 */
			var authenticated = MeteorContentful.authenticateCallback({
				headers: {
					authorization: 'Basic 12345'
				}
			});
			expect(authenticated).toEqual(true);

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.settings = false;
			done();
		});

		it('should return false if the authorisation header does not match', function(done) {

			/**
			 *	Setting up
			 */
			MeteorContentful.settings = {
				callbackToken: '12345'
			};

			/**
			 *	Run the function and the test
			 */
			var authenticated = MeteorContentful.authenticateCallback({
				headers: {
					authorization: 'Basic Wrong'
				}
			});
			expect(authenticated).toEqual(false);

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.settings = false;
			done();
		});

	});

	describe('listen()', function() {

		it('should throw an error if MeteorContentful.start() has not been run', function(done) {
			/**
			 *	Run the function
			 */
			expect(function() {
				MeteorContentful.listen();
			}).toThrow(new Meteor.Error(500, 'MeteorContentful needs to be started first - call MeteorContentful.start()'));
			done();
		});

		it('should update the entries collection given a header of ContentManagement.Entry.publish', function(done) {

			/**	
			 *	Stubs
			 */
			MeteorContentful.client = {};
			MeteorContentful.settings = {
				callbackPort: 12345,
				callbackToken: '12345'
			};

			/**
			 *	Spies
			 */
			spyOn(Npm, 'require').and.callFake(function(lib) {
				switch(lib) {
					case 'express': 
						return function() {
							return {
								use: function(which){},
								listen: function(){},
								post: function(hook, callback) {
									var req = {
										headers: {
											'x-contentful-topic': 'ContentManagement.Entry.publish',
											'authorization': 'Basic 12345'
										},
										body: {
											sys: {
												id: 1
											},
											fields: {}
										}
									},
									res = {
										status: function(stat) {
											return {
												end: function(){}
											};
										}
									};
									callback(req, res);
								}
							};
						};
						break;
					case 'body-parser':
						return {
							json: function(){}
						};
						break;
				}
			});

			/**
			 *	Stub this for now, we are not testing the remapping function.
			 */
			spyOn(MeteorContentful, 'remappedUpdate').and.callFake(function(item) {
				return item;
			});		

			/**
			 *	Run the tests from within the spy
			 */
			spyOn(Collections, 'updateToCollection').and.callFake(function(collection, selector, modifier) {
				expect(collection).toEqual('entries');
				expect(selector).toEqual({'sys\uff0eid': 1});
				expect(modifier).toEqual({ $setOnInsert: { fetchedAt: jasmine.any(Number) }, $set: { refreshedAt: jasmine.any(Number), fields: {}, sys: { id: 1 } } });
			});

			/**
			 *	Run the function
			 */
			MeteorContentful.listen();

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.client = false;
			MeteorContentful.settings = false;
			done();
		});

		it('should update the assets collection given a header of ContentManagement.Asset.publish', function(done) {

			/**	
			 *	Stubs
			 */
			MeteorContentful.client = {};
			MeteorContentful.settings = {
				callbackPort: 12345,
				callbackToken: '12345'
			};

			/**
			 *	Spies
			 */
			spyOn(Npm, 'require').and.callFake(function(lib) {
				switch(lib) {
					case 'express': 
						return function() {
							return {
								use: function(which){},
								listen: function(){},
								post: function(hook, callback) {
									var req = {
										headers: {
											'x-contentful-topic': 'ContentManagement.Asset.publish',
											'authorization': 'Basic 12345'
										},
										body: {
											sys: {
												id: 1
											},
											fields: {}
										}
									},
									res = {
										status: function(stat) {
											return {
												end: function(){}
											};
										}
									};
									callback(req, res);
								}
							};
						};
						break;
					case 'body-parser':
						return {
							json: function(){}
						};
						break;
				}
			});

			/**
			 *	Stub this for now, we are not testing the remapping function.
			 */
			spyOn(MeteorContentful, 'remappedUpdate').and.callFake(function(item) {
				return item;
			});		

			/**
			 *	Run the tests from within the spy
			 */
			spyOn(Collections, 'updateToCollection').and.callFake(function(collection, selector, modifier) {
				expect(collection).toEqual('assets');
				expect(selector).toEqual({'sys\uff0eid': 1});
				expect(modifier).toEqual({ $setOnInsert: { fetchedAt: jasmine.any(Number) }, $set: { refreshedAt: jasmine.any(Number), fields: {}, sys: { id: 1 } } });
			});

			/**
			 *	Run the function
			 */
			MeteorContentful.listen();

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.client = false;
			MeteorContentful.settings = false;
			done();
		});

		it('should remove from the entries collection given a header of ContentManagement.Entry.unpublish', function(done) {

			/**	
			 *	Stubs
			 */
			MeteorContentful.client = {};
			MeteorContentful.settings = {
				callbackPort: 12345,
				callbackToken: '12345'
			};

			/**
			 *	Spies
			 */
			spyOn(Npm, 'require').and.callFake(function(lib) {
				switch(lib) {
					case 'express': 
						return function() {
							return {
								use: function(which){},
								listen: function(){},
								post: function(hook, callback) {
									var req = {
										headers: {
											'x-contentful-topic': 'ContentManagement.Entry.unpublish',
											'authorization': 'Basic 12345'
										},
										body: {
											sys: {
												id: 1
											},
											fields: {}
										}
									},
									res = {
										status: function(stat) {
											return {
												end: function(){}
											};
										}
									};
									callback(req, res);
								}
							};
						};
						break;
					case 'body-parser':
						return {
							json: function(){}
						};
						break;
				}
			});

			/**
			 *	Run the tests from within the spy
			 */
			spyOn(Collections, 'removeFromCollection').and.callFake(function(collection, selector) {
				expect(collection).toEqual('entries');
				expect(selector).toEqual({'sys\uff0eid': 1});
			});

			/**
			 *	Run the function
			 */
			MeteorContentful.listen();

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.client = false;
			MeteorContentful.settings = false;
			done();
		});

		it('should remove from the assets collection given a header of ContentManagement.Asset.unpublish', function(done) {

			/**	
			 *	Stubs
			 */
			MeteorContentful.client = {};
			MeteorContentful.settings = {
				callbackPort: 12345,
				callbackToken: '12345'
			};

			/**
			 *	Spies
			 */
			spyOn(Npm, 'require').and.callFake(function(lib) {
				switch(lib) {
					case 'express': 
						return function() {
							return {
								use: function(which){},
								listen: function(){},
								post: function(hook, callback) {
									var req = {
										headers: {
											'x-contentful-topic': 'ContentManagement.Asset.unpublish',
											'authorization': 'Basic 12345'
										},
										body: {
											sys: {
												id: 1
											},
											fields: {}
										}
									},
									res = {
										status: function(stat) {
											return {
												end: function(){}
											};
										}
									};
									callback(req, res);
								}
							};
						};
						break;
					case 'body-parser':
						return {
							json: function(){}
						};
						break;
				}
			});

			/**
			 *	Run the tests from within the spy
			 */
			spyOn(Collections, 'removeFromCollection').and.callFake(function(collection, selector) {
				expect(collection).toEqual('assets');
				expect(selector).toEqual({'sys\uff0eid': 1});
			});

			/**
			 *	Run the function
			 */
			MeteorContentful.listen();

			/**
			 *	Cleanup and done
			 */
			MeteorContentful.client = false;
			MeteorContentful.settings = false;
			done();
		});
	});
});