Tinytest.addAsync('ImageProcessor - observeAssetChanges should call the startImageOpQueue function and addImageJob function with an object and false when an item is added to the collection.', function(test, onComplete) {
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
	test.equal(updateImagesCollectionCallCount, 4);

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;
	ImageProcessor.updateImagesCollection = ImageProcessor_updateImagesCollection;

});