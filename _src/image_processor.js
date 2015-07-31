'use strict';

ImageProcessor = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),
	request: Npm.require('request'),
	gm: Npm.require('gm'),
	fs: Npm.require('fs'),

	/**
	 *	Object props
	 */
	settings: Meteor.settings.imageprocessor,
	queue: [],
	isrunning: false,

	/**
	 *	Check settings exist
	 */
	hasSettings: function() {
		return typeof this.settings !== 'undefined';
	},

	/**
	 *	Recursively act on items in the queue, sequentially processing each one
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
				console.log('We need to delete something!');
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
	 */
	remove: function(job) {
		var fs = this.fs,
				id = job.id,
				path = this.settings.directory,
				files;

		console.log('Find and remove with ID: ', id);

		// fs.readdir(path, function(err, files) {
		// 	console.log(err, files);
		// });

		files = fs.readdirSync(path);

		files.filter(function(file) {
			
		}).forEach(function(for_deletion) {
			console.log('Delete file: ', for_deletion);
		});

	},

	generate: function(job) {
		var current = this.Fiber.current,
				settings = this.settings,
				asset = job.asset,
				source = 'http:' + asset.fields.file.url,
				category = settings.categories[asset.fields.description],
				result;

		job.queue = this.outputs(asset, category);

		this.request({url: source, encoding: null}, function(err, response, body) {
			if(err) {
				current.run({ok: false});
			}
			else {
				job.stream = body;
				this.save(job, function() {
					current.run({ok: true});
				});
			}
		}.bind(this));

		result = this.Fiber.yield();
		return result;
	},

	/**
	 *	Use GM to resize and write file based on a job. This gets called recursively.
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

		action.resize(process.width)
		.write(settings.directory + '/' + process.filename, function(err) {
			job.queue = job.queue.slice(1);
			this.save(job, callback);
		}.bind(this));		
	},

	outputs: function(asset, category) {
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
		this.Fiber((function() {
			Collections.assets.find({}).observeChanges({
				added: this.assetAdded.bind(this),
				changed: this.assetChanged.bind(this),
				removed: this.assetRemoved.bind(this)
			});
		}).bind(this)).run();
	},

	/**
	 *	When an asset has been added
	 */
	assetAdded: function(id, asset) {
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
	 *	When an asset has been changed
	 */
	assetChanged: function(id, asset) {
		this.queue.push({
			asset: asset,
			task: 'create'
		});
		this.run();
	},

	/**
	 *	When an asset has been removed
	 */
	assetRemoved: function(id) {
		this.queue.push({
			id: id,
			task: 'delete'
		});
		this.run();
	}
};