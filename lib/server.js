var Buffer   = require('buffer').Buffer,
    url      = require('url'),
    querystr = require('querystring'),
    fs       = require('fs'),
    crypto   = require('crypto'),
    path     = require('path'),
    sys      = require('sys');

module.exports = function(config) {

    config.port      = config.port      || 80;
    config.expose    = config.expose    || true;
    config.chunked   = config.chunked   || true;
    config.keepalive = config.keepalive || true;

    this.httpVersion = '1.1';
    this.listen(config.port, config.host);

    var files = [
        '/etc/mime.types',
        '/etc/apache2/mime.types',              // Apache 2
        '/etc/apache/mime.types',               // Apache 1
        '/etc/httpd/mime.types',                // Mac OS X <=10.5
        '/etc/httpd/conf/mime.types',           // Apache
        '/usr/local/etc/httpd/conf/mime.types',
        '/usr/local/lib/netscape/mime.types',
        '/usr/local/etc/httpd/conf/mime.types', // Apache 1.2
        '/usr/local/etc/mime.types'             // Apache 1.3
    ];

    var mimes = JSON.parse(fs.readFileSync('./conf/mime.json'));

    files.forEach(function(value) {

        try {

            var data = fs.readFileSync(value);

            data.split(/[\r\n]+/).forEach(function(line) {

                line = line.trim();

                if (line.charAt(0) !== '#') {

                    var words = line.split(/\s+/);

                    if (words.length >= 2) {

                        var type = words.shift().toLowerCase();

                        words.forEach(function(suffix) {

                            mimes[suffix.toLowerCase()] = type;
                        });
                    }
                }
            });
        }
        catch(e) { }
    });

    for (var ext in config.mimes) {

        mimes[ext] = config.mimes[ext];
    }

    config.mimes = mimes;

    this.stack.push(function(req, res, self) {

        res.useChunkedEncodingByDefault =
            res.chunkedEncoding =
                config.chunked;

        res.shouldKeepAlive = config.keepalive;

        req.uri = url.parse(req.url, true);

        var writeHead = res.writeHead,
            write     = res.write,
            end       = res.end;
            
        res.writeHead = function(code, headers) {

            if ( ! res.headers['Content-Type']) {

                res.headers['Content-Type'] = 'text/plain; charset=utf8';
            }

            if ( ! res.headers['Content-Encoding']) {

                res.headers['Content-Encoding'] = 'utf8';
            }

            if (this.chunkedEncoding) {

                res.headers['Transfer-Encoding'] = 'chunked';
            }

            var cookies = [];

            for (var name in res.cookies) {

                var val = res.cookies[name];

                if (val instanceof Date) {

                    val = val.toUTCString();
                }
                else if(typeof val == 'boolean') {

                    if (val === true) {

                        cookies.push(name);
                    }

                    continue;
                }

                cookies.push(name + '=' + val);
            }

            res.headers['Set-Cookie'] = cookies.join('; ');
            res.headers['Date'] = new Date().toUTCString();

            if (config.expose) {

                res.headers['Server'] = 'Nitrode ' + this.version;
            }
            
            return writeHead.call(res, code, res.headers);
        }
        
        res.sendfile = function(file, onsent) {

            fs.stat(file, function(err, stats) {

                if (err || ! stats.isFile()) {

                    writeHead.call(res, 404);
                    res.end();
                }
                else
                {
                    var modsince = Date.parse(req.headers['if-modified-since'] || req.headers['if-unmodified-since']);

                    if ( ! isNaN(modsince) && stats.mtime <= modsince) {

                        writeHead.call(res, 304);
                        res.end();
                        
                        return;
                    }
                    else {

                        var mime = 'application/octet-stream',
                            ext  = path.extname(file);

                        if (ext in config.mimes) {

                            mime = config.mimes[ext];
                        }

                        if (res.headers['Content-Type'] === undefined) {
                            
                            res.headers['Content-Type'] = mime;
                        }
                        
                        res.headers['Content-Length'] = stats.size;
                        res.headers['Last-Modified'] = stats.mtime.toUTCString();
                        res.headers['Cache-Control'] = 'public max-age=' + config.cache;

                        var range   = req.headers.range || req.headers['request-range'],
                            options = {};

                        if (range) {

                            var values = range.split('=')[1].split('-');

                            options.from = values[0];
                            options.to   = values[1];
                        }

                        res.writeHead(200);

                        sys.pump(fs.createReadStream(file, options), res, onsent);
                    }
                }
            });
        };

        this.on('error', config.error || function(code, message) {

            res.writeHead(code);
            res.end();
        });
        
        res.headers =
        res.cookies = {};

        if ('cookies' in req.headers) {

            req.cookies = req.headers.cookies.split(/[;,] */);

            req.cookies.forEach(function(value) {

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

        return true;
    });

}