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
		return typeof this.settings !== 'undefined';
	},

	/**
	 *	Start the client
	 */
	start: function() {
		if(!this.hasSettings()) {
			throw {
				type: 'error',
				message: 'settings.json for ContentFul not correctly set up.'
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

	fetch: function(which, cb) {
		var current = this.Fiber.current,
				action,
				result;

		if(typeof this.client[which] !== 'function') {
			throw new Meteor.Error(500, 'Contentful does not support this function: ' + which);
		}
		else {
			this.client[which]().then(function(data, err) {
				if(err) {
					throw new Meteor.Error(500, 'Cannot fetch this data from Contentful: ' + which);
				}
				this.Fiber(function() {
					data.forEach(function(record) {
						Collections.updateToCollection(which, record);
					});
					current.run(this);
				}.bind(this)).run();
			}.bind(this));
		}



		result = this.Fiber.yield();
		return result;
	},

	/**
	 *	Remap incoming updates
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
	 */
	authenticateCallback: function(request) {
		return request.headers.authorization === 'Basic ' + this.settings.callbackToken;
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
						Collections.updateToCollection('entries', item);
						break;
					}
					case 'ContentManagement.Entry.unpublish': {
						Collections.removeFromCollection('entries', item);
						break;
					}
					case 'ContentManagement.Asset.publish': {
						item = this.remappedUpdate(item);
						Collections.updateToCollection('assets', item);
						break;
					}
					case 'ContentManagement.Asset.unpublish': {
						Collections.removeFromCollection('assets', item);
						break;
					}
				}
			}).bind(this)).run();

			res.status(200).end();
		}).bind(this));
	}

};

