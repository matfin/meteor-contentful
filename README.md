matfin:meteor-contentful
=================

[![Build Status](https://travis-ci.org/matfin/meteor-contentful.svg?branch=master)](https://travis-ci.org/matfin/meteor-contentful)

## About

Contentful is an API based platform for creating and publishing content. What this means is that you use it to create your own content types (blog post with a title, text content, publish date, author etc) and then connect to their API to fetch the data formatted as JSON.

This is very useful because it gives you the raw data so you have the choice of displaying it in any way you want. It does away with the cruft associated with older legacy systems that may also deliver content and presentation.



## This Metetor package

Contentful is an ideal platform for curating content for any platform, and it is especially useful for Meteor based apps. I wrote this package because I wanted to be able to easily update content on the Meteor websites that I have built. 

Being able to define my own content types with their data structures is very flexible and useful, and the ability to push changes in real time is also ideal. 

This package works in such a way as to pull text content and images from Contentful and store them locally in MongoDB. This brings about better speed and reliability because it means we don't have to connect to Contentful everytime a user requests content. Content updates are also pushed, so any changes from within Contentful get pushed directly to the Meteor app and updated locally.

Another problem that needed to be addressed was handling image assets. Given the many sizes needed for difference devices and screen pixel densitites, the job of taking a single image and resizing it in Photoshop became prohibitively time consuming. 

This package reads a high resolution image from contentful and compresses it to different sizes, storing a reference to it in the database. This means we are able to determine a devices screen size and pixel density and the load the correct image to the screen - allowing for the balance between displaying the best quality images for a given device as quickly as possible.



## Setup and installation

To process images, this package makes use of the Graphicsmagick command line tool, which is called via Node.js, so to install it run the following commands:

### If you are running Ubuntu

```sh
$ sudo apt-get update && sudo apt-get install graphicsmagick
```

### If you running on Mac OSX 
```
$ brew update && brew install graphicsmagick
```

### Installing on other platforms

If you are having difficulties installing the above, refer to the [http://www.graphicsmagick.org/README.html#installation](installation instructions) for more info.

### Grabbing the package

To install the package into your project, make sure meteor is not running and then run the following commands:

```
$ cd /your/project/directory
$ meteor update && meteor install matfin:meteor-contentful
```

### Configuring the package. 

The package will not work immediately. You will need to copy the settings.json into your project root directory, or, if you already have a settings.json file you need to copy the "contentful" block into that.

Each section of the settings.json file is described below, so you will to copy the sample below into the root directory of your app and run meteor from the command line using:

```
$ meteor --settings settings.json
```

When deploying to a production server you will need create a new environment variable called METEOR_SETTINGS and add the minified contents of the settings.json file to that, edited for your needs.

```$ export METEOR_SETTINGS='{"contentful:{...}"}'

A useful JSON minifier can be found at [http://jsonformatter.curiousconcept.com/](http://jsonformatter.curiousconcept.com/).

Below is a sample of the settings.json file.

```
{
	"contentful": {
		"endpointUrl": "http://cdn.contentful.com",
		"authorisationHeader": "'Bearer <Your auth id>'",
		"contentTypeHeader": "application/vnd.contentful.delivery.v1+json",
		"spaceID": "<your space ID>",
		"processedImageCollectionName": "ac_images",
		"contentTypes": [
			{
				"name": "meaningful-name",
				"id": "contentful-id"
			},
			{
				"name": "another-meaningful-name",
				"id": "another-contentful-id"
			}
		],
		"imageProcessor": {
			"path": "local/filesystem/path",
			"baseUrl": "http://media.example.com/images",
			"quality": 0.9,
			"pixelDensities": [
				{
					"prefix": "",
					"multiplier": 1
				},
				{
					"prefix": "@2x",
					"multiplier": 2
				},
				{
					"prefix": "@3x",
					"multiplier": 3
				}
			],
			"imageTypes": {
				"portfolio": {
					"filetype": "jpg",
					"sizes": [
						{
							"device": "desktop",
							"width": 1280,
							"height": 800
						},
						{
							"device": "tablet",
							"width": 800,
							"height": 600
						},
						{
							"device": "mobile",
							"width": 320,
							"height": 240
						}
					]
				},
				"logo": {
					"filetype": "png",
					"sizes": [
						{
							"device": "desktop",
							"width": 100,
							"height": 100
						},
						{
							"device": "tablet",
							"width": 75,
							"height": 75
						},
						{
							"device": "mobile",
							"width": 50,
							"height": 50
						}
					]
				}
			}
		}
	}
}
```

### Digging into settings.json

This section describes what we need to put inside the settings.json file. 

#### endpointUrl 

Self explanatory - this is the URL we fetch content from when the app is booted. This can be left alone and should not need to change for now.

#### authorisationHeader

This can be Generated by Contentful in their app and then placed in here. This is required and further documentation can be [http://docs.contentfulcda.apiary.io/#introduction/authentication](found here).

#### contentTypeHeader

This should not be changed.

#### spaceID

Your contentful Space ID, unique to each space or website you will be creating content for. To find out how to get this, refer to the [https://www.contentful.com/developers/docs/](Contentful docs).

#### processedImageCollectionName

You can give this any meaningful name that you want. This will be the collection that the client side of the app subscribes to in order to fetch the references to the images.

#### callbackAuthKey

If you specify a hook in Contentful, you should provide a username and a password. This is generated into a base64 encoded key by them based on the credentials you provided, and it is to ensure that any incoming requests to your server are legitimate. 

If you go to this website [https://www.base64encode.org/](base64encode.org) and type in user:pass and then hit encode, you will get the result 'dXNlcjpwYXNz' so the value you would set for the authorisation header is 'Bearer dXNlcjpwYXNz'.

#### contentTypes

This is an array of the different content types provided by Contentful. They should be mapped here and given a meaningful name to match with their IDs. We need to come up with the name and contentful provide the ID. This will make it easier to reference content client side when performing selectors to get the right content. 

To get all content types for a Space - [http://docs.contentfulcda.apiary.io/#reference/content-types/content-type-collection/get-all-content-types-of-a-space](read this documentation)

#### imageProcessor

Here we specify how images will be processed, what sizes we need and where source images are downloaded to before we convert them to their resized counterparts.

-- 'path' should be a writable directory on your local system and this is where source files will be saved to. Once they are processed, they will reside in the 'processed/' direcory.

-- 'baseUrl' should be a suitable static server where the processed images can be referenced from, such as http://media.somewhere.tld/images/.

-- 'quality' should be kept at the recommended value where 0.9 is equal to 90% quality.

-- 'pixelDensitites' is used to resize images according to the screens device pixel ratio. Anything with a prefix of @3x will load on iPhone 6+ screens and will have three times the dimensions of a standard image.

-- 'imageTypes' contains two nested collections where file types and sizes can be added in order to be able to load respsonsive images. Note that when uploading an image to Contentful, when editing an asset, the description field of that asset should match the nested object index names under imageTypes, in this case 'portfolio' and 'logo' provided here as examples. 


## How this package works

Assuming you have configured the settings file correctly, these are the steps taken by this package as soon as Meteor is started.

-- A connection is made to Contentful and then all entries for a Space ID are downloaded and upserted (added if they don't exist or updated if they do) to Mongo Collections named 'cf_assets' and 'cf_entries'.

-- As entries are being populated to the server side Mongo Collection (cf_entries), they are tagged with the correct content type name in order to make it easier to reference them by name. This is why we need meaningful content type names matched to the content type ID specified in settings.js

-- As assets are being populated to the server side Mongo Collection (cf_assets), the image processor adds this asset to the processing queue via the built in Meteor trigger. The source file for the asset is downloaded and then that image gets converted to the file sizes specified in settings.js and then placed inside the processed/ directory.

-- An image with the ID of '12345678' could end up with the name '12345678-tablet@2x.jpg' for example.

-- There is also a function included to listen for content changes, so any changes made within Contentful can be pushed to the server (assuming a webhook has been set up). The contentful hook url should look like http(s)://your.local.site/hooks/contentful and the specified username and password should match the base64 encoded version inside the settings.js file. If you want to test something like this locally for real time updates, [https://ngrok.com/](NGrok is very useful).

It is important to note that this package does not do much else aside from the above. It is designed to do things at the very basic level and leave the client side implementation - things like publishibng and subscriving to the collections up to the developer of the app it is being used in. With that said, an example app.js file is included below with comments to show how one could use the app within their own project. 

## Sample app.js

Below is a sample from the app.js file kept in the projects root directory, which makes use of the contentful package and is explained through comments.

```
Meteor.startup(function() {
	if(Meteor.isClient) {
		/**
		 *	Set up the client side Mongo collections
		 */
		App = {
			collections: {
				cf_entries: new Mongo.Collection('cf_entries'),
				cf_assets: new Mongo.Collection('cf_assets'),
				mf_images: new Mongo.Collection('mf_images')
			}	
		};
	}
	if(Meteor.isServer) {
		
		/**
		 *	When the app is booted, we need to process the images
		 *	from the Contentful source
		 */
		ImageProcessor.init();
		
		Contentful.fetchAndPopulate().then(function(result) {
			/**
			 *	Once content is fetched and stored in the 
			 *	server side collections, we can publish it 
			 *	in here. We loop through each configured 
			 *	content type and publish a collection 
			 *	using its name
			 */
			_.each(CFConfig.contentTypes, function(contentType) {
				/**
				 *	Give the name of the collection the same name as 
				 *	the content type name and also use it as a filter
				 *	parameter.
				 */
				Meteor.publish(contentType.name, function() {
					console.log('Publishing:', contentType.name);
					return Contentful.collections.entries.find({'contentTypeName': contentType.name});
				});
			});

			/**
			 *	Publish the contentful assets collection, which we will need to
			 *	source the resized images later.
			 */
			Meteor.publish('cf_assets', function() {
				console.log('Publishing: assets');
				return Contentful.collections.assets.find({});
			});

			/**
			 *	Publish the image collection
			 */
			Meteor.publish(CFConfig.processedImageCollectionName, function() {
				console.log('Publishing: images');
				return ImageProcessor.imageCollection.find({});
			});

			/**
			 *	Then we listen for incoming changes from Contentful,
			 *	which will automatically update client side collections.
			 */
			Contentful.listenForContentChanges();

		}).fail(function(error) {
			console.log(error.message);
		});
	}
}
```

## Help and support

This package has been tested extensively using Tinytest, but if any issues arise they should be added to the issue tracker for this repository. 



