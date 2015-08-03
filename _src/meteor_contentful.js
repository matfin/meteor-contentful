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
	 *	Check settings exist
	 *	@return {Boolean} - true if settings is not undefined
	 */
	hasSettings: function() {
		return typeof this.settings !== 'undefined';
	},

	/**
	 *	Start the client so we can fetch from Contentful
	 */
	start: function() {
		if(!this.hasSettings()) {
			throw new Meteor.Error(500, 'Could not find settings for Contentful. Have you added them to your settings.json or environment variables?');
		}

		this.client = this.Contentful.createClient({
			space: this.settings.space,
			accessToken: this.settings.accessToken,
			secure: true,
			host: this.settings.host,
			callbackPort: this.settings.callbackPort
		});

		Collections.init();

		return this;
	},

	/**
	 *	Function to fetch data from Contentful
	 *	@param {String} which - can be contentTypes, entries or assets
	 *	@return {Object} - the result when the data has been fetched - timed by a Fiber yield
	 */
	fetch: function(which) {
		var current = this.Fiber.current,
				now,
				selector, 
				modifier,
				action,
				result;

		if(!this.client) {
			throw new Meteor.Error(500, 'Contentful client not started. Did you forget to call MeteorContentful.start() ?');
		}
		else if(typeof this.client[which] !== 'function') {
			throw new Meteor.Error(500, 'Contentful does not support this function: ' + which);
		}
		else {
			this.client[which]().then(function(data, err) {
				if(err) {
					throw new Meteor.Error(500, 'Cannot fetch this data from Contentful: ' + which);
				}
				this.Fiber(function() {
					data.forEach(function(record) {
						now = new Date().getTime(),
						selector = {'sys\uff0eid': record.sys.id},
						modifier = {$setOnInsert: {fetchedAt: now}, $set: {refreshedAt: now, fields: record.fields, sys: record.sys}},
						Collections.updateToCollection(which, selector, modifier);
					});
					current.run(this);
				}.bind(this)).run();
			}.bind(this));
		}

		result = this.Fiber.yield();
		return result;
	},

	/**
	 *	Remap incoming updates from Contentful
	 *	@param {Object} item - the item that is pushed from the Contentful update hook with data nested inside localisations
	 *	@return {Object} item - the item rempapped so it has the same structure as an item being pulled 
	 */
	remappedUpdate: function(item) {
		var fields = item.fields,
				fields_keys = Object.keys(fields),
				nested_object,
				nested_object_keys;

		fields_keys.forEach(function(key) {
			nested_object = fields[key];
			nested_object_keys = Object.keys(nested_object);
			fields[key] = nested_object[nested_object_keys[0]];
		});

		return item;
	},

	/**
	 *	Function that checks the headers of incoming POST requests
	 *	@param {Object} - incoming POST request from Contentful web hook
	 *	@return {Boolean} - true if the authentication header matches that in the settings
	 */
	authenticateCallback: function(request) {
		return request.headers.authorization === 'Basic ' + this.settings.callbackToken;
	},

	/**
	 *	Listen for incoming changes from the Contentful webhook and call updates to content accordingly.
	 */
	listen: function() {
		var express = Npm.require('express'),
				bodyparser = Npm.require('body-parser'),
				app = express(),
				now,
				item,
				selector,
				modifier;

		app.use(bodyparser.json({type: 'application/vnd.contentful.management.v1+json'}));
		app.use(bodyparser.json());
		app.listen(this.settings.callbackPort);
		
		app.post('/hooks/contentful', (function(req, res) {

			if(!this.authenticateCallback(req)) {
				console.log('Not authenticated!');
				res.status(403).end();
				return;
			}

			item = req.body;
			
			this.Fiber((function(){
				switch(req.headers['x-contentful-topic']) {
					case 'ContentManagement.Entry.publish': {
						item = this.remappedUpdate(item);
						now = new Date().getTime(),
						selector = {'sys\uff0eid': item.sys.id},
						modifier = {$setOnInsert: {fetchedAt: now}, $set: {refreshedAt: now, fields: item.fields, sys: item.sys}},
						Collections.updateToCollection('entries', selector, modifier);
						break;
					}
					case 'ContentManagement.Entry.unpublish': {
						Collections.removeFromCollection('entries', {'sys\uff0eid': item.sys.id});
						break;
					}
					case 'ContentManagement.Asset.publish': {
						item = this.remappedUpdate(item);
						now = new Date().getTime(),
						selector = {'sys\uff0eid': item.sys.id},
						modifier = {$setOnInsert: {fetchedAt: now}, $set: {refreshedAt: now, fields: item.fields, sys: item.sys}},
						Collections.updateToCollection('assets', selector, modifier);
						break;
					}
					case 'ContentManagement.Asset.unpublish': {
						Collections.removeFromCollection('assets', {'sys\uff0eid': item.sys.id});
						break;
					}
				}
			}).bind(this)).run();

			res.status(200).end();
		}).bind(this));
	}
};

