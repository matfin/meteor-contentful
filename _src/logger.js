/**
 *	Class for logging content related errors to a Mongo collection. 
 *	This is much better than logging to the command line.
 *	
 *	@class Logger
 *	@static
 */
Logger = {

	/**
	 *	Fiber needed for updating collections
	 */
	Fiber: false,

	/**
	 *	Collection for storing log files
	 */
	logCollection: new Mongo.Collection('logs'),

	/**
	 *	Only log if the logger has been activated
	 */
	isActive: false,

	/**
	 *	Function to log to the collection
	 *
	 *	@method		log
	 *	@param 		{String} type - String representing the logged item type
	 *	@param 		{Object} item - the item being logged
	 */
	log: function(type, item) {
		var self = this;

		if(!self.isActive) return;

		this.Fiber(function() {

			self.logCollection.insert({
				timestamp: new Date(),
				type: type,
				item: item
			});

		}).run();
	},

	/**
	 *	Function to publish the log collection client side and set up the fiber
	 *
	 *	@method 	initAndPublish
	 *	@return  	undefined - returns nothing
	 */
	initAndPublish: function() {
		var self = this;
		
		this.isActive = true;
		this.Fiber = Meteor.npmRequire('fibers');

		Meteor.publish('logs', function() {
			return self.logCollection.find({});
		});
	}

};