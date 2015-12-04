
var fs = require('fs');
var path = require('path');

var digestStream = require('digest-stream');

exports.register = function(server, options, next) {

	/**
	 * Handler for POST /upload
	*/
	var uploadHandler = function(request, reply) {

		var sendFailure = function(code, errorMsg) {
			return reply({
				'success': false,
				'filename': errorMsg
			}).code(code);
		};

		var sendSuccess = function(fresh, hash) {
			return reply({
				'success': true,
				'fresh': fresh,
				'filename': hash
			}).code(201);
		};

		if(!request.payload[options.field || 'image'])
			return sendFailure(400, 'Missing file');

		var uploadStream = request.payload[options.field || 'image'];

		// A very quick and dirty way to check the file extension
		var fileExt = path.extname(uploadStream.hapi.filename).substr(1).toLowerCase();
		if(options.allowedExtensions && options.allowedExtensions.indexOf(fileExt) == -1) {
			return sendFailure(400, 'Unsupported file extension');
		}

		// Check the content type
		var contentType = uploadStream.hapi.headers['content-type'];
		if(options.allowedMimeTypes && options.allowedMimeTypes.indexOf(contentType) == -1) {
			return sendFailure(400, 'Unsupported file extension');
		}

		// Store the file to te temp folder
		var tmpFileName = uploadStream.hapi.filename;
		var tmpFilePath = ((options.tmpPath) ? options.tmpPath : process.cwd() + '/tmp/') + tmpFileName;
		var fd = fs.createWriteStream(tmpFilePath);

		// Create a digest hash based on the file's contents
		var digestHash;
		var dstream = digestStream(options.hashAlgo || 'sha1', 'hex', function(digest) {
			digestHash = digest;
		});

		// Pipe through digest-stream to the temp file
		uploadStream.pipe(dstream).pipe(fd);

		uploadStream.on('end', function() {
			var newFileName = digestHash;
			var newFilePath = ((options.uploadPath) ? options.uploadPath : process.cwd() + '/uploads/') + newFileName;

			// Check if a file with the same hash already exists
			fs.access(newFilePath, function(nonExistent) {
				if(!nonExistent) {
					// The file already exists; discard our temp file
					return fs.unlink(tmpFilePath, function(err) {
						// NOTE: Let a possible error silently pass
						// Notify the client about the info
						return sendSuccess(false, newFileName);
					});
				}

				// Move file to its new location
				fs.rename(tmpFilePath, newFilePath, function(err) {
					if(err) {
						// Just send a 500, it's safest
						return sendFailure(500, 'Internal server error');
					}
					// Notify the client about the info
					return sendSuccess(true, newFileName);
				});
			});
		});
	};

	/**
	 * Handler for GET /image/(hash)
	*/
	var getHandler = function(request, reply) {

		var fileName = request.params.hash;
		var filePath = ((options.uploadPath) ? options.uploadPath : process.cwd() + '/uploads/') + fileName;
		// Check if the file exists
		fs.access(filePath, function(nonExistent) {
			if(nonExistent)
				return reply({ 'error': 'Image not found' }).code(404);
			var fd = fs.createReadStream(filePath);
			// Let reply() handle the stream
			return reply(fd);
		});

	};

	/**
	 * Set up server routes
	*/
	server.route([
		{
			'method': 'POST',
			'path': '/upload',
			'config': {
				'payload': {
					'maxBytes': options.maxBytes || 256000,
					'output': 'stream',
					'parse': true
				}
			},
			'handler': uploadHandler
		},
		{
			'method': 'GET',
			'path': '/image/{hash}',
			'handler': getHandler
		}
	]);

	next();
};

/**
 * Plugin attributes
*/
exports.register.attributes = {
	pkg: require('../package')
};
