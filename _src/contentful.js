/**
 *	Class for fetching data from the Contentful content delivery API
 *	
 *	@class Contentful
 *	@static
 */
Contentful = {

	/**
	 *	Fiber needed for making async calls
	 */
	Fiber: Npm.require('fibers'),

	/**
	 *	The server side Mongo Collections
	 */
	collections: {
		assets: 	new Mongo.Collection('cf_assets'),
		entries: 	new Mongo.Collection('cf_entries')
	},

	/**
	 *	Function to check the credentials of incoming payloads from Contentful.
	 *	
	 *	@method 	checkCFCredentials
	 *	@param 		{Object} request - incoming request payload
	 *	@return 	{Boolean}		 - true if credentials are valid 	
	 */
	checkCFCredentials: function(request) {
		var granted = 	Helpers.checkNested(request, 'headers', 'authorization')
					&& request.headers.authorization === CFConfig.callbackAuthKey;

		if(!granted) {
			console.log('Invalid access credentials for hook provided');
		}
		else {
			console.log('Valid access credentials for hook provided');
		}

		return granted;
	},

	/**
	 *	Function to fetch the content type name for an entry given its 
	 *	content type id.
	 *
	 *	@method 	contentTypeName()
	 *	@param 		{Object} - entry
	 *	@return 	{String} - the content type name as a string
	 */
	contentTypeName: function(entry) {

		if(Helpers.checkNested(entry, 'sys', 'contentType', 'sys', 'id')) {

			var contentTypeId = entry.sys.contentType.sys.id,
				contentType = _.find(CFConfig.contentTypes, function(contentType) {
				return contentType.id === contentTypeId;
			});

			return (typeof contentType !== 'undefined') ? contentType.name:'nested';
		}

		return 'nested';
	},

	/** 
	 *	Function to make a HTTP call to the contentful endpoint,
	 *	passing in the request headers needed.
	 *
	 *	@method fetchAndPopulate
	 *	@return {Object} - a Q promise resolved or rejected
	 */
	fetchAndPopulate: function () {
		/**
		 *	Setup
 		 */
 		var deferred 	= Q.defer(),
 			self 		= this,
 			url 		= CFConfig.endpointUrl + '/spaces/' + CFConfig.spaceID + '/entries';

 		HTTP.call('GET', url, {
 			headers: {
 				'Authorization': 	CFConfig.authorisationHeader,
 				'Content-Type': 	CFConfig.contentTypeHeader
 			},
 			params: {
 				include: 1
 			}
 		}, function(error, result) {

 			/**
 			 *	Rejected promise with failure if there was an error
 			 */
 			if(error) {
 				deferred.reject({
 					status: 	'error',
 					message: 	'Could not connect to the endpoint',
 					data: 		error
 				});
 			}
 			else {
 				/**
 				 *	Connection successful
 				 */
 				var data = EJSON.parse(result.content);

 				/**
 				 *	Functions that modidy Meteor mongo collections
 				 *	need to be wrapped inside a Fiber
 				 */
 				self.Fiber(function() {

 					/**
 					 *	Loop through each entry
 					 */
 					_.each(data.items, function(entry) {

 						/**
 						 *	Carrying out an upsert for the entry and attaching 
 						 *	the content type name. Only update if the revision
 						 *	number is greater than the one already stored.
 						 */
 						self.collections.entries.update(
 							{
 								'sys.id': entry.sys.id
 							},
 							{
 								fields: entry.fields,
 								sys: entry.sys,
 								contentTypeName: self.contentTypeName(entry)
 							},
 							{
 								upsert: true
 							}
 						);
 					});

 					if(data.errors) {
 						console.log('Asset error encountered:');
 						console.log(data.errors);
 					}

 					/**
 					 *	Loop through each asset if they exist with an entity
 					 */
 					if(Helpers.checkNested(data, 'includes', 'Asset')) {

 						_.each(data.includes.Asset, function(asset) {
	 						/**
	 						 *	Inserting the asset to the collection
	 						 */
	 						self.collections.assets.update(
	 							{
	 								'sys.id': asset.sys.id
	 							},
	 							{
	 								fields: asset.fields,
	 								sys: asset.sys
	 							},
	 							{
	 								upsert: true
	 							}
	 						);
	 					});
 					}

 					/**
 					 *	Resolved promise
 					 */
 					deferred.resolve({
 						status: 	'ok',
 						message: 	'Contentful assets and entries fetched and populated.',
 						data: 		result
 					});

 				}).run();
 			}
 		});
		
		/**
		 *	Then return the promise resolved or rejected
		 */
		return deferred.promise;
	},

	/**
	 *	Set up listeners for incoming updates from Contentful.
	 *	These will be fired when content is updated, and they will be used to
	 *	update collections automatically. This ties into the hooks feature of
	 *	contentful. 
	 *
	 *	Please note that this function requires the package meteorhacks:npm
	 *
	 *	@method 	listenForContentChanges
	 *	@return 	undefined - returns nothing
	 */
	listenForContentChanges: function() {

		if(!Meteor.npmRequire) {
			console.log('Meteor npmRequire not recognised. Aborting.');
			return;
		}

		console.log('Contentful: Listen for content changes.');

		/**
		 *	Required NPM modules
		 */
		var connect 	= Meteor.npmRequire('connect'),
			bodyParser	= Meteor.npmRequire('body-parser'),
			self		= this;

		WebApp.connectHandlers
		.use(bodyParser.json({type: 'application/json'}))
		.use(bodyParser.json({type: 'application/vnd.contentful.management.v1+json'}))
		/**
		 *	Handling incoming requests from Contentful webhooks
		 */
		.use('/hooks/contentful', function(req, res, next) {

			/**
			 *	Checking credentials
			 */
			if(!self.checkCFCredentials(req)) {

				self.makeResponse(res, {
					statusCode: 403,
					contentType: 'application/json',
					data: {
						status: 'error',
						message: 'Invalid credentials'
					}
				});
			}
			else {

				/**
				 *	Call on the Contentful object to handle this request
				 */
				self.handleRequest(req).then(function(result) {
					/**
					 *	Success
					 */
					self.makeResponse(res, {
						statusCode: 200,
						contentType: 'application/json',
						data: result
					});
				}).fail(function(error) {
					/**
					 *	Fail
					 */
					self.makeResponse(res, {
						statusCode: 200,
						contentType: 'application/json',
						data: error
					});
				});
			}
		});
	},

	/**
	 *	Function to handle incoming requests from the Contentful API
	 *	This function examines an incoming requests, looking at the 
	 *	headers and body and calls the appropriate function.
	 *	
	 *	@method 	handleRequest()
	 *	@param 		{Object} request - the incoming request object
	 *	@return 	{Object} - a resolved or rejected promise
	 */
	handleRequest: function(request) {
		/**
		 *	Determine if we are updating or deleting content
		 */

		switch(request.headers['x-contentful-topic']) {
			case 'ContentManagement.Entry.publish':
			case 'ContentManagement.Asset.publish': {
				return this.contentPublish(request.body);
				break;
			}
			case 'ContentManagement.Entry.unpublish':
			case 'ContentManagement.Asset.unpublish': {
				return this.contentUnpublish(request.body);
				break;
			}
			default: {
				var deferred = Q.defer();
				deferred.resolve({
					status: 'ok',
					message: 'No content has been changed.'
				});
				return deferred.promise;
				break;
			}
		}
	},

	/**
	 *	Function to unpublish or delete Assets and Entries for 
	 *	Contentful data.
	 *
	 *	@method 	contentUnpublish
	 *	@param 		{Object} requestBody - the request body
	 *	@return 	{Object} - A promise resolved or rejected
	 */
	contentUnpublish: function(requestBody) {
		var deferred = Q.defer(),
			self = this,
			entry = requestBody,
			collection;

		/**
		 *	Check to see if we have the correct entry type
		 *	and load the correct collection to be updated
		 */
		switch(entry.sys.type) {
			case 'DeletedEntry': {
				collection = this.collections.entries;
				break;
			}
			case 'DeletedAsset': {
				collection = this.collections.assets;
				break;
			}
			default: {
				deferred.reject({
					status: 'error',
					message: 'Entry type does not exist. Exiting'
				});
			}
		}

		/**
		 *	If we have a collection to update
		 */
		if(typeof collection !== 'undefined') {
			/**
			 *	Call the delete function from within a Fiber
			 */
			this.Fiber(function() {

				/**
				 *	Remove the item from the collection
				 */
				collection.remove({
					'sys.id': entry.sys.id
				});

			}).run();
		}
		else {
			deferred.reject({
				status: 'error',
				message: 'Specified collection does not exist.'
			});
		}

		return deferred.promise;
	},

	/**
	 *	Function to update Assets and entries for Contentful data
	 *
	 *	@method 	contentPublish()
	 *	@param 		{Object} requestBody - the request body with content payload 
	 *	@return 	{Object} - A promise resolved or rejected
	 */
	contentPublish: function(requestBody) {

		var deferred 	= Q.defer(),
			self 		= this,
			entry 		= requestBody,
			updateData  = {},
			collection;

		/**
		 *	Check to see if we have the correct entry type
		 *	and load the correct collection to be updated
		 */
		switch(entry.sys.type) {
			case 'Entry': {
				collection = this.collections.entries;
				updateData = {
					fields: Helpers.flattenObjects(entry.fields, 'en-US'),
					sys: entry.sys,
					contentTypeName: self.contentTypeName(entry)
				};
				break;
			}
			case 'Asset': {
				collection = this.collections.assets;
				updateData = {
					fields: Helpers.flattenObjects(entry.fields, 'en-US'),
					sys: entry.sys
				};
				break;
			}
			default: {
				deferred.reject({
					status: 'error',
					message: 'Entry type does not exist. Exiting'
				});
			}
		}

		/**
		 *	If we have a collection to update
		 */
		if(typeof collection !== 'undefined') {
			/**
			 *	Call the upadte function from within a Fiber
			 */

			this.Fiber(function() {


				collection.update(
					{
						'sys.id': entry.sys.id
					},
					updateData,
					{
						upsert: true
					}	
				);

				deferred.resolve({
					status: 'ok',
					message: 'Contentful content updated ok'
				})

			}).run();
		}
		else {
			deferred.reject({
				status: 'error',
				message: 'Specified collection does not exist.'
			});
		}
		
		return deferred.promise;
	},

	/**
	 *	Function to write a response message to a request
	 *	
	 *	@method 	makeResponse
	 *	@param		{Object} res 			- a http response object
	 *	@param 		{Object} responseData	- response data to return to the client
	 *	@return 	undefined - returns nothing
	 */
	makeResponse: function(res, responseData) {

		res.writeHead(responseData.statusCode, responseData.contentType);
		if(responseData.contentType === 'application/json') {
			res.end(JSON.stringify(responseData.data));
		}
		else {
			res.end(responseData.data);
		}
	}
};