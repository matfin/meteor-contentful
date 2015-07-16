/**
 *	Class storing configuration for the Contentful content delivery API
 *
 *	@class CFConfig
 *	@static
 */
CFConfig = {
	
	/**
	 *	Contentful endpoint URL
	 *	
	 *	@property	endpointUrl
	 *	@type		{String}
	 */
	endpointUrl: 'http://cdn.contentful.com',

	/**
	 *	Authorisation header
	 *	
	 *	@property	authorisationHeader
	 *	@type		{String}
	 */
	authorisationHeader: 'Bearer <Your auth id>',

	/**
	 *	Content type header
	 *	
	 *	@property	contentTypeHeader
	 *	@type 		{String}
	 */
	contentTypeHeader: 'application/vnd.contentful.delivery.v1+json',

	/**
	 *	Space ID
	 *	
	 *	@property	spaceID
	 *	@type 		{String}
	 */
	spaceID: '<your space ID>',

	/**
	 *	Collection name for processed Contentful Images
	 *
	 *	@property 	processedImageCollectionName
	 *	@type 		{String}
	 */
	processedImageCollectionName: 'ac_images',

	/**
	 *	Callback authorisation key, for when Contentful post data to us
	 *	on update to an entry
	 *
	 *	@property	callbackAuthKey
	 *	@type 		{String}
	 */
	callbackAuthKey: '<Optional callback auth key>',

	/**
	 *	Array of content type objects with their name and associated ID
	 *	
	 *	@property	contentTypes
	 *	@type 		{Array}
	 */
	contentTypes: [
		{
			'name': '<content type name>',
			'id': 	'<content type id>'
		}
	],

	/**
	 *	Image settings and sizes for transforming image assets
	 *
	 *	@property 	imageProcessor
	 *	@type 		{Array}
	 */
	imageProcessor: {
		path: '<local filesystem path>',
		baseUrl: 'http://sub.example.tld',
		quality: 0.9,
		pixelDensities: [
			{
				prefix: "",
				multiplier: 1
			},
			{
				prefix: "@2x",
				multiplier: 2
			},
			{
				prefix: "@3x",
				multiplier: 3
			}
		],
		imageTypes: {
			portfolio: {
				fileType: 'jpg',
				sizes: [
					{
						device: 'desktop',
						width: 685,
						height: 405
					},
					{
						device: 'laptop',
						width: 548,
						height: 324
					},
					{
						device: 'tablet',
						width: 768,
						height: 454
					},
					{
						device: 'mobile',
						width: 640,
						height: 378
					}
				]
			},
			logo: {
				fileType: 'png',
				sizes: [
					{
						device: 'desktop',
						width: 80,
						height: 80
					},
					{
						device: 'laptop',
						width: 80,
						height: 80
					},
					{
						device: 'tablet',
						width: 70,
						height: 70
					},
					{
						device: 'mobile',
						width: 50,
						height: 50
					}
				]
			}
		}
	}
	}
}