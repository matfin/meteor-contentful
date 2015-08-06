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