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
	api.export('Contentful');
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
		'meteorhacks:npm@1.3.0'
	], 'server');

	/**
	 *	Package source files
	 */
	api.addFiles([
		'_src/contentful.js',
	], 'server');

};