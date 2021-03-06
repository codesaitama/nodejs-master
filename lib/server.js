// primary file for API

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
let config = require('./lib/config');
let handlers = require('./lib/handlers');
let helpers = require('./lib/helpers');

let checkHandle = require('./lib/handlers/checksHandler');
let userHandle = require('./lib/handlers/userHandler');
let tokenHandle = require('./lib/handlers/tokenHandler');

// @TODO GET RID OF THIS
helpers.sendTwilioSMS('503702335', 'Hello', function(err) {
    console.log('This was the error ', err);
});

// Instantiate the HTTP Server
let httpServer = http.createServer(function(req, res) {
    unifiedServer(req, res);
});

// Start the http server
httpServer.listen(config.httpPort, function() {
    console.log('The server is listening on port ' + config.httpPort + '.');
});

// Instantiate the HTTPS Server
// let httpsServerOptions = {
//     key: fs.readFileSync('./https/key.pem'),
//     cert: fs.readFileSync('./https/cert.pem')
// };

// let httpsServer = https.createServer(httpsServerOptions, function(req, res) {
//     unifiedServer(req, res);
// });

// Start the httpS server

// httpsServer.listen(config.httpsPort, function() {
//     console.log('The server is listening on port ' + config.httpsPort + '.');
// });

// All the server logic for both the http and the https servers
let unifiedServer = function(req, res) {
    // Get the URL and parse it.
    let parsedUrl = url.parse(req.url, true);

    // Get the path.
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object.
    let queryStringObject = parsedUrl.query;

    // get the http method.
    let method = req.method.toUpperCase();

    //Get the headers as an object.
    let headers = req.headers;

    // Get the payload. If any
    let decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });

    req.on('end', function() {
        buffer += decoder.end();

        // Choose handler this request goes to.
        let chooseHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;


        //Construct data object to send to the handler
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)

        }

        // Route the request to the handler specified in the router.
        chooseHandler(data, function(statusCode, payload) {
            // Use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called baked by the handler or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            let payloadString = JSON.stringify(payload);

            //return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);

            res.end(payloadString);
            console.log(`Returning the response : `, statusCode, payloadString);
            //console.log(`Request recieved on path: ${trimmedPath} with the method: ${method} and with these query string params: `, queryStringObject);
        });

    });
}


// Define request router.
let router = {
    ping: handlers.ping,
    users: userHandle.users,
    tokens: tokenHandle.tokens,
    checks: checkHandle.checks
}
