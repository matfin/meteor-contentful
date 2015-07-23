Package.describe({
	name: 			'matfin:meteor-contentful',
	version: 		'2.0.0',
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
	api.export('MeteorContentful');
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
		'tinytest'
	], 'server');

	/**
	 *	Package test file(s)
	 */
	api.addFiles([
		'collections_tests.js',
		'meteor_contentful_tests.js'
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
		'ejson',
	], 'server');

	Npm.depends({
		'contentful': '1.1.1',
		'body-parser': '1.13.2',
		'gm': '1.18.1',
		'connect': '3.4.0'
	});

	/**
	 *	Package source files
	 */
	api.addFiles([
		'_src/meteor_contentful.js',
	], 'server');

};