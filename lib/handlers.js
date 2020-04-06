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
handlers._users.put = function(data, callback) {

}

//Users - delete
handlers._users.delete = function(data, callback) {

}

module.exports = handlers;