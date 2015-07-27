'use strict';

ImageProcessor = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),
	GM: Npm.require('gm'),
	HTTP: Npm.require('http'),
	FS: Npm.require('fs'),

	/**
	 *	Object props
	 */
	settings: Meteor.settings.imageprocessor,
	queue: [],
	running: false,

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
	 *	Download the source image from Contentful given an asset
	 */
	download: function(url) {
		var current = this.Fiber.current,
				http = this.HTTP,
				url = 'http:' + url,
				request,
				result,
				data;

		request = http.get(url, function(response) {

			response.setEncoding('binary');

			if(response.statusCode < 200 || response.statusCode > 299) {
				current.run({
					then: function(cb) {
						cb(null);
						return {
							fail: function(cb) {
								cb({message: 'Failed to fetch resource with ' + url + '. Status: ' + response.statusCode});
							}	
						}
					}
				});
				return;
			}

			response.on('data', function(chunk) {
				data += chunk;
			});

			response.on('error', function() {
				current.run({
					then: function(cb) {
						cb(null);
						return {
							fail: function(cb) {
								cb({message: 'Response stream failure for url: ' + url});
							}	
						}
					}
				});
			});

			response.on('end', function() {
				current.run({
					then: function(cb) {
						cb(data);
						return {
							fail: function(cb) {
								cb(null);
							}
						}
					}
				})
			});
		});

		request.on('error', function() {
			current.run({
				then: function(cb) {
					cb(null);
					return {
						fail: function(cb) {
							cb({message: 'Failed with status: ' + response.statusCode});
						}	
					}
				}
			});
		});

		result = this.Fiber.yield();
		return result;
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