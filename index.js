var http     = require('http'),
    fs       = require('fs'),
    sys      = require('sys'),
    url      = require('url'),
    path     = require('path'),
    crypto   = require('crypto'),
    querystr = require('querystring'),
    log      = require('./lib/log'),
    Buffer   = require('buffer').Buffer;

exports.createServer = function(onrequest, config) {

    config = config || {};

    var srv = new exports.Server(config);

    srv.on('request', onrequest);

    return srv;
    
    /*
    var full_example = {
        port: 80,
        host: undefined,
        expose: true,
        bandwidth: {
            throttle: 4 * 1024,
        },
        cache: {
            lifetime: 3600
        },
        mimes: [],
        http: {
            codes: { }
        }
        vhost: [{
          'game.kohark.com': http.createServer(function(req, resp) {})
        }],
        pubdir: '/var/wwwroot/',
        rewrite: [{
            base: '../../' + __dirname,
            rules: [{
                match: 'favicon.ico',
                location: 'favicon.ico'
            }]
        }],
        auth: [{
            path: '',
            type: 'basic',
            user: undefined,
            pass: undefined,
            realm: 'Secure Area'
        }],
        ssl: {
            cert: undefined,
            key: undefined
        }
    }
    */
}

exports.version = "0.2.1";

var Server = exports.Server = function(config) {

    process.EventEmitter.call(this);

    var self = this;

    config = config || {};

    if (config.expose == undefined) {
        config.expose = true;
    }

    config.cache          = config.cache          || {};
    config.cache.lifetime = config.cache.lifetime || 31536000;
    
    config.vhost   = config.vhost   || [];
    config.pubdir  = config.pubdir  || [];
    config.rewrite = config.rewrite || [];
    config.auth    = config.auth    || [];
    config.ssl     = config.ssl     || {};

    this.config = config;

    // TODO: Have these merge rather than replace!
    this.config.mimes = JSON.parse(fs.readFileSync('./conf/mime.json'));

    if (this.config.ssl.key && this.config.ssl.cert) {

        console.log('SSL server configured.');

        this.conf.port = this.config.port || 443;

        this.config.ssl.key  = fs.readFileSync(this.config.ssl.key);
        this.config.ssl.cert = fs.readFileSync(this.config.ssl.cert);

        // TODO: Add support for config.ssl.ca

        console.log('Creating HTTPS server listener...');

        this.server = http.createServer(function(req, res) {self.handle.call(self, req, res)})
            .setSecure(crypto.createCredentials(this.config.ssl))
            .listen(this.config.port, this.config.host, function() {
                console.log('Listening for incoming requests...');
            });


        console.log('Listening for incoming requests...');
    }
    else {

        this.config.port = this.config.port || 80;

        console.log('Creating HTTP server listener...');

        this.server = http.createServer(function(req, res) {self.handle.call(self, req, res)})
            .listen(this.config.port, this.config.host, function() {
                console.log('Listening for incoming requests...');
            });
    }
}

sys.inherits(Server, process.EventEmitter);

Server.prototype.handle = function(req, res) {

    var self = this;

    var host = req.headers.host.split(':')[0];

    this.httpVersion = '1.1';

    if (host in this.config.vhost) {

        log.write(req, 'Redirecting to vhost ' + host);

        this.config.vhost[host].handle(req, res);
    }
    else
    {
        log.write(req, 'Connection established');

        url.normalize = function(url) {
            return url.replace(/\/\/+/, '/')
               .replace(/\.+\//, '/');
        }

        var pathname = url.normalize(url.parse(req.url).pathname);

        req.authorize = function(type, user, pass, realm) {

            if ('authorization' in req.headers) {
                
                var parts = req.headers.authorization.split(' ');

                if (parts[0].toLowerCase() != type) {
                    return false;
                }

                switch(type) {
                    // TODO: Add digest
                    case 'basic': {
                        var credentials = new Buffer(parts[1], 'base64')
                            .toString('utf8')
                            .split(':');

                        return credentials[0] == user && credentials[1] == pass;
                    }
                }
            }

            return false;
        }

        for (var i in this.config.auth) {
            var obj = this.config.auth[i];
            if (pathname.match(obj.path)) {
                if ( ! req.authorize(obj.type, obj.user, obj.pass, obj.realm)) {
                    res.writeHead(401, {
                        'Content-Type': 'text/html',
                        'WWW-Authenticate': 'Basic realm="' + obj.realm + '"'
                    });
                    res.end('<h1>401: Authentication Required</h1>');
                    return;
                }
                else {
                    log.write(req, 'Authenticated as user "' + obj.user + '" in realm "' + obj.realm + '"');
                }
            }
        }

        res.sendfile = function(file, onresult, onclose) {

            var found = false;

            file = url.normalize(file);

            if (path.extname(file) == '') {
                file = path.join(file, 'index.html');
            }

            file = path.join(self.config.pubdir, querystr.unescape(file));

            fs.stat(file, function(err, stats) {

                if (found || err || ! stats.isFile()) {
                    onresult.call(this, false);
                    return;
                }

                found = true;
                onresult.call(this, true);

                var modsince = Date.parse(req.headers['if-modified-since'] || req.headers['if-unmodified-since']);

                if ( ! isNaN(modsince) && stats.mtime <= modsince) {

                    log.write(req, 'Server returned 304 - Not Modified');

                    res.writeHead(304);
                    res.end();
                }
                else
                {
                    log.write(req, 'Client requested file: ' + file);

                    var mime  = 'application/octet-stream',
                        ext   = path.extname(file);

                    if (ext in self.config.mimes) {
                        mime = self.config.mimes[ext];
                    }

                    var headers = {
                        'Content-Type': mime,
                        'Content-Length': stats.size,
                        'Content-Encoding': 'binary',
                        'Last-Modified': stats.mtime.toUTCString(),
                        'Cache-Control': 'public max-age=' + self.config.cache.lifetime,
                        'Date': new Date().toUTCString()
                    };

                    if (self.config.expose) {
                        headers['X-Powered-By'] = 'Nitrode ' + exports.version;
                        headers['Server'] = 'Node.JS ' + process.version;
                    }

                    res.writeHead(200, headers);

                    var range   = req.headers.range || req.headers['request-range'],
                        options = {};

                    if (range) {
                        [from, to] = range.split('=')[1].split('-');
                        options.from = from;
                        options.to = to;
                    }

                    sys.pump(fs.createReadStream(file, options), res, onclose);
                }
            });
            
        };


        log.write(req, 'Requested url ' + req.url);

        res.sendfile(pathname, function(found) {

            if ( ! found) {

                log.write(req, 'Requested path wasn\'t found in pubdirs');

                res.redirect = function(uri) {
                    this.writeHead(303, {'Location': uri});
                    this.end();
                };

                var cookies = {};

                if (req.headers.cookies) {

                    cookies = req.headers.cookies.split(/[;,] */);

                    cookies.forEach(function(value) {

                        var pair = value.split('=');

                        if (pair[0] == 'expires') {
                            pair[1] = Date.parse(pair[1].trim());
                        }
                        else if(pair[0] == 'secure') {
                            pair[1] = true;
                        }
                        else
                        {
                            var val = pair[1].trim(),
                                key = pair[0];

                            if (val[0] === '"') {
                                val = val.slice(1, -1);
                            }

                            if (req.cookies[key] === undefined) {
                                req.cookies[key] = querystr.unescape(pair[1].trim(), true);
                            }
                        }
                    });
                }

                req.cookies = cookies;
                res.cookies =
                res.headers = {};

                res.send = function(body, status, encoding) {

                    if (status != undefined && isNaN(status)) {
                        encoding = status;
                    }

                    if (isNaN(status)) {
                        status = 200;
                    }

                    encoding = encoding || 'utf-8';

                    if (status != 200) {
                        res.writeHead(status);
                        res.end(body);
                    }
                    else
                    {
                        var headers = {
                            'Content-Type': 'text/html; charset=utf8',
                            'Content-Encoding': encoding,
                            'Date': new Date().toUTCString()
                        }

                        if (self.config.expose) {
                            headers['X-Powered-By'] = "Nitrode " + exports.version;
                            headers['Server'] = 'Node.JS ' + process.version;
                        }

                        for (var key in res.headers) {
                            headers[key] = res.headers[value];
                        }

                        if ( ! body instanceof Buffer) {
                            if (typeof body === 'object') {
                                body = JSON.stringify(body);
                                headers['Content-Type'] = 'application/json';
                            }
                            else {
                                body = new Buffer(body || '', encoding);
                            }
                        }

                        var etag = crypto.createHash('md5')
                            .update(body.toString(encoding))
                            .digest('hex');

                        if (headers['ETag'] == req.headers['If-None-Match']) {
                            res.writeHead(304);
                            res.end();
                        }
                        else {

                            headers['Content-Length'] = body.length;
                            headers['ETag'] = etag;

                            res.writeHead(status, headers);
                            res.end(body);
                        }
                    }
                }


                log.write(req, 'Emitting request');

                self.emit('request', req, res);
            }
        });
        
    }
};