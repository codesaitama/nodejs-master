// Library for storing nad editing data

// Dependencies
let fs = require('fs');
let path = require('path');
let helper = require('./helpers');


// Container for the module to be exported
let lib = {};


// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback) {
    // open the file for writing
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data);

            fs.writeFile(fileDescriptor, stringData, function(err) {
                if (!err)
                    fs.close(fileDescriptor, function(err) {
                        if (!err)
                            callback(false);
                        else
                            callback('Error closing new file')
                    });
                else
                    callback('Error writing to new file.')
            })
        } else {
            callback('Could not create new file, It may already exist');
        }
    });
};

// Read data from a file
lib.read = function(dir, file, callback) {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', function(err, data) {
        if (!err && data)
            callback(false, helper.parseJsonToObject(data));
        else
            callback(err, data)
    });
};

// Update data from a file
lib.update = function(dir, file, data, callback) {
    // open the file for writing
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data);
            // Truncate the file
            fs.ftruncate(fileDescriptor, function(err) {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, function(err) {
                        if (!err)
                            fs.close(fileDescriptor, function(err) {
                                if (!err)
                                    callback(false);
                                else
                                    callback('Error closing updated file')
                            });
                        else
                            callback('Error updating  file.')
                    });
                }
            })
        } else {
            callback('Could not update new file, It may not exist');
        }
    });
}

// Delete data from file.
lib.delete = function(dir, file, callback) {
    //Unlink the file
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, function(err) {
        if (!err)
            callback(false)
        else
            callback(err)
    })
}


module.exports = lib;
