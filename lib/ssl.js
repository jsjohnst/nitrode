var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');


module.exports = function(config) {

    if (config.key && config.cert) {

        config.key = fs.readFileSync(file);
        config.cert = fs.readFileSync(config.cert);

        if (this.config.server.port === undefined) {
            
            this.config.server.port = 443;
        }

        this.setSecure(crypto.createCredentials(config));
    }
}