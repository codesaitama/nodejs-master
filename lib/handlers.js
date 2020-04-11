// Request handlers.
let _data = require('./data');
let helpers = require('./helpers');
let config = require('./config');

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


handlers.users = function(data, callback) {
    let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    if (acceptableMethods.indexOf(data.method) > -1)
        handlers._users[data.method.toLowerCase()](data, callback);
    else
        callback(405)
}

// Container for the users sub methods
handlers._users = {};

//Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
//Optional data: none
handlers._users.post = function(data, callback) {
    // Check that all required fields are filled out
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true > 0 ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that user doesn't already exist
        _data.read('users', phone, function(err, data) {
            if (err) {
                // Hash the password
                let hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    // Create the user object
                    let userObject = {
                        firstName,
                        lastName,
                        phone,
                        hashedPassword,
                        tosAgreement
                    }

                    //Store the user
                    _data.create('users', phone, userObject, function(err) {
                        if (!err)
                            callback(200);
                        else
                            callback(500, { Error: 'Could not create the new user' })
                    });
                } else {
                    callback(500, { Error: 'Could not hash the user\'s password.' });
                }

            } else
                callback(400, { Error: 'A user with that phone number already exists' });
        });

    } else {
        callback(400, { Error: 'Missing required fields' })
    }

}

//Users - get
// Required data: phone
// Optional data : none
//@TODO  Only authenticated users can access thrie object.
handlers._users.get = function(data, callback) {
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        //Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the token
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function(err, data) {
                    if (!err && data) {
                        // Removed the hashed password
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, { Error: 'Missing required token in header, or token is inavlid' });
            }
        });


    } else {
        callback(400, { Error: 'Missing required field' });
    }

}

//Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only authenticated user update their own object.
handlers._users.put = function(data, callback) {
    // Check for the required field
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    //Error if phone is invalid
    if (phone) {
        if (firstName || lastName || password) {
            // Lookup the user
            //Get the token from the headers
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify the token
            handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
                if (tokenIsValid) {
                    _data.read('users', phone, function(err, userData) {
                        if (!err && userData) {
                            // Updatethe fields neccessary
                            if (firstName) userData.firstName = firstName;
                            if (lastName) userData.lastName = lastName;
                            if (password) userData.hashedPassword = helpers.hash(password);

                            // Save the new update
                            _data.update('users', phone, userData, function(err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, { Error: 'Could not update the user' })
                                }
                            });

                        } else {
                            callback(400, { Error: 'The specified user does not exist' });
                        }
                    });
                } else {
                    callback(403, { Error: 'Missing required token in header, or token is inavlid' });
                }
            });
        } else {
            callback(400, { Error: 'Missing fields to update' });
        }
    } else {
        callback(400, { Error: 'Missing required field' });
    }

}

//Users - delete
// Required field: phone
// @TODO Only authenticated user delete their own object.
// @TODO Cleanup (delete) any other data belonging to the user
handlers._users.delete = function(data, callback) {
    // Check if phone is valid.
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        //Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify the token
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function(err, data) {
                    if (!err && data) {
                        _data.delete('users', phone, function(err, data) {
                            if (!err)
                                callback(200)
                            else
                                callback(500, { Error: 'Could not delete the specified user' })
                        });
                    } else {
                        callback(400, { Error: 'Could not find specified user' });
                    }
                });
            } else {
                callback(403, { Error: 'Missing required token in header, or token is inavlid' });
            }
        })

    } else {
        callback(400, { Error: 'Missing required field' });
    }
}

// Tokens
handlers.tokens = function(data, callback) {
    let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    if (acceptableMethods.indexOf(data.method) > -1)
        handlers._tokens[data.method.toLowerCase()](data, callback);
    else
        callback(405)
}

// Container
handlers._tokens = {};

// Tokens - POST
// Required data: phone and password
// Optional data: None
handlers._tokens.post = function(data, callback) {
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
handlers._tokens.get = function(data, callback) {
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
handlers._tokens.put = function(data, callback) {
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
handlers._tokens.delete = function(data, callback) {
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

handlers._tokens.verifyToken = function(id, phone, callback) {
    //Lookup the token
    _data.read('tokens', id, function(err, tokenData) {
        if (!err && tokenData) {
            // Check that the token is for the user and has not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now())
                callback(true);
            else
                callback(false);
        } else callback(false);
    });
};

// Checks
handlers.checks = function(data, callback) {
    let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    if (acceptableMethods.indexOf(data.method) > -1)
        handlers._checks[data.method.toLowerCase()](data, callback);
    else
        callback(405)
}

// Container
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, success, timeoutSeconds
handlers._checks.post = function(data, callback) {
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


module.exports = handlers;