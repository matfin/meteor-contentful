Tinytest.addAsync('ImageProcessor - observeAssetChanges should call the addImageJob function with an object and false when an item is added to the collection and call the Contentful startImageOpQueue function.', function(test, onComplete) {

	/**
	 *	Creating stubs and backups
	 */
	ImageProcessor_addImageJob = _.extend(ImageProcessor.addImageJob);
	ImageProcessor_Fiber = _.extend(ImageProcessor.Fiber);

	var objectToAdd = {
		id: 1,
		item: 'one',
		other: 'two'
	};

	ImageProcessor.Fiber = function(cb) {
		return {
			run: function() {
				cb();
			}
		}
	};

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
	Contentful.collections.assets.remove();
	ImageProcessor.addImageJob = ImageProcessor_addImageJob;

	onComplete();
});

