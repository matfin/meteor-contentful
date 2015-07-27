'use strict';

ImageProcessor = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),
	GM: Npm.require('gm'),
	FS: Npm.require('fs'),

	/**
	 *	Object props
	 */
	settings: Meteor.settings.imageprocessor,

	/**
	 *	Check settings exist
	 */
	hasSettings: function() {
		return typeof this.settings !== 'undefined';
	},

	/**
	 *	Start 
	 */
	start: function() {
		if(!this.hasSettings()) {
			throw {
				type: 'error',
				message: 'settings.json for ImageProcessor not set up.'
			}
		}

		this.observe();
	},

	/**
	 *	Observe changes to the assets collection and run callbacks
	 */
	observe: function() {
		this.Fiber((function() {
			Collections.assets.find({}).observeChanges({
				added: this.assetAdded,
				changed: this.assetChanged,
				removed: this.assetRemoved
			});
		}).bind(this)).run();		
	},

	/**
	 *	When an asset has been added
	 */
	assetAdded: function(id, asset) {
		console.log('Asset added: ', id);
	},

	/**
	 *	When an asset has been changed
	 */
	assetChanged: function(id, asset) {
		console.log('Asset changed: ', id);
	},

	/**
	 *	When an asset has been removed
	 */
	assetRemoved: function(id, asset) {
		console.log('Asset removed: ', id);
	}

};