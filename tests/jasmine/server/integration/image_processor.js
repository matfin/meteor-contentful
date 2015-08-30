'use strict';

describe('ImageProcessor', function() {

	describe('run()', function() {

		it('should return immediately if the ImageProcessor queue length is 0 (it is empty)', function(done) {
			expect(ImageProcessor.run()).toBeUndefined();
			done();
		});

		it('should return immediately if the ImageProcessor queue has jobs but is already running', function(done) {
			/**
			 *	Add some jobs to the queue
			 */
			ImageProcessor.queue.push({a: 'job'});
			ImageProcessor.isrunning = true;
			expect(ImageProcessor.run()).toBeUndefined();
			/** 
			 *	Cleanup and done
			 */
			ImageProcessor.queue = [];
			ImageProcessor.isrunning = false;
			done();
		});

		it('should call the generate() function 4 times and remove() fucntion 3 times and then have an empty queue after.', function(done) {

			/**
			 *	Spies
			 */
			spyOn(ImageProcessor, 'generate').and.callFake(function(job){
				expect(job).toEqual({task: 'create'});
			});
			spyOn(ImageProcessor, 'remove').and.callFake(function(job){
				expect(job).toEqual({task: 'delete'});
			});

			/**
			 *	Adding the four jobs
			 */
			ImageProcessor.queue = [
				{task: 'create'},
				{task: 'create'},
				{task: 'create'},
				{task: 'create'},
				{task: 'delete'},
				{task: 'delete'},
				{task: 'delete'},
			];

			/**	
			 *	Running the function and calling the tests
			 */
			ImageProcessor.run();
			expect(ImageProcessor.generate.calls.count()).toEqual(4);
			expect(ImageProcessor.remove.calls.count()).toEqual(3);
			expect(ImageProcessor.queue.length).toEqual(0);

			done();
		});
	});

	describe('remove()', function() {

		it('should filter the correct files for deletion given an asset id then remove them along with their references inside the images collectionn', function(done) {

			/**
			 *	Spies with tests
			 */
			spyOn(ImageProcessor.fs, 'readdirSync').and.callFake(function() {
				return ['1234-desktop.jpg', '1234-tablet.jpg', '1234-mobile.jpg', '4567-desktop.jpg', '4567-laptop.jpg', '4567-mobile.jpg'];
			});

			spyOn(ImageProcessor.fs, 'unlink').and.callFake(function(path, callback) {
				expect(path).toContain('/some/path/1234');
				expect(path).not.toContain('/some/path/4567');
				callback();
			});

			spyOn(Collections, 'removeFromCollection').and.callFake(function(collection_name, selector) {
				expect(collection_name).toEqual('images');
				expect(selector).toEqual({asset_id: '1234'});
			});

			/**
			 *	Setting up
			 */
			ImageProcessor.settings = {
				directory: '/some/path'
			};
			var job = {
				asset: {
					sys: {
						id: '1234'
					}
				}
			};

			/**
			 *	Run the function
			 */
			ImageProcessor.remove(job);
			expect(ImageProcessor.fs.unlink.calls.count()).toEqual(3);
			expect(Collections.removeFromCollection.calls.count()).toEqual(1);

			/**
			 *	Cleanup and done
			 */
			ImageProcessor.settings.directory = false;
			done();
		});
	});

	describe('generate()', function() {

		it('should call the request function and outputs function with the correct parameters', function(done) {

			/**
			 *	Spies
			 */
			spyOn(ImageProcessor, 'request').and.callFake(function(url, callback) {
				expect(url).toEqual({url: 'http://somewhere/image.jpg', encoding: null});
				expect(callback).toEqual(jasmine.any(Function));
			});
			spyOn(ImageProcessor, 'outputs').and.callFake(function(asset, category) {
				expect(asset).toEqual({fields: {file: {url: '//somewhere/image.jpg'}, description: 'logo'}});
				expect(category).toEqual({filetype: 'jpg', background: '#eee'});
			});
			spyOn(ImageProcessor, 'Future').and.callFake(function() {
				return {
					wait: function(){},
					return: function(){}
				}
			});

			/**
			 *	Setting up
			 */
			var job = {
				asset: {
					fields: {
						file: {
							url: '//somewhere/image.jpg'
						},
						description: 'logo'
					}
				}
			};
			ImageProcessor.settings = {
				categories: {
					logo: {
						filetype: 'jpg',
						background: '#eee'
					}
				}
			};

			/**
			 *	Run the function
			 */
			ImageProcessor.generate(job);

			/**
			 *	Cleanup and done
			 */
			ImageProcessor.settings = false;
			done();
		});

		it('should call future.wait(), then call the save function a number of times equal to the size of the job queue, then call future.return()', function(done) {

			var futureWaitCalls = 0,
					futureReturnCalls = 0;

			/** 
			 *	Spies
			 */
			spyOn(ImageProcessor, 'Future').and.callFake(function() {
				return {
					return: function(){
						futureWaitCalls++;
					},
					wait: function(){
						futureReturnCalls++;
					}
				};
			});
		
			spyOn(ImageProcessor, 'request').and.callFake(function(url_params, callback) {
				callback(null, {a: 'response'}, {a: 'body'});
			});

			spyOn(ImageProcessor, 'save').and.callFake(function(job, callback) {
				if(job.queue.length === 0) {
					callback();
				}
				else {
					job.queue = job.queue.slice(1);
					ImageProcessor.save(job, callback);
				}
			});

			spyOn(ImageProcessor, 'outputs').and.callFake(function(asset, category) {
				return [
					{asset_id: asset.sys.id, filename: 'image-1234@1x.jpg', width: 200, density: 1, filetype: 'png', background: '#eee'},
					{asset_id: asset.sys.id, filename: 'image-1234@2x.jpg', width: 400, density: 2, filetype: 'png', background: '#eee'},
					{asset_id: asset.sys.id, filename: 'image-1234@3x.jpg', width: 600, density: 3, filetype: 'png', background: '#eee'},
					{asset_id: asset.sys.id, filename: 'image-1234@4x.jpg', width: 800, density: 4, filetype: 'png', background: '#eee'},
				]
			});
			/**
			 *	Setting up
			 */
			var job = {
				asset: {
					sys: {
						id: 1234
					},
					fields: {
						file: {
							url: '//somewhere.good.com/image.png'
						},
						description: 'logo'
					}
				}
			};
			ImageProcessor.settings = {
				categories: {
					logo: {
						filetype: 'png',
						background: '#eee'
					}
				}
			};

			/**
			 *	Run the function and then test
			 */
			ImageProcessor.generate(job);
			/**
			 *	Note: We should expect the save function to have been called 
			 *	5 times despite its size of four, because it should execute
			 *	the callback function passed as an argument one extra time.
			 */
			expect(ImageProcessor.save.calls.count()).toEqual(5);

			/**
			 *	Testing the number of times the Future wait and return calls were made
			 */
			expect(futureReturnCalls).toEqual(1);
			expect(futureWaitCalls).toEqual(1);

			/**
			 *	Cleanup and done
			 */
			ImageProcessor.settings = false;
			done();

		});
	});

	describe('save()', function() {

		it('should execute a callback passed in as an argument and return immediately if the queue is empty', function(done) {
			/**
			 *	Spies and setup
			 */
			var callbackSpy = jasmine.createSpy('cb'),
					job = {
						queue: []
					};
			/**
			 *	Run the function with params
			 */
			expect(ImageProcessor.save(job, callbackSpy)).toBeUndefined();
			expect(callbackSpy.calls.count()).toEqual(1);
			done();
		});

		it('should call the correct gm resize functions given a background color was specified, then save to the collection', function(done) {

			/**
			 *	Spies with tests
			 */
			spyOn(ImageProcessor, 'saveToCollection');
			spyOn(ImageProcessor, 'gm').and.callFake(function(data) {
				expect(data).toEqual({a: 'stream'});

				return {
					setFormat: function(format) {
						expect(format).toEqual('jpg');
						return this;
					},
					background: function(background) {
						expect(background).toEqual('#ffffff');
						return this;
					},
					flatten: function() {
						return this;
					},
					resize: function(width) {
						expect(width).toEqual(200);
						return this;
					},
					write: function(directory, callback) {
						expect(directory).toEqual('/some/where/a-file.jpg');
						callback();
						return this;
					},
					quality: function(percent) {
						expect(percent).toEqual(55)
						return this;
					}
				}
			});

			/**
			 *	Setting up
			 */
			var job = {
				stream: {a: 'stream'},
				queue: [
					{
						filetype: 'jpg',
						width: 200,
						background: '#ffffff',
						filename: 'a-file.jpg'
					}
				]
			};
			ImageProcessor.settings = {
				directory: '/some/where',
				quality: 55
			};

			/**
			 *	Call the function
			 */
			ImageProcessor.save(job, function(){});
			expect(ImageProcessor.saveToCollection).toHaveBeenCalled();

			/** 
			 *	Cleanup and done
			 */
			ImageProcessor.settings = false;
			done();
		});
	});

	describe('saveToCollection()', function() {

		it('should throw an error if a process being saved to a collection is not an object', function(done) {

			var process;
			expect(function() {
				ImageProcessor.saveToCollection(process);
			}).toThrow(new Meteor.Error(500, 'Cannot save process of type undefined'));

			process = 1;
			expect(function() {
				ImageProcessor.saveToCollection(process);
			}).toThrow(new Meteor.Error(500, 'Cannot save process of type number'));

			process = function(){};
			expect(function() {
				ImageProcessor.saveToCollection(process);
			}).toThrow(new Meteor.Error(500, 'Cannot save process of type function'));

			done();

		});

		it('should call the Collections update function with the correct parameters', function(done) {

			/**
			 *	Setting up
			 */
			var process = {
				asset_id: 1,
				filename: '/var/somewhere/images/12345-desktop@2x.jpg'
			};

			/**
			 *	Spies
			 */
			spyOn(Collections, 'updateToCollection').and.callFake(function(collection_name, selector, modifier){
				expect(collection_name).toEqual('images');

				expect(selector).toEqual({asset_id: 1, filename: '/var/somewhere/images/12345-desktop@2x.jpg'});
				expect(modifier).toEqual(process);
			});

			/**
			 *	Run the function
			 */
			ImageProcessor.saveToCollection(process);

			/**
			 *	Cleanup and done
			 */
			done();
		});
	});

	describe('outputs()', function() {

		it('should throw an error if the asset being passed in is not an object', function(done) {

			var asset, 
					category;
			expect(function() {
				ImageProcessor.outputs(asset, category);
			}).toThrow(new Meteor.Error(500, 'Output generation needs a valid asset and category.'));

			asset = {};
			expect(function() {
				ImageProcessor.outputs(asset, category);
			}).toThrow(new Meteor.Error(500, 'Output generation needs a valid asset and category.'));

			done();

		});

		it('should generate the correct outputs given input parameters', function(done) {

			/**
			 *	Setting up
			 */
			var asset = {
				sys: {
					id: '1234',
				}
			},
			category = {
				filetype: 'jpg',
				sizes: [
					{
						width: 800,
						device: 'desktop'
					},
					{
						width: 400,
						device: 'tablet'
					}
				]
			};

			/**
			 *	Run the function
			 */
			var outputs = ImageProcessor.outputs(asset, category);

			/**
			 *	Then run the tests
			 */
			expect(outputs.length).toEqual(6);

			expect(outputs[0].filename).toEqual('1234-desktop.jpg');
			expect(outputs[1].filename).toEqual('1234-desktop@2x.jpg');
			expect(outputs[2].filename).toEqual('1234-desktop@3x.jpg');
			expect(outputs[3].filename).toEqual('1234-tablet.jpg');
			expect(outputs[4].filename).toEqual('1234-tablet@2x.jpg');
			expect(outputs[5].filename).toEqual('1234-tablet@3x.jpg');

			expect(outputs[0].width).toEqual(800);
			expect(outputs[1].width).toEqual(1600);
			expect(outputs[2].width).toEqual(2400);
			expect(outputs[3].width).toEqual(400);
			expect(outputs[4].width).toEqual(800);
			expect(outputs[5].width).toEqual(1200);			

			/**
			 *	Done
			 */
			done();
		});
	});

	describe('observe()', function() {

		it('should start the observer', function(done) {

			/**
			 *	The observer should not be started
			 */
			expect(ImageProcessor.observer).toEqual(false);

			/**
			 *	Start it and make sure it was set up correctly
			 */
			ImageProcessor.observe();
			expect(ImageProcessor.observer).toEqual(jasmine.any(Object));

			/**
			 *	Cleanup and done	
			 */
			ImageProcessor.stopObserving();
			done();

		});
	});

	describe('assetAdded()', function() {

		it('should throw when an invalid asset is added', function(done) {
			var asset;
			expect(function() {
				ImageProcessor.assetAdded('meteor_0', asset);
			}).toThrow(new Meteor.Error(500, 'Cannot add an invalid asset.'));
			done();
		});

		it('should push a new asset to the queue with a create task and then run the queue', function(done) {

			/** 
			 *	Spies
			 */
			spyOn(ImageProcessor.queue, 'push').and.callFake(function(item) {
				expect(item).toEqual({asset: {fetchedAt: 1234, refreshedAt: 1234}, task: 'create'});
			});
			spyOn(ImageProcessor, 'run').and.callFake(function(){});

			/**
			 *	Setup
			 */
			var asset = {
				fetchedAt: 1234,
				refreshedAt: 1234
			};

			/**
			 *	Run the function and test
		 	 */
		 	ImageProcessor.assetAdded('meteor_1', asset);

		 	expect(ImageProcessor.queue.push).toHaveBeenCalled();
		 	expect(ImageProcessor.run).toHaveBeenCalled();

		 	/**
		 	 *	Done
		 	 */
		 	done();
		});

		it('should not push an existing asset to the queue and it should not run the queue', function(done) {

			/**
		 	 *	Spies
			 */
			spyOn(ImageProcessor, 'run');
			spyOn(ImageProcessor.queue, 'push');

			var asset = {
				fetchedAt: 1234,
				refreshedAt: 12345
			};

			/**
			 *	Run the function and the tests
			 */
			ImageProcessor.assetAdded('meteor_2', asset);

			expect(ImageProcessor.run).not.toHaveBeenCalled();
			expect(ImageProcessor.queue.push).not.toHaveBeenCalled();

			/**
			 *	Done
			 */
			done();
		});
	});

	describe('assetChanged()', function() {

		it('should throw when an invalid asset is added', function(done) {
			var asset;
			expect(function() {
				ImageProcessor.assetChanged('meteor_3', asset);
			}).toThrow(new Meteor.Error(500, 'Cannot update an invalid asset.'));
			done();
		});

		it('should push an updated asset to the queue with a create task and then run the queue', function(done) {

			/** 
			 *	Spies
			 */
			spyOn(ImageProcessor.queue, 'push').and.callFake(function(item) {
				expect(item).toEqual({asset: {fetchedAt: 1234, refreshedAt: 56789}, task: 'create'});
			});
			spyOn(ImageProcessor, 'run').and.callFake(function(){});

			/**
			 *	Setup
			 */
			var asset = {
				fetchedAt: 1234,
				refreshedAt: 56789
			};

			/**
			 *	Run the function and test
		 	 */
		 	ImageProcessor.assetChanged('meteor_5', asset);

		 	expect(ImageProcessor.queue.push).toHaveBeenCalled();
		 	expect(ImageProcessor.run).toHaveBeenCalled();

		 	/**
		 	 *	Done
		 	 */
		 	done();
		});
	});

	describe('assetRemoved()', function() {

		it('should throw when an invalid asset is removed', function(done) {
			var asset;
			expect(function() {
				ImageProcessor.assetRemoved(asset);
			}).toThrow(new Meteor.Error(500, 'Cannot remove an invalid asset.'));
			done();
		});

		it('should push a removed asset to the queue with a delete task and then run the queue', function(done) {

			/** 
			 *	Spies
			 */
			spyOn(ImageProcessor.queue, 'push').and.callFake(function(item) {
				expect(item).toEqual({asset: {fetchedAt: 5, refreshedAt: 6}, task: 'delete'});
			});
			spyOn(ImageProcessor, 'run').and.callFake(function(){});

			/**
			 *	Setup
			 */
			var asset = {
				fetchedAt: 5,
				refreshedAt: 6
			};

			/**
			 *	Run the function and test
		 	 */
		 	ImageProcessor.assetRemoved(asset);

		 	expect(ImageProcessor.queue.push).toHaveBeenCalled();
		 	expect(ImageProcessor.run).toHaveBeenCalled();

		 	/**
		 	 *	Done
		 	 */
		 	done();
		});
	});

});