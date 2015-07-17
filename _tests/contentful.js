Tinytest.add('Contentful - checkCFCredentails should return true if the header authorisation key matches the key stored in the contentful config file.', function(test) {
	/**
	 *	Create clone of objects that will be modified
	 *	and create stubs
	 */
	var CFConfig_backup = _.clone(CFConfig);
	var request = {
		headers: {
			authorization: '123456'
		}
	};
	CFConfig.callbackAuthKey = '123456';

	/**
	 *	Running the test
	 */
	test.equal(Contentful.checkCFCredentials(request), true);

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;

});


Tinytest.add('Contentful - checkCFCredentails should return false if the header authorisation key does not match the key stored in the contentful config file.', function(test) {
	/**
	 *	Stubbing objects for the test and creating backups
	 */
	var CFConfig_backup = _.clone(CFConfig);
	var request = {
		headers: {
			authorization: '7891011'
		}
	};
	CFConfig.callbackAuthKey = '123456';
	
	/**
	 *	Running the test
	 */
	test.equal(Contentful.checkCFCredentials(request), false);

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;
});


Tinytest.add('Contentful - contentTypeName should return the correctly matching name of a content type given its id.', function(test) {
	/**
	 *	Stubbing objects for the test and creating backups
	 */
	var CFConfig_backup = _.clone(CFConfig);
	var entry = {
		sys: {
			contentType: {
				sys: {
					id: '12345'
				}
			}
		}
	};
	/**
	 *	Adding in a test content type name
	 */
	CFConfig.contentTypes.push({
		'name': 'testName',
		'id': '12345'
	});

	/**
	 *	Running the test
	 */
	test.equal(Contentful.contentTypeName(entry), 'testName');

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;

});


Tinytest.add('Contentful - contentTypeName should return the string \'nested\' if no content type name is found.', function(test) {
	/**
	 *	Stubbing objects for the test and creating backups
	 */
	var CFConfig_backup = _.clone(CFConfig);
	var entry = {
		sys: {
			contentType: {
				sys: {
					id: '123456789'
				}
			}
		}
	};
	/**
	 *	Adding in a test content type name
	 */
	CFConfig.contentTypes.push({
		'name': 'testName',
		'id': '11'
	});

	/**
	 *	Running the test
	 */
	test.equal(Contentful.contentTypeName(entry), 'nested');

	/**
	 *	Cleanup
	 */
	CFConfig = CFConfig_backup;

});


Tinytest.add('Contentful - handleRequest should call contentPublish when the header contains ContentManagement.Entry.publish or ContentManagement.Asset.publish', function(test) {

	/**
	 *	Stubbing the request and creating backups
	 */
	var Contentful_backup = _.clone(Contentful);
	var request = {
		headers: {
			'x-contentful-topic': 'ContentManagement.Entry.publish'
		}
	};	

	var publishCallCount = 0;

	Contentful.contentPublish = function(){
		publishCallCount++;
	};

	/**
	 *	Run the function (for Entry)
	 */
	Contentful.handleRequest(request);

	/**
	 *	Reset the stub and pass in asset publish
	 */
	request = {
		headers: {
			'x-contentful-topic': 'ContentManagement.Asset.publish'
		}
	};

	/**
	 *	Run the function (for Asset)
	 */
	Contentful.handleRequest(request);

	/** 
	 *	Testing
	 */
	test.equal(publishCallCount, 2);


	/**
	 *	Cleanup
	 */
	Contentful = Contentful_backup;

});


Tinytest.add('Contentful - handleRequest should call contentUnpublish when the header contains ContentManagement.Entry.unublish or ContentManagement.Asset.unpublish', function(test) {

	/**
	 *	Stubbing the request and creating backups
	 */
	var Contentful_backup = _.clone(Contentful);
	var request = {
		headers: {
			'x-contentful-topic': 'ContentManagement.Entry.unpublish'
		}
	};	

	var unpublishCallCount = 0;

	Contentful.contentUnpublish = function(){
		unpublishCallCount++;
	};

	/**
	 *	Run the function (for Entry)
	 */
	Contentful.handleRequest(request);

	/**
	 *	Reset the stub and pass in asset publish
	 */
	request = {
		headers: {
			'x-contentful-topic': 'ContentManagement.Asset.unpublish'
		}
	};

	/**
	 *	Run the function (for Asset)
	 */
	Contentful.handleRequest(request);

	/** 
	 *	Testing
	 */
	test.equal(unpublishCallCount, 2);


	/**
	 *	Cleanup
	 */
	Contentful = Contentful_backup;

});


Tinytest.addAsync('Contentful - unPublish should call remove() on a collection and resolve on a promise if the request body sys.type is DeletedEntry or DeltetedAsset, or reject the promise otherwise', function(test, onComplete) {

	/**
	 *	Creating backups and stubs
	 */
	var Contentful_backup = _.clone(Contentful);
	var Q_backup = _.clone(Q);
	var requestBody = {
		sys: {
			type: 'DeletedEntry'
		}
	};

	var removeCallCount = 0,
			deferRejectCallCount = 0,
			deferResolveCallCount = 0;

	Contentful.collections.entries = Contentful.collections.assets = {
		remove: function() {
			removeCallCount++;
		}
	};

	Q.defer = function() {
		return {
			reject: function() {
				deferRejectCallCount++;
			},
			resolve: function() {
				deferResolveCallCount++;
			}
		}
	};

	/**
	 *	Call the function and run the test (for DeletedEntry)
	 */
	Contentful.contentUnpublish(requestBody);
	test.equal(removeCallCount, 1);
	test.equal(deferResolveCallCount, 1);

	/**
	 *	Resetting requestBody for another test
	 */
	requestBody = {
		sys: {
			type: 'DeletedAsset'
		}
	};

	/**
	 *	Call the function and run the test (for DeletedAsset)
	 */
	Contentful.contentUnpublish(requestBody);
	test.equal(removeCallCount, 2);
	test.equal(deferResolveCallCount, 2);

	/**
	 *	Resetting requestBody for another test
	 */
	requestBody = {
		sys: {
			type: 'InvalidEntry'
		}
	};

	/**
	 *	Call the function and run the test (to trigger a rejected promise)
	 */
	Contentful.contentUnpublish(requestBody);
	test.equal(deferRejectCallCount, 1);

	/**
	 *	Cleanup
	 */
	Contentful = Contentful_backup;
	Q = Q_backup;

	onComplete();
});


Tinytest.addAsync('Contentful - contentPublish should call collection update if entry.sys.type is Asset or Entry, or reject a promise if not.', function(test, onComplete) {

	/**
	 *	Creating backups and stubs
	 */
	var Contentful_backup = _.clone(Contentful),
			Q_backup = _.clone(Q);

	var collectionUpdateCallCount = 0,
			deferRejectCallCount = 0,
			deferResolveCallCount = 0;

	Contentful.collections.entries = Contentful.collections.assets = {
		update: function() {
			collectionUpdateCallCount++;
		}
	};

	Q.defer = function() {
		return {
			resolve: function() {
				deferResolveCallCount++;
			},
			reject: function() {
				deferRejectCallCount++;
			}
		}
	};

	var requestBody = {
		fields: {
			'en-US': {}
		},
		sys: {
			id: '12345',
			type: 'Entry'
		}
	};

	/**
	 *	Call the function and then run the test (for update to Entry)
	 */
	Contentful.contentPublish(requestBody);
	test.equal(collectionUpdateCallCount, 1);
	test.equal(deferResolveCallCount, 1);

	/**
	 *	Reset the request body
	 */
	requestBody = {
		fields: {
			'en-US': {}
		},
		sys: {
			id: '12345',
			type: 'Asset'
		}
	};

	/**
	 *	Call the function and run the test (for update to Asset)
	 */	
	Contentful.contentPublish(requestBody);
	test.equal(collectionUpdateCallCount, 2);
	test.equal(deferResolveCallCount, 2);

	/**
	 *	Reset the request body
	 */
	requestBody = {
		fields: {
			'en-US': {}
		},
		sys: {
			id: '12345',
			type: 'Invalid'
		}
	};

	/**
	 *	Call the function and run the test (for promise rejection)
	 */
	Contentful.contentPublish(requestBody);
	test.equal(deferRejectCallCount, 1);

	/**
	 *	Cleanup
	 */
	Contentful = Contentful_backup;
	Q = Q_backup;

	onComplete();

});


Tinytest.add('Contentful - should call res.end() with a string if the content type is application/json or an object if not', function(test) {

	/**
	 *	Creating stubs
	 */
	var writeHeadCallCount = 0,
			endCallCount = 0;

	var res = {
		writeHead: function() {
			writeHeadCallCount++;
		},
		end: function(param) {
			/**
			 *	Run the test
			 */
			test.instanceOf(param, Object);
		}
	};

	var responseData = {
		statusCode: {},
		contentType: 'nothing',
		data: {
			x: '1',
			y: '2',
			z: '3'
		}
	};

	/** 
	 *	Run the function (with no content type)
	 */
	Contentful.makeResponse(res, responseData);

	/**
	 *	Resetting res 
	 */
	res.end = function(param) {
		test.equal(param.constructor.name, 'String');
	};

	/**
	 *	Resetting responseData
	 */
	responseData.contentType = 'application/json';

	/**
	 *	Run the function (with application/json as the content type)
	 */
	Contentful.makeResponse(res, responseData);

});
