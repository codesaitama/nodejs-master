// Helpers for various tasks

// Dependencies
let crypto = require('crypto');
let config = require('./config')

// Container for all the Helpers
let helpers = {};

// Create a SHA256 hash
helpers.hash = function(str) {
    if (typeof(str) == 'string' && str.length > 0) {
        let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// Parse a JSON string to an object in all  cases, without throwing.
helpers.parseJsonToObject = function(str) {
    try {
        let obj = JSON.parse(str);
        return obj
    } catch (e) {
        return {};
    }
}

// Create a string of alpha numeric characters of given length
helpers.createRandomString = function(strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let token = '';
        for (let i = 0; i < strLength; i++) {
            token += chars[Math.floor(Math.random() * chars.length)];
        }
        return token;
    } else {
        return false;
    }
}


module.exports = helpers;