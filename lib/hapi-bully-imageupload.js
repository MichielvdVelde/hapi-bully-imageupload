
var fs = require('fs');
var path = require('path');

var digestStream = require('digest-stream');

exports.register = function(server, options, next) {

	/**
	 * Handler for POST /upload
	*/
	var uploadHandler = function(request, reply) {

		if(!request.payload.image)
			return reply({ 'error': 'Bad Request' }).code(400);

		// A very quick and dirty way to check the file extension
		var fileExt = path.extname(request.payload.image.hapi.filename).substr(1).toLowerCase();
		if(options.allowedExtensions && options.allowedExtensions.indexOf(fileExt) == -1) {
			return reply({ 'error': 'Unsupported file extension' }).code(400);
		}

		// Store the file to te temp folder
		var tmpFileName = request.payload.image.hapi.filename;
		var tmpFilePath = ((options.tmpPath) ? options.tmpPath : process.cwd() + '/tmp/') + tmpFileName;
		var fd = fs.createWriteStream(tmpFilePath);

		// Creates a digest hash based on the file's contents
		var digestHash;
		var dstream = digestStream(options.hashAlgo || 'sha1', 'hex', function(digest, length) {
			digestHash = digest;
		});

		// Pipe through digest-stream to the temp file
		request.payload.image.pipe(dstream).pipe(fd);

		request.payload.image.on('end', function() {
			var newFileName = digestHash;
			var newFilePath = ((options.uploadPath) ? options.uploadPath : process.cwd() + '/uploads/') + newFileName;

			// Check if a file with the same hash already exists
			fs.access(newFilePath, function(nonExistent) {
				if(!nonExistent) {
					// The file already exists; discard our temp file
					return fs.unlink(tmpFilePath, function(err) {
						// NOTE: Let a possible error silently pass
						// Notify the client about the info
						return reply({
							'success': true,
							'fresh': false,
							'filename': newFileName
						}).code(201);
					});
				}

				// Move file to its new location
				fs.rename(tmpFilePath, newFilePath, function(err) {
					if(err) {
						// Just send a 500, it's safest
						return reply({
							'success': false,
							'error': 'Internal server error'
						}).code(500);
					}
					// Notify the client about the info
					return reply({
						'success': true,
						'fresh': true,
						'filename': newFileName
					}).code(201);
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
