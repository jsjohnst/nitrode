var cp     = require('child_process'),
    sys    = require('sys'),
    fs     = require('fs'),
    Buffer = require('buffer').Buffer,
    clrf   = new Buffer([0x0d, 0x0a]).toString();

module.exports = function(config) {

    config.mimes = config.mimes || [];

    var conf = JSON.parse(fs.readFileSync('./conf/compress.json'));
    
    config.mimes = config.mimes.concat(conf.mimes);

    for (var i in config.mimes) {

        var mime = config.mimes[i];

        if ( ! (mime instanceof RegExp)) {

            config.mimes[i] = new RegExp(mime);
        }
    }
    
    this.stack.push(function(req, res) {
        
        var write     = res.write,
            writeHead = res.writeHead,
            end       = res.end;

        res.writeHead = function(code, headers) {

            var type  = res.headers['Content-Type'];
            
            if (req.headers['accept-encoding'].indexOf('gzip') != -1) {

                for (var i in config.mimes) {

                    if (config.mimes[i].exec(type)) {

                        var gzip = undefined;

                        try {

                            gzip = new require('compress').GzipStream();
                        }
                        catch(e) {

                            gzip = cp.spawn('gzip', ['-c', '-9']);
                        }


                        delete res.headers['Content-Length'];

                        res.headers['Content-Encoding'] = 'gzip';

                        res.write = function(chunk, encoding) {

                            return gzip.stdin.write(chunk, encoding);
                        }

                        gzip.stdout.on('data', function(data) {

                            write.call(res, data);
                        });

                        res.end = function(chunk, encoding) {

                            if (chunk) {

                                res.write(chunk, encoding);
                            }

                            gzip.stdin.end();
                        };

                        gzip.on('exit', function() {

                           res.write = write;
                           res.end   = end;
                           
                           res.end();
                        });

                        break;
                    }
                }
            }

            res.writeHead = writeHead;

            return res.writeHead(code, headers);
        };

    });
}