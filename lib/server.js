var Buffer   = require('buffer').Buffer,
    url      = require('url'),
    querystr = require('querystring'),
    fs       = require('fs'),
    crypto   = require('crypto'),
    path     = require('path'),
    sys      = require('sys');

module.exports = function(config) {

    this.httpVersion = '1.1';
    this.listen(config.port, config.host);

    this.stack.push(function(req, res, self) {

        this.on('error', config.error || function(code, message) {

            res.send(code);
        });

        req.url = url.parse(req.url, true);

        res.send = function(code, body, encoding) {
            
            encoding = encoding || 'utf-8';

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

            if (body != undefined) {

                if ( ! res.headers['Content-Type']) {

                    res.headers['Content-Type'] = 'text/html; charset=utf8';
                }

                if ( ! res.headers['Content-Encoding']) {

                    res.headers['Content-Encoding'] = encoding;
                }

                if ( ! body instanceof Buffer) {

                    if (typeof body == 'object') {

                        body = JSON.stringify(body);
                        res.headers['Content-Type'] = 'application/json';
                    }

                    body = new Buffer(body, encoding);
                }

                if (code == 200) {

                    var etag = crypto.createHash('md5')
                        .update(body.toString(encoding))
                        .digest('hex');

                    if (etag == req.headers['If-None-Match']) {

                        res.writeHead(304);
                        res.end();

                        return true;
                    }

                    res.headers['ETag'] = etag;
                }

                res.headers['Content-Length'] = body.length;
            }

            res.writeHead(code, res.headers);
            res.end(body);
        }

        res.stream = function(code, stream, encoding, onend) {

            encoding = encoding || 'binary';

            res.headers['Transfer-Encoding'] = encoding;

            if (config.expose) {

                res.headers['Server'] = 'Nitrode ' + this.version;
            }
            
            res.writeHead(code, res.headers);

            sys.pump(stream, res, onend);
        }

        res.sendfile = function(file, onsent) {

            fs.stat(file, function(err, stats) {

                if (err || ! stats.isFile()) {

                    self.emit('error', 404);
                }
                else
                {
                    var modsince = Date.parse(req.headers['if-modified-since'] || req.headers['if-unmodified-since']);

                    if ( ! isNaN(modsince) && stats.mtime <= modsince) {

                        res.send(304);
                        return false;
                    }
                    else {

                        var mime = 'application/octet-stream',
                            ext  = path.extname(file);


                        res.headers['Content-Type'] = mime;
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

                        res.stream(200, fs.createReadStream(file, options), 'binary', onsent);
                    }
                }
            });
        };

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