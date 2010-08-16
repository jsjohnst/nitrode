var http = require('http'),
    sys  = require('sys');

exports.createServer = function(handle, config) {

    if (typeof handle != 'function') {

        config = handle;
    }
    else {

        config = config || {};
        config.request = config.request || {};

        if ( ! 'handle' in config.request) {

            config.request.handle = handle;
        }
    }
    
    return new Server(config);
    
    /*
    var config_example = {

        server: {
            port: 80,
            host: undefined,
            expose: true,
            error: function(code, message) { }
        }
        pubdir: {
            path: /var/wwwroot/.+/,
            cache: 3600,
            mimes: { }
        }
        vhost: {
          'game.kohark.com': http.createServer(function(req, resp) {})
        },
        rewrite: [{
            path: /(.+)favicon.ico/,
            location: '../../' + __dirname
        }],
        auth: [{
            path: '',
            callback: function(user, pass) { },
            realm: 'Secure Area',
            retries: 5,
            timeout: 60
        }],
        ssl: {
            cert: undefined,
            key: undefined
        },
        request: {
            handle: function(req, res) {},
        }
    }
    */
}

var Server = exports.Server = function(config) {

    var layers = {
        server:  {},
        vhost:   {},
        rewrite: {},
        ssl:     [],
        auth:    [],
        pubdir:  {},
        request: {}
    };

    this.stack = [];

    for (var name in layers) {
        
        require('./lib/' + name).call(this, config[name] || layers[name]);
    }

    http.Server.call(this, this.handle);
}

Server.version = "0.3.0";

sys.inherits(Server, http.Server);

Server.prototype.handle = function(req, res) {

    for (var index in this.stack) {

        if (this.stack[index].call(this, req, res, this) === false) {

            break;
        }
    }
};