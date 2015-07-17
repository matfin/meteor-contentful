Tinytest.addAsync('ImageProcessor - observeAssetChanges - should call the startImageOpQueue function and addImageJob function with an object and false when an item is added to the collection.', function(test, onComplete) {
	/**
	 *	Creating stubs and backups
	 */
	ImageProcessor_addImageJob = _.extend(ImageProcessor.addImageJob);
	ImageProcessor_Fiber = _.extend(ImageProcessor.Fiber);
	ImageProcessor_startImageOpQueue = _.extend(ImageProcessor.startImageOpQueue);

	var objectToAdd = {
		id: 1,
		item: 'one',
		other: 'two'
	};

	var opqueueFunctionCallCount = 0;

	ImageProcessor.addImageJob = function(asset, forceupdate) {
		/**
		 *	Test should be called when an item is added.
		 */
		test.instanceOf(asset, Object);
		test.isFalse(forceupdate);

		return {
			then: function(cb) {
				cb();
			}
		};
	};

	ImageProcessor.startImageOpQueue = function() {
		opqueueFunctionCallCount++;
		test.equal(opqueueFunctionCallCount, 1);
	}

	ImageProcessor.Fiber = function(cb) {
		return {
			run: function() {
				cb();
			}
		}
	};

	/**
	 *	Call the function observeAssetChanges
	 */
	ImageProcessor.observeAssetChanges();

	/**
	 *	Add an item to the collection
	 */
	Contentful.collections.assets.update(
		{
			'id': objectToAdd.id
		},
		objectToAdd,
		{
			upsert: true
		}
	);

	/**
	 *	Cleanup
	 */
	Meteor.setTimeout(function() {
		Contentful.collections.assets.remove({});
		ImageProcessor.addImageJob = ImageProcessor_addImageJob;
		ImageProcessor.startImageOpQueue = ImageProcessor_startImageOpQueue;
		ImageProcessor.Fiber = ImageProcessor_Fiber;
		onComplete();
	}, 500);

});


Tinytest.add('ImageProcessor - processImages - should call updateImagesCollection the correct number of times', function(test) {

	/**
	 *	Creating stubs and backups
	 */
	var CFConfig_backup = _.clone(CFConfig);
	var ImageProcessor_updateImagesCollection = _.extend(ImageProcessor.updateImagesCollection);

	var asset = {
		sys: {
			id: 1
		},
		imageResizeParams: [
			{
				size: 1,
				device: 'tablet',
				pixelDensity: {
					prefix: 'pre'
				},
				fileType: 'jpg'
			},
			{
				size: 2,
				device: 'tablet',
				pixelDensity: {
					prefix: 'pre'
				},
				fileType: 'jpg'
			},
			{
				size: 3,
				device: 'tablet',
				pixelDensity: {
					prefix: 'pre'
				},
				fileType: 'jpg'
			}
		]
	};

	var updateImagesCollectionCallCount = 0;

	ImageProcessor.updateImagesCollection = function() {
		console.log('Times this is called');
		updateImagesCollectionCallCount++;
	};

	/** 
	 *	Stubbing GM chained functions
	 */
	ImageProcessor.GM = function() {
		return {
			setFormat: function() {
				return {
					resize: function() {
						return {
							write: function(blank, cb) {
								cb();
							}
						}
					}
				}
			}
		}
	};

	/**
	 *	Run the function and then the test
	 */
	ImageProcessor.processImages('', asset);
	test.equal(updateImagesCollectionCallCount, 3);

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;
	ImageProcessor.updateImagesCollection = ImageProcessor_updateImagesCollection;
	ImageProcessor.GM = false;
});


Tinytest.addAsync('ImageProcessor - startImageOpQueue - should set the imageOperationQueueIsRunning to true, then false after one second', function(test, onComplete) {

	/** 
	 *	Stubs and backups
	 */
	ImageProcessor_sourceFileExists = _.extend(ImageProcessor.sourceFileExists);
	ImageProcessor_processImages = _.extend(ImageProcessor.processImages);

	/**
	 *	Adding two items to the operation queue
	 */
	ImageProcessor.imageOperationQueue.push({
		sys: { 
			id: 1
		},
		fields: {
			file: {
				url: 'http://somewhere.to/image.png'
			}
		}
	});
	ImageProcessor.imageOperationQueue.push({
		sys: { 
			id: 2
		},
		fields: {
			file: {
				url: 'http://somewhere-else.to/another-image.png'
			}
		}
	});

	ImageProcessor.FS = function() {
		return {
			open: function(a, b, cb) {
				cb();
			}
		}
	};

	ImageProcessor.sourceFileExists = function(path, cb) {
		cb(true);
	};

	/**
	 *	Fake the amount of time it takes to process an image
	 */
	ImageProcessor.processImages = function() {
		return {
			fin: function(cb) {
				Meteor.setTimeout(function() {
					cb();
				}, 500);
			}
		}
	};

	/**
	 *	Run the function, then assert that imageOperationQueueIsRunning is true
	 */
	ImageProcessor.startImageOpQueue();
	test.isTrue(ImageProcessor.imageOperationQueueIsRunning);

	/**
	 *	Wait approximately one second, then determine if it is no longer running
	 */
	Meteor.setTimeout(function() {
		/**
		 *	Verify the queue is no longer running
		 */
		test.isFalse(ImageProcessor.imageOperationQueueIsRunning);

		/**
		 * Then clean up
		 */
		ImageProcessor.sourceFileExists = ImageProcessor_sourceFileExists;
		ImageProcessor.processImages = ImageProcessor_processImages;

		/**
		 *	Exit
		 */
		onComplete();

	}, 1200);


});