
# hapi-bully-imageupload

A smart file/image upload plugin for [hapi.js](http://hapijs.com). Why would you want more than one copy of the same file? This plugin provides an `/upload` end point which uses a digest hash of the contents as the file name. This way you will never have two copies of the same file, no matter how many times or under how many different file names it is uploaded!

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
		'allowedMimeTypes': [ 'image/jpg', 'image/png' ],
		'uploadPath': process.cwd() + '/uploads/' // Notice the last slash
	},
	'routes': {
		'prefix': '/upload'
	}
});
```

`options` can contain the following:
* `field`: The name of the form field that contains the file we're interested in (defaults to `image`)
* `allowedExtensions`: An array containing allowed extensions, e.g. `[ 'jpg', 'jpeg', 'png' ]` (none by default)
* `allowedMimeTypes`: An array containing allowd mime types, e.g. `[ 'image/jpg', 'image/png' ]` (none by default)
* `hashAlgo`: The hashing algorithm to use. All available in the `crypto` module. Default is `sha1`
* `tmpPath`: The path to store the temporary files in. Default is `os.tmpdir()`
* `uploadPath`: The path to store the uploaded files in. Default is `process.cwd() + '/uploads/'`
* `maxBytes`: The max allowed file size in bytes. Defaults to `256000` (250kb)

## Routes

### `POST /upload`

The upload route. It expects `multipart/form-data` with the file field name we're interested in as `options.field` (defaults to `image`). All possible other fields are ignored.

What happens on an upload:

1. If `allowedExtensions` is set, first check if the extension is allowed
  * If it isn't, send a 400 Bad Request
2. If `allowedMimeTypes` is set, check if the content-type is allowed
  * If it isn't, send a 400 Bad Request
2. If it is, store the file to `tmpPath`, in the mean time calculating the digest hash of its contents
3. Check if there is a file in `uploadPath` with the same hash (the hash is being used as file name)
 * If there is, unlink the temporary file and send a response containing the file hash
4. If there isn't, move the file to `uploadPath` and send a response containing the file hash

The reply will be `application/json`.

On failure:
```json
{
  "success": false,
  "error": "An error message"
}
```

On success:
```json
{
  "success": true,
  "fresh": true,
  "filename": "29985a9860e6e344c98ecc75467e915ec5d5fb28"
}
```

`fresh` is `true` if the file was new, `false`, if the file already existed

### `GET /image/{hash}`

Route to get the image/file by its hash. A valid path with a sha1 hash would look like this:

```
GET /image/29985a9860e6e344c98ecc75467e915ec5d5fb28
```

Because files are stored without their extension, and I have no idea how to retrieve the mime type any other way without requiring something like a database (which is not desirable), the `Stream.Readable` of the file is sent directly to `reply()`. If you know a better way to do this, or if you experience problems because of this, please let me know by creating an issue.

# Version history

* 1.2.1 - 12 January 2016
  * Changed temporary directory from  `process.cwd() + '/tmp/'` to `os.tmpDir()`
* 1.2.0 - 7 December 2015
  * The temporary file is now being stored with a unique UUID, preventing possible collisions in `tmpPath`
* 1.1.0 - 4 December 2015
  * Updated readme to contain more helpful info
  * Updated status reply messages and added them to the readme
  * The field name containing the file is now configurable through `options.field` (defaults to `image`)
  * After checking for allowed extensions (`options.allowedExtensions`), you can now also check for allowed mime types (`options.allowedMimeTypes`)
* 1.0.3 - 4 December 2015
  * Fixed file path links
* 1.0.0 - 1.0.2 - 3 December 2015
  * (1.0.2) Fixed error in readme
  * (1.0.1) Fixed package.json path in `register.attributes`
  * (1.0.0) I forgot to set the version to 0.0.1, so now 1.0.0 is the latest version
  * (1.0.0) Initial commit

## License

Copyright 2015 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
