'use strict';

ImageProcessor = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),
	request: Npm.require('request'),
	gm: Npm.require('gm'),

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
	 *	Check if a file exists
	 */
	exists: function(fullpath) {
		var current = this.Fiber.current,
				fs = This.FS,
				result;

		fs.open(fullPath, 'r', function(err, fp) {
			if(err) {
				current.run(false);
			}
			else {
				current.run(true);
			}
		});

		result = this.Fiber.yield();
		return result;
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
				action = this.generate.bind(this, job, false);
				break;
			case 'update':
				action = this.generate.bind(this, job, true);
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

	generate: function(job, overwrite) {
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
				stream = job.stream;
		
		this.gm(stream)
		.setFormat(process.filetype)
		.resize(process.width)
		.write(settings.destination + '/' + process.filename, function(err) {
			job.queue = job.queue.slice(1);
			this.save(job, callback);
		}.bind(this));		
	},

	outputs: function(asset, category) {
		var sizes = category.sizes,
				filetype = category.filetype,
				id = asset.sys.id,
				densities = ['', '@2x', '@3x'],
				outputs = [];

		sizes.forEach(function(size) {
			densities.forEach(function(density, index) {
				outputs.push({
					filename: id + '-' + size.device + density + '.' + filetype,
					width: size.width * (index + 1),
					filetype: filetype
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

		console.log('Was this added???');

		this.queue.push({
			asset: asset,
			task: 'create'
		});
		//this.run();
	},

	/**
	 *	When an asset has been changed
	 */
	assetChanged: function(id, asset) {

		console.log('Was this changed???');

		this.queue.push({
			asset: asset,
			task: 'overwrite'
		});
		//this.run();
	},

	/**
	 *	When an asset has been removed
	 */
	assetRemoved: function(id, asset) {
		this.queue.push({
			asset: asset,
			task: 'delete'
		});
	}
};