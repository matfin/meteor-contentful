#matfin:meteor-contentful

[![Build Status](https://travis-ci.org/matfin/meteor-contentful.svg?branch=develop)](https://travis-ci.org/matfin/meteor-contentful)

This package acts as a wrapper to fetch data from the Contentful platform and then store it in your apps Meteor Mongo Collections.

Contentful is a Content Management platform that allows users to create their own content types, add and edit content and then publish it. 

This package supports fetching content types, entries and assets. It also supports content updates in real time for your app, as long as the Contenful webhooks are configured correctly.

Images can also be fetched and resized based on what is inside your settings file (more on that later).

##Use case

The ideal use case scenario for this package would be a static site such as a blog or portfolio. Images are generated in different sizes so they can be displayed responsively, so a low resolution image at 72dpi can be displayed on an older Android device, while a nice large crisp image can be displayed on a 5k retina iMac.

##Installation

On your local development environment, create a file called settings.json in your application root directory and copy in these contents, making sure to substitute the placeholder values for your contentful settings. 

```
{
	"contentful": {
		"accessToken": "<your_access_token>",
		"space": "<your_space_id>",
		"host": "cdn.contentful.com",
		"callbackToken": "<your_callback_token>",
		"callbackPort": 1234
	}
}
```

To grab your own settings refer to the [Contentful documentation on spaces](http://docs.contentfulcda.apiary.io/#reference/spaces). It is useful to know that when you are configuring your webhook and when you add your username and password, you can generate your own basic authentication token. To generate a token, visit [base64encode.org](https://www.base64encode.org/). 

Adding in an example such as 'username:password' will generate 'dXNlcm5hbWU6cGFzc3dvcmQ=' as a callBack token. Remember, never commit your settings.json file to a public repository as it contains sensitive information.

The next thing you need to do is stop your Meteor app if it is already running and run the following commands. 

```
$ cd /to/your/meteor/app
$ meteor add matfin:meteor-contentful@1.5.0
```

Note that if you want to be able to process images, you will need to install ImageMagick:

For debian based Linux distributions such as Ununtu - run the following:

```
$ sudo apt-get install imagemagick
```

For OSX, run the following

```
$ port install imagemagick //if you are using MacPorts
$ brew install imagemagick //if you are using Homebrew
```

For all other platforms, please refer to the [ImageMagick documentation](http://www.imagemagick.org/script/binary-releases.php).

Then run the app with the following
```
$ meteor --settings settings.json
```

##Usage

This package is quite simple, in that it fetches content from Contentful and listens for any incoming updates using its webhook listener.It is run server side entirely. 

Assuming the settings file has been set up correctly, this package will make a connection to Contentful and pull down all assets, entries and content types and store them each in their own separate server side Mongo collections. 

It is then up to whoever is using the package to decide what they want to do with the data - how they want to filter it and format it. 

###The very basics

An example below illustrates making a connection to Contentful, fetching the data, storing it and then publishing the collections. You could put this inside app.js in the root directory of your Meteor app.

```
if (Meteor.isClient) {
	Meteor.startup(function() {

		assets_collection = new Mongo.Collection('assets');
  	entries_collection = new Mongo.Collection('entries');
  	contenttypes_collection = new Mongo.Collection('contentTypes');

		Meteor.subscribe('assets');
	  Meteor.subscribe('entries');
	  Meteor.subscribe('contentTypes');

	  console.log('Booted client side');
	});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    
    MeteorContentful.start().fetch('contentTypes').fetch('entries').fetch('assets');    
    
  	Meteor.publish('assets', function() {
  		return Collections.assets.find({});
  	});
  	Meteor.publish('entries', function(){
  		return Collections.entries.find({});
  	});
  	Meteor.publish('contentTypes', function(){
  		return Collections.contentTypes.find({});
  	});
  });
}
```

###Listening for updates from Contentful

Each time you publish or unpublish an Asset or Entry from Contentful, the changes can be pushed to your app by setting up a listener and configuring your Contentful webhook to point to your server. Adding the following lines to your app.js will take care of this.

```
if(Meteor.isServer) {
	Meteor.startup(function() {
		MeteorContentful.listen();
	});
}
```

If an Entry is unpublished in Contentful, a POST request will be made with a payload identifying what was unpublished, and the document related to the entry will be deleted from your server side collection - the client side collection will automatically sync with this and the item will disappear. Likewise, if an entry is published again, it will appear in your server side collection.

###Processing and storing images

This package also has the ability to pull in image assets from Contentful and resize them according to the settings.json file. Here is an example of what should be added to the settings file for the ImageProcessor.

Ideally, when uploading image assets to Contentful, they should be uploaded as high resolution PNG images with no background colour.

```
{
	"imageprocessor": {
		"directory": "/Library/WebServer/Documents/mattfinucane/processed",
		"quality": 0.9,
		"categories": {
			"portfolio": {
				"filetype": "jpg",
				"background": "#ffffff",
				"sizes": [
					{
						"device": "desktop",
						"width": 800
					},
					{
						"device": "tablet",
						"width": 1024
					},
					{
						"device": "mobile",
						"width": 640
					}
				]
			},
			"logo": {
				"filetype": "png",
				"background": "#ffffff",
				"sizes": [
					{
						"device": "desktop",
						"width": 60
					},
					{
						"device": "tablet",
						"width": 50
					},
					{
						"device": "mobile",
						"width": 40
					}
				]
			}
		}
	}
}
```

####Using the image processor

To use the image processor, add the following code to your Meteor app. 

```
if(Meteor.isServer) {
	Meteor.startup(function() {
		ImageProcessor.observe();

		Meteor.publish('images', function(){
      return Collections.images.find({});
    });
	});
}

if(Meteor.isClient) {
	Meteor.startup(function() {
		images_collection = new Mongo.Collection('images');
		Meteor.subscribe('images');
	});
}
```

What this will do is listen for updates to the assets collection on the server side, fetch the url for the image contained in the asset, and then start processing.

####Breaking it down

#####Directory
This is the directory the processed images should be stored in.

#####Quality
Used when resizing jpeg images - in this case 0.9 is 90% quality.

#####Categories
You may not want all your images to be the same size across the site. This is where categories come in. Looking at the settings above, it is possible to resize logos to one particular size and have portfolio images at a completely different size.

#####Filetype
This is specified for the ImageProcessor knows what format the source image needs to be saved in. For things like photos, using jpeg is better, but for things like small logos, using png is better.

#####Background
This specifies the background colour that should be applied to JPG images being uploaded - in this case white. Source images uploaded to Contentful should be high resolution PNG images with no background added.

#####Sizes
The sizes the source images should be generated in - useful for responsive images, so on the client side you can specify which image needs to be loaded for a particular device. For each size, the image is generated at three different pixel densities, one for normal phones, tablets and desktops, @2x for retina devices and @3x for the iPhone 6 plus.

Given a source image asset tagged with the description 'portfolio' with an ID of 123456, and assuming the above settings, the following images will be generated.

- 123456-desktop.jpg
- 123456-desktop@2x.jpg
- 123456-desktop@3x.jpg
- 123456-tablet.jpg  
- 123456-tablet@2x.jpg
- 123456-tablet@3x.jpg
- 123456-mobile.jpg
- 123456-mobile@2x.jpg
- 123456-mobile@3x.jpg          

It is important to note that when uploading an image asset to Contentful, the description of the asset should be tagged as such so that the ImageProcessor knows how to identify it correctly and apply the correct resizing settings to it.


##Help and support

If you need help or if you spot any issues, please use the issue tracker for this repository. 

##Credits

Credit should be given to @sanjo - [https://github.com/sanjo/meteor-jasmine](https://github.com/sanjo/meteor-jasmine) for creating the Meteor Jasmine package which allowed me to test this package.

Credit should also be given to @matb33 - [https://github.com/matb33/meteor-collection-hooks](https://github.com/matb33/meteor-collection-hooks) for the Meteor Collection Hooks module, which makes it much easier to track changes to Mongo Collections. 

