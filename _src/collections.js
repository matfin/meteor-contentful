'use strict';

Collections = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),

	contentTypes: new Mongo.Collection('contentful_content_types'),
	assets: new Mongo.Collection('contentful_assets'),
	entries: new Mongo.Collection('contentful_entries')

}