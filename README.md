
# hapi-bully-imageupload

A smart file/image upload plugin for hapi. Why would you want more than one copy of the same file? This plugin provides an `/upload` end point which uses a digest hash of the contents as the file name. This way you will never have two copies of the same file, no matter how many times it is uploaded!

I wrote this for a project of mine, but it may be handy for some of you.

# Install

```
npm install hapi-bully-imageupload --save
```

# Using it

## Registering

You can register the plugin as follows:

```js
server.register({
	'register': require('hapi-bully-imageupload'),
	'options': {
		'allowedExtensions': [ 'jpg', 'jpeg', 'png' ],
		'uploadPath': process.cwd() + '/uploads/' // Notice the last slash
	},
	'routes': {
		'prefix': '/upload'
	}
});
```

`options` can contain the following:
* `allowedExtensions`: An array containing allowed etensions, e.g. `[ 'jpg', 'jpeg', 'png' ]` (none by default)
* `hashAlgo`: The hashing algorithm to use. All available in the `crypto` module. Default is `sha1`
* `tmpPath`: The path to store the temporary files in. Default is `process.cwd() + '/tmp/'`
* `uploadPath`: The path to store the uploaded files in. Default is `process.cwd() + '/uploads/'`
* `maxBytes`: The max allowed file size in bytes. Defaults to `256000` (250kb)

The plugin adds two routes to the selected server:

`POST /upload`

The upload route. It expects `multipart/form-data` with the file attached as `image`. All possible other fields are ignored.

What happens on an upload:

1. If `allowedExtensions` is set, first check if the extension is allowed
  * If it isn't, send a 400 Bad Request
2. If it is, store the file to `tmpPath`, in the mean time calculating the digest hash of its contents
3. Check if there is a file in `uploadPath` with the same hash as its newFileName
 * If there is, unlink the temporary file and send a response containing the file hash
4. If there isn't, move the file to `uploadPath` and send a response containing the file hash

`GET /image/{hash}`

Route to get the image/file by its hash. A valid path with a sha1 hash would look like this:

```
GET /image/hash/29985a9860e6e344c98ecc75467e915ec5d5fb28
```

# Version history

* 1.0.0 - 1.0.1 - 3 December 2015
  * (1.0.1) Fixed package.json path in `register.attributes`
  * (1.0.0) I forgot to set the version to 0.0.1, so now 1.0.0 is the latest version
  * (1.0.0) Initial commit

## License

Copyright 2015 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
