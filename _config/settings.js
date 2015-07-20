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
	endpointUrl: Meteor.settings.contentful.endpointUrl,

	/**
	 *	Authorisation header
	 *	
	 *	@property	authorisationHeader
	 *	@type		{String}
	 */
	authorisationHeader: Meteor.settings.contentful.authorisationHeader,

	/**
	 *	Content type header
	 *	
	 *	@property	contentTypeHeader
	 *	@type 		{String}
	 */
	contentTypeHeader: Meteor.settings.contentful.contentTypeHeader,

	/**
	 *	Space ID
	 *	
	 *	@property	spaceID
	 *	@type 		{String}
	 */
	spaceID: Meteor.settings.contentful.spaceID,

	/**
	 *	Collection name for processed Contentful Images
	 *
	 *	@property 	processedImageCollectionName
	 *	@type 		{String}
	 */
	processedImageCollectionName: Meteor.settings.contentful.processedImageCollectionName,

	/**
	 *	Callback authorisation key, for when Contentful post data to us
	 *	on update to an entry
	 *
	 *	@property	callbackAuthKey
	 *	@type 		{String}
	 */
	callbackAuthKey: Meteor.settings.contentful.callbackAuthKey,

	/**
	 *	Array of content type objects with their name and associated ID
	 *	
	 *	@property	contentTypes
	 *	@type 		{Array}
	 */
	contentTypes: Meteor.settings.contentful.contentTypes,

	/**
	 *	Image settings and sizes for transforming image assets
	 *
	 *	@property 	imageProcessor
	 *	@type 		{Array}
	 */
	imageProcessor: {
		path: Meteor.settings.contentful.imageProcessor.path,
		baseUrl: Meteor.settings.contentful.imageProcessor.baseUrl,
		quality: Meteor.settings.contentful.imageProcessor.quality,
		pixelDensities: Meteor.settings.contentful.imageProcessor.pixelDensities,
		imageTypes: Meteor.settings.contentful.imageProcessor.imageTypes
	}
};