Tinytest.add('ImageProcessor - init should call function observeAssetChanges and run a fiber', function(test) {

	/**
	 *	Stubs and backups
	 */
	ImageProcessor_backup = _.clone(ImageProcessor);
	Meteor_backup = _.clone(Meteor);

	observeAssetChangesCallCount = 0;
	fiberRunCount = 0;


	ImageProcessor.observeAssetChanges = function() {
		observeAssetChangesCallCount++;
		return;
	};

	Meteor.npmRequire = function(package) {
		return function() {
			return {
				run: function(){
					fiberRunCount++;
				}
			}
		};
	};

	/**
	 *	Call the function and run the tests
	 */
	ImageProcessor.init();
	test.equal(observeAssetChangesCallCount, 1);
	test.equal(fiberRunCount, 1);

	/**
	 *	Cleanup
	 */
	ImageProcessor = ImageProcessor_backup;
	Meteor = Meteor_backup;

});


Tinytest.addAsync('ImageProcessor - observeAssetChanges should call the addImageJob function with an object and false when an item is added to the collection and call the Contentful startImageOpQueue function.', function(test, onComplete) {

	/**
	 *	Creating stubs and backups
	 */
	Contentful_backup = _.clone(Contentful);

	var objectToAdd = {
		id: 1,
		item: 'one',
		other: 'two'
	};

	Contentful.addImageJob = function(asset, forceupdate) {
		/**
		 *	Test should be called when an item is added.
		 */
		test.intanceOf(asset, Object);
		test.isFalse(forceupdate);

		console.log(asset, forceupdate);

	};

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
	//Contentful.collections.assets.remove();
	Contentful = Contentful_backup;

	onComplete();
});

