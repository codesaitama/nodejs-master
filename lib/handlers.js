// Request handlers.
let checkHandle = require('../lib/handlers/checksHandler');
let userHandle = require('../lib/handlers/userHandler');

// Define handlers
let handlers = {};

//ping handler
handlers.ping = function(data, callback) {
    callback(200);
};

//Not found handler
handlers.notFound = function(data, callback) {
    callback(404);
};

// checkHandle

module.exports = handlers;