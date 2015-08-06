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

	});

	describe('generate()', function() {

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