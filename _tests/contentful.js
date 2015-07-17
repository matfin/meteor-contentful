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
