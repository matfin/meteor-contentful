Package.describe({
	name: 			'matfin:meteor-contentful',
	version: 		'1.5.0',
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
	api.export('Collections');
	api.export('ImageProcessor');
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
		'sanjo:jasmine@0.16.3',
		'matfin:meteor-contentful'
	], 'server');

	/**
	 *	Package test file(s)
	 */
	api.addFiles([
		'tests/jasmine/server/integration/collections.js',
		'tests/jasmine/server/integration/meteor_contentful.js',
		'tests/jasmine/server/integration/image_processor.js'
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
		'matb33:collection-hooks',
		'mongo'
	], 'server');

	Npm.depends({
		'contentful': '1.1.1',
		'express': '4.13.1',
		'body-parser': '1.13.2',
		'gm': '1.18.1',
		'request': '2.60.0'
	});

	/**
	 *	Package source files
	 */
	api.addFiles([
		'_src/meteor_contentful.js',
		'_src/collections.js',
		'_src/image_processor.js'
	], 'server');
};