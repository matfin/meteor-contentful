/**
 *	Class for fetching an image stored on Contentful servers, resizing them
 *	and storing them on the local running server.
 *
 *	@class ImageProcessor
 *	@static
 */
ImageProcessor = {

	/**
	 *	Meteor Fiber needed for making async calls
	 */
	Fiber: false,

	/**
	 *	GM module for resizing images
	 */
	GM: false,

	/**
	 *	Node FS module for filesystem access
	 */
	FS: false,

	/**
	 *	Server side collection to store information about
	 *	processed image assets
	 */
	imageCollection: new Mongo.Collection(CFConfig.processedImageCollectionName),

	/**
	 *	Incoming cursor for existing Contentful assets
	 */
	contentfulAssets: false,

	/**
	 *	Image operations queue to store operations which
	 *	need to be dequentially executed
	 */
	imageOperationQueue: [],

	/**
	 *	Boolean to indicate if the image operation queue is running
	 */
	imageOperationQueueIsRunning: false,

	/**
	 *	Function to iterate through each contentful asset
	 *
	 *	@method 	init
	 */
	init: function() {

		/**
		 *	This module requires access to npm modules.
		 */
		if(!Meteor.npmRequire) {
			return;
		}

		/**
		 *	Required meteor node npm modules
		 */
		this.Fiber = Meteor.npmRequire('fibers');
		this.GM = Meteor.npmRequire('gm');
		this.FS = Meteor.npmRequire('fs');

		/**
		 *	Observe changes to the asset collection so we can update
		 *	the image collection here.
		 */
		this.observeAssetChanges();

		/**
		 *	Log the current status of the processed image collection
		 */
		var self = this;
		this.Fiber(function(){
			console.log('Size of processed images collection: ', self.imageCollection.find({}).count());
		}).run();
	},

	/**
	 *	Function to observe changes to the assets collection
	 *
	 *	@method 	observeAssetChanges
	 */
	observeAssetChanges: function() {

		var self = this;

		this.Fiber(function() {

			Contentful.collections.assets.find({}).observeChanges({
				added: function(id, asset) {
							
					self.addImageJob(asset, false).then(function() {
						Logger.log('collection', {
							message: 'Asset added'
						});
						self.startImageOpQueue();
					});
				},
				changed: function(id, asset) {
										
					self.addImageJob(asset, true).then(function() {
						Logger.log('collection', {
							message: 'Asset changed'
						});
						self.startImageOpQueue();
					});
				},
				removed: function(id, asset) {

					Logger.log('collection', {
						message: 'Asset removed'
					});
					self.imageCollection.remove({assetId: id});
				}
			});

		}).run();
	},

	/**
	 *	Function to update the collection with image data
	 *
	 *	@method 	updateImagesCollection
	 *	@param 		{Object} imageData - the image data
	 */
	updateImagesCollection: function(imageData) {

		var self = this;

		/**
		 *	Collection updates need to be run within a Fiber
		 */
		this.Fiber(function() {

			self.imageCollection.update(
				{
					assetId: imageData.assetId,
					'size.device': imageData.size.device,
					'pixelDensity.multiplier': imageData.pixelDensity.multiplier
				},
				{
					size: imageData.size,
					pixelDensity: imageData.pixelDensity,
					url: CFConfig.imageProcessor.baseUrl + '/' + imageData.filename,
					assetId: imageData.assetId
				},
				{
					upsert: true
				}
			);
		}).run();
	},

	/**
	 *	Function to resize, then write images to the filesystem
	 *
	 *	@method 	processImages
	 *	@param 		{String} sourceFilePath - the source file to process
	 *	@param 		{Object} asset - asset representing the file
	 *	@param 		{Boolean} ignoreResize - if this parameter is true, do not attempt to create resized assets. Default false
	 *	@return 	{Object} - a promise resolved or rejected
	 */
	processImages: function(sourceFilePath, asset, ignoreResize) {

		var self = this,
			deferred = Q.defer(),
			resizeParams = asset.imageResizeParams,
		runloop = function() {
			/**
			 *	If we still have image data in the queue 
			 */
			if(resizeParams.length > 0) {
				/**
				 *	Grab the first item in the queue
				 */
				var resizeParam 		=	resizeParams[0],
					destinationFileName = 	asset.sys.id + '-' + resizeParam.size.device + resizeParam.pixelDensity.prefix + '.' + resizeParam.fileType,
					destinationFilePath = 	CFConfig.imageProcessor.path + 'processed/'; 
											
				/**
				 *	If we want to prevent resizing and rewriting the images to the filesystem
				 */
				if(ignoreResize) {
					/**
					 *	Update the processed images collection only
					 */
					self.updateImagesCollection({
						assetId: asset.sys.id,
						size: resizeParam.size,
						pixelDensity: resizeParam.pixelDensity,
						filename: destinationFileName
					});
				
					/**
					 *	And continue on with the loop
					 */
					resizeParams.splice(0,1);
					runloop();
				}
				else {
					/**
					 *	Create resized image, writing it to the filesystem
					 */
					self.GM(sourceFilePath)
					.setFormat(resizeParam.fileType)
					.resize(resizeParam.size.width * resizeParam.pixelDensity.multiplier)
					.write(destinationFilePath + destinationFileName, function(err) {

						/**
						 *	Log any errors
						 */
						if(err) {
							Logger.log('error', {
								message: 'Could not save resized image.',
								data: err
							});
						}
						/**
						 *	Update the processed images collection
						 */
						self.updateImagesCollection({
							assetId: asset.sys.id,
							size: resizeParam.size,
							pixelDensity: resizeParam.pixelDensity,
							filename: destinationFileName
						});

						/**
						 *	And continue on anyway
						 */
						resizeParams.splice(0,1);
						runloop();
					});		
				}
			}
			else {
				/**
				 *	Resolve the promise if there are no more items in the queue
				 */
				deferred.resolve();
			}
		};

		/**
		 *	Kick off the processing loop
		 */
		runloop();

		/**
		 *	Returned promise
		 */
		return deferred.promise;
	},

	/**
	 *	Function to check if a source image already exists, 
	 *	so it is not repeatedly processed
	 *	
	 *	@method 	sourceFileExists
	 *	@param 		{String} fullPath - source image file name
	 *	@param 		{Object} callback - callback to run on checking file
	 */
	sourceFileExists: function(fullPath, callback) {
		var exists 	= this.FS.open(fullPath, 'r', function(err, fd) {
			if(err) {
				callback(false);	
			}
			else {
				callback(true);
			}
		});
	},

	/**
	 *	Function to sequentially process images inside the operations queue
	 *	
	 *	@method 	startImageOpQueue
	 */
	startImageOpQueue: function() {

		/**
		 *	If the image operation queue is already running, exit
		 */
		if(this.imageOperationQueueIsRunning) {
			return;
		}

		var self = this,
		runloop = function() {
			/**
			 *	Set the running state of the image 
			 *	operation queue
			 */
			self.imageOperationQueueIsRunning = true;

			/**
			 *	If we still have jobs in the queue
			 */
			if(self.imageOperationQueue.length > 0) {

				/**
				 *	Starting at the first job
				 */
				var asset 			= self.imageOperationQueue[0],
					assetUrl 		= asset.fields.file.url,
					assetFilePath 	= CFConfig.imageProcessor.path + 'source/' + asset.sys.id;

				/**
				 *	Check and see if the image has already been processed, then
				 *	stop at this point if it has, only if an overwrite is not forced.
				 */				
				self.sourceFileExists(assetFilePath, function(exists) {
					if(exists && !asset.forceOverwrite) {
						/**
						 *	If the file exists and should not be overwritten, 
						 *	pop the image processing job from the queue
						 *	and then move onto the next job.
						 *
						 *	Even if the image exists, we will need to ensure
						 *	its details also exist in the database.
						 */
						self.processImages(assetFilePath, asset, true).fin(function() {
							self.imageOperationQueue.splice(0, 1);
							runloop();
						});

						return;
					}
					else {
						/**
						 *	Sequentially read in the image data from the asset source.
						 *	We should only do this once at a time
						 */
						self.readRemoteFileFromUrl(assetUrl).then(function(result) {

							/**
							 *	Write the original file to the filesystem
							 */
							self.FS.writeFile(assetFilePath, result.data, {encoding: 'binary'}, function(err) {

								if(err) {
									Logger.log('error', {
										message: 'Could not save source image.',
										data: err
									});
								}
								else {
									/**
									 *	Given the source file, start resizing the images sequentially
									 *	and continue on with the processing queue no matter what the 
									 *	outcome of processing is.
									 */
									self.processImages(assetFilePath, asset).fin(function() {
										self.imageOperationQueue.splice(0, 1);
										runloop();
									});
								}
							});

						}).fail(function(error) {
							/**
							 *	Drop the job from the operations queue
							 *	even if it failed.
							 */
							Logger.log('error', {
								message: 'Error fetching remote resource',
								data: {
									assetUrl: assetUrl,
									error: error
								}
							});
							self.imageOperationQueue.splice(0, 1);
							runloop();
						});
					}
				});
			}
			else {
				self.imageOperationQueueIsRunning = false;
				return;
			}
		};

		/**
		 *	Start batch processing the images
		 */
		runloop();
	},

	/**
	 *	Function to batch resize images
	 *
	 *	@method 	addImageJob
	 *	@param 		{Object} 	asset - the image asset type and the source data for the image
	 *	@param 		{Boolean} 	forceOverwrite - force overwrite of an existing image
	 *	@param 		{Object} 	callback - optional callback to be executed
	 */
	addImageJob: function(asset, forceOverwrite) {

		var self 			= this,
			deferred 		= Q.defer(),		
			type 			= asset.fields.description,
			fileType		= CFConfig.imageProcessor.imageTypes[type].fileType,
			sizes 			= CFConfig.imageProcessor.imageTypes[type].sizes,
			pixelDensities	= CFConfig.imageProcessor.pixelDensities,
			iteration 		= pixelDensities.length * sizes.length;

		/**
		 *	Attach resize params to the asset and whether 
		 *	or not to force an overwrite of existing images.
		 */
		asset.imageResizeParams = [];
		asset.forceOverwrite = forceOverwrite;

		/**
		 *	Loop through each size 
		 */
		_.each(sizes, function(size) {

			/** 
			 *	Then loop through the given pixel densities
			 */
			_.each(pixelDensities, function(pixelDensity) {

				/**
				 *	Create and push the resize parameter to the assets resizeParams stack
				 */
				var imageResizeParam = {
					size: size,
					pixelDensity: pixelDensity,
					fileType: fileType
				};
				asset.imageResizeParams.push(imageResizeParam);
				
				/**
				 *	Resolve the promise when all params have been added 
				 *	to the assets queue
				 */
				if(asset.imageResizeParams.length === iteration) {
					self.imageOperationQueue.push(asset);
					deferred.resolve();
				}
			});
		});

		return deferred.promise;
	},

	/**
	 *	Function to read the contents of a remote resource
	 *
	 *	@method 	readRemoteFileFromUrl
	 *	@param 		{String} url - the url for the resource
	 *	@return  	{Object} - a resolved or rejected promise
	 */
	readRemoteFileFromUrl: function(url) {
		var deferred 	= Q.defer(),
			http 		= Npm.require('http'),
			url 		= 'http:' + url;
		/**
		 *	We need to use the nodejs http module,
		 *	since Meteor HTTP can only deal with 
		 *	String and Json data.
		 */
		var req = http.get(url, function(response) {

			/**
			 *	Buffer to store incoming stream of data
			 */ 
			var data = '';

			/**
			 *	Expecting a binary encoded response
			 */
			response.setEncoding('binary');

			/**
			 *	When data comes in, ammend the buffer
			 */
			response.on('data', function(chunk) {	
				data += chunk;
			});

			/**
			 *	If there was an error
			 */
			response.on('error', function(error) {
				deferred.reject({
					status: 'error',
					data: error
				});
			});

			/**
			 *	Download complete
			 */
			response.on('end', function() {
				deferred.resolve({
					status: 'ok',
					data: data
				});
			});
		});

		return deferred.promise;
	}
};
