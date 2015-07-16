Package.describe({
	name: 			'matfin:meteor-contentful',
	version: 		'0.0.9',
	summary: 		'Package to interact with the Contentful content delivery API.',
	documentation: 	'README.md',
	git: 'https://github.com/matfin/meteor-contentful'
});

Package.onUse(function(api) {

	/**
	 *	Configure the package
	 */
	configurePackage(api);

	/**
	 *	Exporting objects we will be using
	 */
	api.export('CFConfig');
	api.export('Contentful');
	api.export('ImageProcessor');
	api.export('Logger');

});


Package.onTest(function(api) {

	/**
	 *	Configure the package
	 */
	configurePackage(api);

	/** 
   *	Dependencies
	 */
	api.use([
		'tinytest', 
		'mongo-livedata'
	], ['client', 'server']);

	/**
	 *	Adding test specs (Server side only)
	 */
	api.addFiles([
		'_tests/init.js',
		'_tests/contentful.js',
		'_tests/imageprocessor.js'
	], 'server');

});

function configurePackage(api) {
	/**
	 *	Minimum version of Meteor required
	 */
	api.versionsFrom('1.1.0.2');

	/**
	 *	Dependencies
	 */
	api.use([
		'mongo',
		'http',
		'ejson',
		'underscore',
		'aramk:q',
		'matfin:helpers',
		'meteorhacks:npm'
	], 'server');

	/**
	 *	Package source file(s)
	 *
	 *	Note: 	If you have downloaded this package from https://atmospherejs.com/
	 *			you will need to rename settings_sample.js to settings.js and 
	 *			plug your own configuration settings in there.
	 */
	api.addFiles([
		'_config/settings.js',
		'_src/contentful.js',
		'_src/imageprocessor.js',
		'_src/logger.js'
	], 'server');

};