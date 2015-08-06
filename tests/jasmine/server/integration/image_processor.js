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

	});

	describe('saveToCollection()', function() {

	});

	describe('outputs()', function() {

	});

	describe('observe()', function() {

	});

	describe('stopObserving()', function() {

	});

	describe('assetAdded()', function() {

	});

	describe('assetChanged()', function() {

	});

	describe('assetRemoved()', function() {

	});

});