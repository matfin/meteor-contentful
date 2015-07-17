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
		return function(){
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



