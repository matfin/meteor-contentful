Tinytest.add('Contentful - checkCFCredentails should return true if the header authorisation key matches the key stored in the contentful config file.', function(test) {
	/**
	 *	Stubbing objects for the test
	 */
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

});


Tinytest.add('Contentful - checkCFCredentails should return false if the header authorisation key does not match the key stored in the contentful config file.', function(test) {
	
	/**
	 *	Stubbing objects for the test
	 */
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

});


Tinytest.add('Contentful - contentTypeName should return the correctly matching name of a content type given its id.', function(test) {

	/**
	 *	Stubbing objects for the test
	 */
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

	test.equal(Contentful.contentTypeName(entry), 'testName');

});


Tinytest.add('Contentful - contentTypeName should return the string \'nested\' if no content type name is found.', function(test) {

	/**
	 *	Stubbing objects for the test
	 */
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

	test.equal(Contentful.contentTypeName(entry), 'nested');

});
