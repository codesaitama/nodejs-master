// Request handlers.
let _data = require('./data');
let helpers = require('./helpers')

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
// Required data: id
// Optional data: none
handlers._tokens.put = function(data, callback) {

}

// Tokens - DELETE
handlers._tokens.delete = function(data, callback) {

}


module.exports = handlers;