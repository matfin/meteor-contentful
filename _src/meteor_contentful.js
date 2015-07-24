'use strict';

MeteorContentful = {
	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),
	Contentful: Npm.require('contentful'),
	BodyParser: Npm.require('body-parser'),
	Connect: Npm.require('connect'),

	/**
	 *	Object props
	 */
	settings: Meteor.settings.contentful,
	client: false,

	/**
	 *	Simepl logging
	 */
	log: console.log.bind(console),

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
			host: this.settings.host
		});

		return this;
	},

	/**
	 *	Fetch and update all content types to the collection
	 */
	fetchContentTypes: function() {
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
	fetchEntries: function() {
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
	fetchAssets: function() {
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

};

