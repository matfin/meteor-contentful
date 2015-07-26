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
	 *	Listen for incoming changes
	 */
	listen: function() {
		var express = Npm.require('express'),
				bodyparser = Npm.require('body-parser'),
				app = express();

		app.use(bodyparser.json({type: 'application/vnd.contentful.delivery.v1+json'}));
		app.listen(this.settings.callbackPort);
		
		app.post('/hooks/contentful', function(req, res) {
			
			console.log(req.body);


			res.status(200).end();
		});

	}

};

