// Create and export confiuration services

// Container for all the environments
let environments = {};

//Staging {default} environment
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'thisIsASecret',
    maxChecks: 5,
    twilio: {
        accountSid: 'AC03a1d5974f85618a9e4a7d1dfea26fb4',
        authToken: '805d32b9fdade09f36448a2c252e1cdb',
        //fromPhone: '+18507903768'
    }
}

//Production environment
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'thisIsAlsoASecret',
    maxChecks: 5,
    twilio: {
        accountSid: 'AC03a1d5974f85618a9e4a7d1dfea26fb4',
        authToken: '805d32b9fdade09f36448a2c252e1cdb',
        //fromPhone: '+18507903768'
    }
}

// Determine which environment was passed as a command-line argument
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//Check that the current environment is one of the environment above, if not, default to staging
let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
