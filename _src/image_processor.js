'use strict';

ImageProcessor = {

	/**
	 *	Node dependencies
	 */
	Future: Npm.require('fibers/future'),
	request: Npm.require('request'),
	gm: Npm.require('gm'),
	fs: Npm.require('fs'),

	/**
	 *	Object props
	 */
	settings: Meteor.settings.imageprocessor,
	queue: [],
	isrunning: false,
	observer: false,

	/**
	 *	Check settings exist
	 *	@return {Boolean} - true if settings is not undefined
	 */
	hasSettings: function() {
		return typeof this.settings !== 'undefined';
	},

	/**
	 *	Recursively act on items in the queue, sequentially processing 
	 *	each one and then popping the job from the queue when done
	 */
	run: function() {
		var job,
				action;

		if(this.queue.length === 0 || this.isrunning) {
			return;
		}
		
		this.isrunning = true;
		job = this.queue[0];
		switch(job.task) {
			case 'create': 
				action = this.generate.bind(this, job);
				break;
			case 'delete': 
				action = this.remove.bind(this, job);
				break;
		}
		
		action();
		this.queue = this.queue.slice(1);
		this.isrunning = false;
		this.run();
	},

	/** 
	 *	Remove file given an image asset has been deleted.
	 *	@param {Object} job - the job containing the asset which contains the asset ID we need 
	 *												to identify the files that need to be removed.
	 */
	remove: function(job) {
		var fs = this.fs,
				asset_id = job.asset.sys.id,
				path = this.settings.directory,
				files = fs.readdirSync(path);

		files.filter(function(file) {
			return file.indexOf(asset_id) !== -1;
		}).forEach(function(for_deletion) {
			fs.unlink(path + '/' + for_deletion, Meteor.bindEnvironment(function(err) {
				if(err) {
					throw new Meteor.Error(500, 'Could not delete file with name: ' + for_deletion);
				}
			}));
		});

		Collections.removeFromCollection('images', {asset_id: asset_id});
	},

	/**
	 *	Function to generate images, first by fetching the source stream and then recurisvely 
	 *	outputting each image by adding a job to a queue.
	 *	@param {Object} job - the job containing the asset source 
	 */
	generate: function(job) {
		var future = new this.Future(),
				settings = this.settings,
				asset = job.asset,
				source = 'http:' + asset.fields.file.url,
				category = settings.categories[asset.fields.description];

		job.queue = this.outputs(asset, category);

		this.request({url: source, encoding: null}, Meteor.bindEnvironment(function(err, response, body) {
			if(err) {
				future.return({ok: false});
			}
			else {
				job.stream = body;
				this.save(job, function() {
					future.return({ok: true});
				});
			}
		}.bind(this)));

		return future.wait();
	},

	/**
	 *	Use GM to resize and write file based on a job. This gets called recursively and executes a callback when done
	 *	@param {Object} job - details of the asset on the job queue
	 *	@param {Function} callback - callback function to execute when all jobs have been processed. 
	 */
	save: function(job, callback) {
		if(job.queue.length === 0) {
			callback();
			return;
		}

		var process = job.queue[0],
				settings = this.settings,
				stream = job.stream,
				action;

		action = this.gm(stream).setFormat(process.filetype);
		if(typeof process.background !== 'undefined') {
			action = action.background(process.background).flatten();
		}
		else {
			delete process.background;
		}

		action.resize(process.width)
		.write(settings.directory + '/' + process.filename, Meteor.bindEnvironment(function(err) {
			job.queue = job.queue.slice(1);
			this.saveToCollection(process);
			this.save(job, callback);
		}.bind(this)));		
	},

	/**
	 *	Save a reference to the generated image to the images collection
	 *	@param {Object} process - contains details that need to be added to the images collection
	 */
	saveToCollection: function(process) {
		if(typeof process !== 'object') {
			throw new Meteor.Error(500, 'Cannot save process of type ' + typeof process);
		}
		var selector = {asset_id: process.asset_id, filename: process.filename},
				modifier = process;
		Collections.updateToCollection('images', selector, modifier);
	},

	/**
	 *	Generate output filenames, sizes etc for a processing job
	 *	@param {Object} asset - used to generate the correct filename for an image
	 *	@param {Object} category - sizes that need to be generated
	 *	@return {Object} - generated sizes and filenames with pixel densitites 
	 */
	outputs: function(asset, category) {
		if(typeof asset !== 'object' || typeof category !== 'object') {
			throw new Meteor.Error(500, 'Output generation needs a valid asset and category.');
		}
		var sizes = category.sizes,
				filetype = category.filetype,
				background = category.background,
				id = asset.sys.id,
				densities = [
					{prefixed: '', multiplier: 1}, 
					{prefixed: '@2x', multiplier: 2}, 
					{prefixed: '@3x', multiplier: 3}
				],
				outputs = [];

		sizes.forEach(function(size) {
			densities.forEach(function(density, index) {
				outputs.push({
					asset_id: asset.sys.id,
					filename: id + '-' + size.device + density.prefixed + '.' + filetype,
					width: size.width * (density.multiplier),
					density: density,
					filetype: filetype,
					background: background
				});
			});
		});
		
		return outputs;
	},

	/**
	 *	Observe changes to the assets collection and run callbacks
	 */
	observe: function() {
		var query = Collections.assets.find({});

		Meteor.bindEnvironment(function() {
			this.observer = query.observeChanges({
				added: this.assetAdded.bind(this),
				changed: this.assetChanged.bind(this),
			});
			Collections.assets.after.remove(function(userId, asset) {
				this.assetRemoved(asset);
			}.bind(this));
		}.bind(this), function() {
			throw new Meteor.Error(500, 'Failed to bind environment when observing asset collection changes.');
		})();
	},

	/**
	 *	Stop observing changes in the assets collection
	 */
	stopObserving: function() {
		this.observer.stop();
		this.observer = false;
	},

	/**
	 *	Run when an asset has been added
	 *	@param {String} id - the id generated by Meteor
	 *	@param {Object} asset - the asset that has been added to the collection
	 */
	assetAdded: function(id, asset) {
		if(typeof asset !== 'object') {
			throw new Meteor.Error(500, 'Cannot add an invalid asset.');
		}
		var asset_is_new = (asset.fetchedAt === asset.refreshedAt);
		if(asset_is_new) {
			this.queue.push({
				asset: asset,
				task: 'create'
			});
			this.run();
		}
	},

	/**
	 *	Run when an asset has been changed
	 *	@param {String} id - the id generated by Meteor
	 *	@param {Object} asset - the asset that has been changed in the collection
	 */
	assetChanged: function(id, asset) {
		if(typeof asset !== 'object') {
			throw new Meteor.Error(500, 'Cannot update an invalid asset.');
		}
		this.queue.push({
			asset: asset,
			task: 'create'
		});
		this.run();
	},

	/**
	 *	Run when an asset has been removed
	 *	@param {Object} - the asset that was removed
	 */
	assetRemoved: function(asset) {
		if(typeof asset !== 'object') {
			throw new Meteor.Error(500, 'Cannot remove an invalid asset.');
		}
		this.queue.push({
			asset: asset,
			task: 'delete'
		});
		this.run();
	}
};