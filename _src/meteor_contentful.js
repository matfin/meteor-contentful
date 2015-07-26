'use strict';

MeteorContentful = {
	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),
	Contentful: Npm.require('contentful'),

	/**
	 *	Object props
	 */
	settings: Meteor.settings.contentful,
	client: false,
	callbackPort: false,

	/**
	 *	Check settings exists
	 */
	hasSettings: function() {
		if(typeof this.settings === 'undefined') {
			return false;
		}
	},

	/**
	 *	Start the client
	 */
	start: function() {
		if(!this.hasSettings) {
			throw {
				type: 'error',
				message: 'settings.json not correctly set up'
			};
		}

		this.client = this.Contentful.createClient({
			space: this.settings.space,
			accessToken: this.settings.accessToken,
			secure: true,
			host: this.settings.host,
			callbackPort: this.settings.callbackPort
		});

		return this;
	},

	/**
	 *	Fetch and update all content types to the collection
	 */
	fetchContentTypes: function(cb) {
		var	current = this.Fiber.current,
				res;

		this.client.contentTypes().then((function(data, err) {
			this.Fiber(function() {
				data.map(function(item) {
					Collections.updateToCollection('contentTypes', item);
				});
				current.run();
			}).run();
		}).bind(this));

		res = this.Fiber.yield();
		return this;
	},

	/**
	 *	Fetch and update all entries
	 */
	fetchEntries: function(cb) {
		var current = this.Fiber.current,
				res;

		this.client.entries().then((function(data, err) {
			this.Fiber(function() {
				data.map(function(item) {
					Collections.updateToCollection('entries', item);
				});
				current.run();
			}).run();
		}).bind(this));

		res = this.Fiber.yield();
		return this;
	},

	/**
	 *	Fetch and update all assets
	 */
	fetchAssets: function(cb) {
		var current = this.Fiber.current,
				res;

		this.client.assets().then((function(data, err) {
			this.Fiber(function() {
				data.map(function(item) {
					Collections.updateToCollection('assets', item);
				});
				current.run();
			}).run();
		}).bind(this));

		res = this.Fiber.yield();
		return this;
	},

	/**
	 *	Remap incoming updates
	 */
	remapUpdate: function() {

	},

	/**
	 *	Listen for incoming changes
	 */
	listen: function() {
		var express = Npm.require('express'),
				bodyparser = Npm.require('body-parser'),
				app = express(),
				item;

		app.use(bodyparser.json({type: 'application/vnd.contentful.management.v1+json'}));
		app.use(bodyparser.json());
		app.listen(this.settings.callbackPort);
		
		app.post('/hooks/contentful', (function(req, res) {

			item = req.body;
			
			this.Fiber(function(){
				switch(req.headers['x-contentful-topic']) {
					case 'ContentManagement.Entry.publish': {
						console.log('Update an entry');
						break;
					}
					case 'ContentManagement.Entry.unpublish': {
						Collections.removeFromCollection('entries', item);
						break;
					}
					case 'ContentManagement.Asset.publish': {
						console.log('Update an asset');
						break;
					}
					case 'ContentManagement.Asset.unpublish': {
						Collections.removeFromCollection('assets', item);
						break;
					}
				}
			}).run();

			//ContentManagement.Entry.publish
			//ContentManagement.Entry.unpublish
			//ContentManagement.Asset.publish
			//ContentManagement.Asset.unpublish

			// console.log(req.headers);
			// console.log(req.body);

			res.status(200).end();
		}).bind(this));
	}

};

