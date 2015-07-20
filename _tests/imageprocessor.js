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


Tinytest.addAsync('ImageProcessor - processImages - should call GraphicsMagick and function to update the images collection with the correct parameters given an asset', function(test, onComplete) {

	/**
	 *	Creating stubs and backups
	 */
	var CFConfig_backup = _.extend(CFConfig);

	var asset = {
		sys: {
			id: 1
		},
		imageResizeParams: [
			{
				size: {
					device: 'tablet',
					width: 800,
					height: 600
				},
				pixelDensity: {
					prefix: '',
					multiplier: 1
				},
				fileType: 'jpg'
			},
			{
				size: {
					device: 'tablet',
					width: 800,
					height: 600
				},
				device: 'tablet',
				pixelDensity: {
					prefix: '@2x',
					multiplier: 2
				},
				fileType: 'jpg'
			},
			{
				size: {
					device: 'tablet',
					width: 800,
					height: 600
				},
				device: 'tablet',
				pixelDensity: {
					prefix: '@3x',
					multiplier: 3
				},
				fileType: 'jpg'
			}
		]
	};

	CFConfig.imageProcessor.path = 'path/to/file/'

	/** 
	 *	Each time the GM function is called, store the given 
	 *	params in here so we can test them later
	 */
	var GM_params = {
		sourceFilePathParams: [],
		setFormatParams: [],
		resizeParams: [],
		writeParams: []
	}

	/**
	 *	We should also check the parameters being passed in when the 
	 *	images collection is being updated
	 */
	var updateCollectionParams = {
		assetIdParams: [],
		sizeParams: [],
		pixelDensityParams: [],
		filenameParams: []
	};

	/**
	 *	Stubbing the ImageProcessor updateImagesCollection function
	 */
	ImageProcessor.updateImagesCollection = function(item) {
		updateCollectionParams.assetIdParams.push(item.assetId);
		updateCollectionParams.sizeParams.push(item.size);
		updateCollectionParams.pixelDensityParams.push(item.pixelDensity);
		updateCollectionParams.filenameParams.push(item.filename);
	};

	/** 
	 *	Stubbing GM chained functions and pushing in given params
	 */
	ImageProcessor.GM = function(sourceFilePath) {
		GM_params.sourceFilePathParams.push(sourceFilePath);
		return {
			setFormat: function(format) {
				GM_params.setFormatParams.push(format);
				return {
					resize: function(width) {
						GM_params.resizeParams.push(width);
						return {
							write: function(filename, cb) {
								GM_params.writeParams.push(filename);
								cb();
							}
						}
					}
				}
			}
		}
	};

	/**
	 *	Call the function and then test that the GM function is receiving 
	 *	the correct parameters, then test that the function to update
	 *	the images collection is also receiving the correct parameters.
	 */
	ImageProcessor.processImages('path/to/file', asset);

	/**
	 *	Test params given to the function to update the images collection
	 */
	test.equal(updateCollectionParams.assetIdParams[0], 1);
	test.equal(updateCollectionParams.assetIdParams[1], 1);
	test.equal(updateCollectionParams.assetIdParams[2], 1);

	test.equal(updateCollectionParams.sizeParams[0].device, 'tablet');
	test.equal(updateCollectionParams.sizeParams[1].device, 'tablet');
	test.equal(updateCollectionParams.sizeParams[2].device, 'tablet');

	test.equal(updateCollectionParams.sizeParams[0].width, 800);
	test.equal(updateCollectionParams.sizeParams[1].width, 800);
	test.equal(updateCollectionParams.sizeParams[2].width, 800);

	test.equal(updateCollectionParams.sizeParams[0].height, 600);
	test.equal(updateCollectionParams.sizeParams[1].height, 600);
	test.equal(updateCollectionParams.sizeParams[2].height, 600);

	test.equal(updateCollectionParams.pixelDensityParams[0].prefix, '');
	test.equal(updateCollectionParams.pixelDensityParams[1].prefix, '@2x');
	test.equal(updateCollectionParams.pixelDensityParams[2].prefix, '@3x');

	test.equal(updateCollectionParams.pixelDensityParams[0].multiplier, 1);
	test.equal(updateCollectionParams.pixelDensityParams[1].multiplier, 2);
	test.equal(updateCollectionParams.pixelDensityParams[2].multiplier, 3);

	test.equal(updateCollectionParams.filenameParams[0], '1-tablet.jpg');
	test.equal(updateCollectionParams.filenameParams[1], '1-tablet@2x.jpg');
	test.equal(updateCollectionParams.filenameParams[2], '1-tablet@3x.jpg');

	/**
	 *	Test the params being passed into the GM function for resizing images
	 */
	test.equal(GM_params.sourceFilePathParams[0], 'path/to/file');
	test.equal(GM_params.sourceFilePathParams[1], 'path/to/file');
	test.equal(GM_params.sourceFilePathParams[2], 'path/to/file');

	test.equal(GM_params.setFormatParams[0], 'jpg');
	test.equal(GM_params.setFormatParams[1], 'jpg');
	test.equal(GM_params.setFormatParams[2], 'jpg');

	test.equal(GM_params.resizeParams[0], 800);
	test.equal(GM_params.resizeParams[1], 1600);
	test.equal(GM_params.resizeParams[2], 2400);

	test.equal(GM_params.writeParams[0], 'path/to/file/processed/1-tablet.jpg');
	test.equal(GM_params.writeParams[1], 'path/to/file/processed/1-tablet@2x.jpg');
	test.equal(GM_params.writeParams[2], 'path/to/file/processed/1-tablet@3x.jpg');	

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;
	ImageProcessor.GM = false;

	/**
	 *	Finish
	 */
	onComplete();

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


Tinytest.addAsync('ImageProcessor - addImageJob - should push a job with 6 resize parameters to the processing queue given three sizes and two pixel densities.', function(test, onComplete) {

	/**
	 *	Creating stubs and backups
	 */
	var Q_backup = _.extend(Q);
	var CFConfig_backup = _.clone(CFConfig);

	var asset = {
		fields: {
			description: 'portfolio'
		}
	};

	CFConfig = {
		imageProcessor: {
			pixelDensities: [
				{
					prefix: "",
					multiplier: 1
				},
				{
					prefix: "@2x",
					multiplier: 2 
				}
			],
			imageTypes: {
				portfolio: {
					fileType: 'jpg',
					sizes: [
						{
							device: 'desktop',
							width: 1024,
							height: 768
						},
						{
							device: 'tablet',
							width: 800,
							height: 600
						},
						{
							device: 'mobile',
							width: 320,
							height: 240
						}
					]
				}
			}
		}
	};

	var deferredResolvedCallCount = 0;

	Q = {
		defer: function() {
			return {
				resolve: function() {
					/**
					 *	Make sure this was called
					 */
					deferredResolvedCallCount++;
				},
				promise: {}
			};
		}
	};

	/**
	 *	Run the function and then the test
	 */
	ImageProcessor.addImageJob(asset);

	/**
	 *	Asset should now have 6 resize parameters and one job should be added 
	 *	to the queue. The promise should also be resolved.
	 */
	test.equal(asset.imageResizeParams.length, 6);
	test.equal(ImageProcessor.imageOperationQueue.length, 1);
	test.equal(deferredResolvedCallCount, 1);

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;
	ImageProcessor.imageOperationQueue = [];

	/**
	 *	Finish
	 */
	onComplete();

});