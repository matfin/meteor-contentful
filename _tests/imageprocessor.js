Tinytest.addAsync('ImageProcessor - observeAssetChanges should call the addImageJob function with an object and false when an item is added to the collection and call the Contentful startImageOpQueue function.', function(test, onComplete) {

	/**
	 *	Creating stubs and backups
	 */
	ImageProcessor_addImageJob = _.extend(ImageProcessor.addImageJob);

	var objectToAdd = {
		id: 1,
		item: 'one',
		other: 'two'
	};

	ImageProcessor.addImageJob = function(asset, forceupdate) {
		/**
		 *	Test should be called when an item is added.
		 */
		test.intanceOf(asset, Object);
		test.isTrue(forceupdate);
	};

	/**
	 *	Call the function observeAssetChanges
	 */
	ImageProcessor.init();
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

