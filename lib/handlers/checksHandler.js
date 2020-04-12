// Request handlers.
let _data = require('../data');
let helpers = require('../helpers');
let tokenHandle = require('../handlers/tokenHandler');
let config = require('../config');

// Define handlers
let checksHandlers = {};

// Tokens
checksHandlers.checks = function(data, callback) {
    let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    if (acceptableMethods.indexOf(data.method) > -1)
        checksHandlers[data.method.toLowerCase()](data, callback);
    else
        callback(405)
}

// Checks - post
// Required data: protocol, url, method, success, timeoutSeconds
checksHandlers.post = function(data, callback) {
    let protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    let method = typeof(data.payload.method) == 'string' && ['GET', 'POST', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array > 0 && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        //Lookup user by reading the token
        _data.read('tokens', token, function(err, tokenData) {
            if (!err && tokenData) {
                let userPhone = tokenData.phone;
                _data.read('users', userPhone, function(err, userData) {
                    if (!err && userData) {
                        let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify the user has less than the number of max-checks-per-user
                        if (userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            let checkId = helpers.createRandomString(20);

                            // Create the check object, and include the user's phone
                            let checkObject = { id: checkId, userPhone, protocol, url, method, successCodes, timeoutSeconds };

                            // Save the object
                            _data.create('checks', checkId, checkObject, function(err) {
                                if (!err) {
                                    // Add the checkId to the user's object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, function(err) {
                                        if (!err)
                                            callback(200, checkObject)
                                        else
                                            callback(500, { Error: 'Could not update the user with the new check' });
                                    });

                                } else {
                                    callback(500, { Error: 'Could not create the new check' })
                                }
                            });

                        } else {
                            callback(400, { Error: 'User has maximum checks (' + config.maxChecks + ')' })
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });

    } else {
        callback(400, { Error: 'Missing required inputs or inputs invalid' })
    }
};

//Checks - get
// Required data: phone
// Optional data : none

checksHandlers.get = function(data, callback) {
    // Check if id is valid...
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the check
        _data.read('checks', id, function(err, checkData) {
            if (!err && checkData) {
                //Get the token from the headers
                let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                // Verify the token
                tokenHandle.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
                    if (tokenIsValid) {
                        // Return the check Data
                        callback(200, checkData);
                    } else {
                        callback(403);
                    }
                });
            }
        });

    } else {
        callback(400, { Error: 'Missing required field' });
    }
};

// Checks - Put
// Required data - id
// Optional Data - protocol, url, method, statusCode, timeoutSeconds

checksHandlers.put = function(data, callback) {

    // Check for the required field
    let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    // Check for the optional fields
    let protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    let method = typeof(data.payload.method) == 'string' && ['GET', 'POST', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array > 0 && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;


    if (id) {
        // Check to make sure one or more optional fields has been sent.
        if (protocol || url || method || successCodes || timeoutSeconds) {

            // lookup the check
            _data.read('checks', id, function(err, checkData) {
                if (!err && checkData) {
                    //Get the token from the headers
                    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                    // Verify the token
                    tokenHandle.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
                        if (tokenIsValid) {
                            // Update the check where necessary
                            if (protocol)
                                checkData.protocol = protocol;
                            if (url)
                                checkData.url = url;
                            if (method)
                                checkData.method = method;
                            if (successCodes)
                                checkData.successCodes = successCodes;
                            if (timeoutSeconds)
                                checkData.timeoutSeconds = timeoutSeconds;

                            //Store the update
                            _data.update('checks', id, checkData, function(err) {
                                if (!err) {
                                    callback(200);
                                } else
                                    callback(500, { Error: 'Could not update the check!' })
                            });

                        } else
                            callback(403);
                    });
                } else
                    callback(400, { Error: 'Check ID did not exist!' });
            });
        } else
            callback(400, { Error: 'Missing field to update' })
    } else
        callback(400, { Error: 'Missing required fields!' })

}

module.exports = checksHandlers;