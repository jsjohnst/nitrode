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
            chunked: true,
            keepalive: true,
            error: function(code, message) { },
            mimes: { },
            index: "index.html"
        },
        compress: {
            mimes: []
        },
        pubdir: {
            path: /var/wwwroot/(.+)/,
            cache: 3600 * 24 * 365,
            ssi: true
        },
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
        },
        stats: {
            interval: 1000, // 1 second
            callback: function(stats) { }
        },
        trottle: {
            connections: 15000
        }
    }
    */
}

var Server = exports.Server = function(config) {

    var layers = {
        server:   {},
        vhost:    {},
        compress: {},
        rewrite:  {},
        ssl:      [],
        auth:     [],
        pubdir:   {},
        request:  {},
        stats:    {}
    };

    this.config = {};
    this.stack  = [];

    for (var name in layers) {

        this.config[name] = config[name] || layers[name];
        
        require('./lib/' + name).call(this, this.config[name], this);
    }

    http.Server.call(this, this.handle);
}

Server.version = "0.3.3";

sys.inherits(Server, http.Server);

Server.prototype.handle = function(req, res) {

    for (var index in this.stack) {
        
        if (this.stack[index].call(this, req, res, this) === false) {

            break;
        }
    }
};