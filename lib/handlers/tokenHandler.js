// Request handlers.
let _data = require('../data');
let helpers = require('../helpers');

// Define handlers
let tokenHandlers = {};

// Tokens
tokenHandlers.tokens = function(data, callback) {
    let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    if (acceptableMethods.indexOf(data.method) > -1)
        tokenHandlers[data.method.toLowerCase()](data, callback);
    else
        callback(405)
}


// Tokens - POST
// Required data: phone and password
// Optional data: None
tokenHandlers.post = function(data, callback) {
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if (phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, function(err, userData) {
            if (!err && userData) {
                // Hash the sent password, and compare to existing password

                // Hash the password
                let hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    //If valid create a new toke with random name. Set expiration date to 1 hour in the future
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;

                    let tokenObject = { phone, tokenId, expires }

                    //Store token
                    _data.create('tokens', tokenId, tokenObject, function(err) {
                        if (!err)
                            callback(200, tokenObject);
                        else
                            callback(500, { Error: 'Could not create new token' })
                    });
                } else {
                    callback(400, { Error: 'Password did not match the specified user\'s password.' })
                }
            } else {
                callback(400, { Error: 'Could not find the specified user' });
            }
        });

    } else {
        callback(400, { Error: 'Missing required field(s)' })
    }
}

// Tokens - GET
// Required data: id
// Optional data: none
tokenHandlers.get = function(data, callback) {
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        // Look up the token
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { Error: 'Missing required field' });
    }
}

// Tokens - PUT
// Required data: id, extend
// Optional data: none
tokenHandlers.put = function(data, callback) {
    let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                // Check the make sure the token isn't already expired.
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store the new updated token
                    _data.update('tokens', id, tokenData, function(err) {
                        if (!err)
                            callback(200);
                        else
                            callback(500, { Error: 'Could not update the token\'s expiration' });
                    });

                } else {
                    callback(400, { Error: 'The token has already expired and cannot be extended.' })
                }
            } else {
                callback(400, { Error: 'Specified token does not exist' });
            }
        });
    } else {
        callback(400, { Error: 'Missing required payload' })
    }
}

// Tokens - DELETE
// Required data: id
// Optional data: none
tokenHandlers.delete = function(data, callback) {
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the token
        _data.read('tokens', id, function(err, data) {
            if (!err && data) {
                _data.delete('tokens', id, function(err, data) {
                    if (!err)
                        callback(200)
                    else
                        callback(500, { Error: 'Could not delete the specified token' })
                });
            } else {
                callback(400, { Error: 'Could not find specified token' });
            }
        });
    } else {
        callback(400, { Error: 'Missing required field' });
    }
}

// Verify if a given token id is currently valid for a given user
tokenHandlers.verifyToken = function(id, phone, callback) {
    //Lookup the token
    _data.read('tokens', id, function(err, tokenData) {
        if (!err && tokenData) {
            // Check that the token is for the user and has not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now())
                callback(true);
            else
                callback(false);
        } else
            callback(false);
    });
};

module.exports = tokenHandlers;
