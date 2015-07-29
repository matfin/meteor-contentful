'use strict';

ImageProcessor = {

	/**
	 *	Node dependencies
	 */
	Fiber: Npm.require('fibers'),

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

	run: function() {
		if(this.queue.length === 0 || this.isrunning) {
			return;
		}

		this.isrunning = true;

		this.process(this.queue[0], (function() {
			this.queue = this.queue.slice(1);
			this.isrunning = false;
			this.run();
		}).bind(this));
	},

	process: function(job, cb) {
		
		var asset = job.asset,
				settings = this.settings,
				category = settings.categories[asset.fields.description],
				source = 'http:' + asset.fields.file.url,
				request = Npm.require('request'),
				gm = Npm.require('gm'),
				stream,
				outputs,
				background,
				resize,
				output;

		if(typeof category === 'undefined') {
			cb({
				status: 'error',
				message: 'Sizes could not be determined due to missing category'
			});
			return;
		}

		background = category.background;
		outputs = this.outputs(asset, category);

		resize = function() {
			if(outputs.length === 0) {
				cb('done');
				return;
			}

			output = outputs[0];
			stream = request(source, function(req, res, body) {
				console.log('Got source' + typeof body);
			});

			gm(stream)
			.setFormat(output.filetype)
			.resize(output.width)
			.write(settings.destination + '/' + output.filename, function(err) {
				outputs = outputs.slice(1);
				console.log(outputs.length);
				resize();
			});
		};
		
		resize();

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

		if(!this.hasSettings()) {
			throw {
				type: 'error',
				message: 'settings.json for ImageProcessor not set up.'
			}
		}

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
		this.queue.push({
			asset: asset,
			task: 'create'
		});
		this.run();
	},

	/**
	 *	When an asset has been changed
	 */
	assetChanged: function(id, asset) {
		this.queue.push({
			asset: asset,
			task: 'overwrite'
		});
		this.run();
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