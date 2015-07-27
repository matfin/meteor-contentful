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
	downloadAsset: function(url) {
		var current = this.Fiber.current,
				http = this.HTTP,
				request,
				result,
				data = '';

		request = http.get(url, function(response) {

			response.setEncoding('binary');

			if(response.statusCode < 200 || response.statusCode > 299) {
				current.run({
					then: function() {
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
					then: function() {
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
							fail: function() {}
						}
					}
				})
			});
		});

		request.on('error', function() {
			current.run({
				then: function(cb) {
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
	 *	Save image data to the filesystem
	 */
	save: function(filename, data) {
		var current = this.Fiber.current,
				fs = this.FS,
				fullpath = this.settings.source + '/' + filename,
				result;

		fs.writeFile(fullpath, data, {encoding: 'binary'}, function(err) {
			if(err) {
				current.run({
					then: function() {
						return {
							fail: function(cb) {
								cb({
									message: 'Failed to save file ' + fullpath,
									data: err
								});
							}
						}
					}
				});
				return;
			}
			else {
				current.run({
					then: function(cb) {
						cb({
							message: 'success',
							path: fullpath
						});
						return {
							fail: function(){}
						}
					}
				});
			}
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