// Request handlers.
let _data = require('../data');
let helpers = require('../helpers');
let tokenHandle = require('../handlers/tokenHandler');

let userHandlers = {}

userHandlers.users = function(data, callback) {
    let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    if (acceptableMethods.indexOf(data.method) > -1)
        userHandlers[data.method.toLowerCase()](data, callback);
    else
        callback(405)
}

//Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
//Optional data: none
userHandlers.post = function(data, callback) {
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
userHandlers.get = function(data, callback) {
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        //Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the token
        tokenHandle.verifyToken(token, phone, function(tokenIsValid) {
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
};

//Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only authenticated user update their own object.
userHandlers.put = function(data, callback) {

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
            tokenHandle.verifyToken(token, phone, function(tokenIsValid) {
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

};

//Users - delete
// Required field: phone
// @TODO Only authenticated user delete their own object.
userHandlers.delete = function(data, callback) {
    // Check if phone is valid.
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        //Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify the token
        tokenHandle.verifyToken(token, phone, function(tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function(err, userData) {
                    if (!err && data) {
                        _data.delete('users', phone, function(err) {
                            if (!err) {
                                // Delete each of the checks associated
                                let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                let checksToDelete = userChecks.length;
                                if (checksToDelete > 0) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;
                                    // Loop through checks
                                    userChecks.forEach(function(checkId) {
                                        // Delete the check
                                        _data.delete('checks', checkId, function(err) {
                                            if (err) deletionErrors = true;
                                            checksDeleted++;
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { Error: 'Errors encountered while attemptig to delete all user checks. All checks may not have been deleted successfully.' });
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    callback(200)
                                }

                            } else
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
};

module.exports = userHandlers;