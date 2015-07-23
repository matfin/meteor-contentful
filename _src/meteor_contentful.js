'use strict';

MeteorContentful = {
	/**
	 *	Node dependencies
	 */
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
	updateContentTypes: function() {
		var contentTypes = this.client.contentTypes().then(function(res, err) {
			


		});
	}

};

