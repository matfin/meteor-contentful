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
	test.equal(Contentful.checkCFCredentials(request), false);

});