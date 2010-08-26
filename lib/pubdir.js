var path   = require('path'),
    fs     = require('fs'),
    url    = require('url'),
    Script = process.binding('evals').Script;
    
module.exports = function(config, server) {

    config.index = config.index || 'index.html';
    config.cache = config.cache || 3600 * 24 * 365;
    config.ssi   = config.ssi   || true;

    this.stack.push(function(req, res) {

        function ssi(file) {

            fs.readFile(file, function(err, data) {

                if (err) {

                    return res.writeHead(404);
                }
                else {

                    res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                }

                data = data.toString();

                // Compile SSI directives into javascript
                data = data.replace(/"/gim, '\\"');
                data = '__write("' + data + '"); __end();';
                data = data.replace(/<!--#if expr=\\"([^"]+)\\"-->/gim, '"); if ($1) { __write("');
                data = data.replace(/<!--#elif expr=\\"([^"]+)\\"-->/gim, '"); } else if ($1) { __write("');
                data = data.replace(/<!--#else-->/gim, '"); else { __write("');
                data = data.replace(/<!--#endif-->/gim, '")} __write("');
                data = data.replace(/<!--#include (file|virtual)=\\"([^"]+)\\"-->/gim, '"); __include("$2","$1"); __write("');
                data = data.replace(/<!--#set var=\\"([^"]+)\\" value="([^"]+)"-->/gim, '"); $1=$2; __write("');
                data = data.replace(/<!--#exec (cgi|cmd)=\\"([^"]+)\\"-->/gim, '"); __exec("$2","$1"); __write("');
                data = data.replace(/<!--#config (timefmt|sizefmt|errmsg)=\\"([^"]+)\\"-->/gim, '"); __config("$2","$1"); __write("');
                data = data.replace(/<!--#echo var=\\"([^"]+)\\"-->/gim, '"); __echo("$1"); __write("');
                data = data.replace(/<!--#(flastmod|fsize) (file|virtual)=\\"([^"]+)\\"-->/gim, '"); __$1("$3","$2")');
                data = data.replace(/<!--#printenv-->/gim, '"); __printenv(); __write("');
                data = data.replace(/(\r\n|\r|\n)/gmi, '\\$1');

                // Run the SSI script
                Script.runInNewContext(data, {
                    __write: function(value) {

                       if (value != '') {

                           res.write(value);
                       }
                    },
                    __echo: function(httpvar) {
                        
                        //TODO
                    },
                    __include: function(filepath, type) {

                        if (type == 'file') {

                            filepath = path.join(path.dirname(file), filepath);
                        }
                        else {

                            filepath = path.join(config.location, filepath);
                        }
                       
                        res.write(fs.readFileSync(filepath));
                   },
                   __exec: function(cmd, type) {
                       
                       //TODO
                   },
                   __config: function(key, value) {
                       
                       //TODO
                   },
                   __flastmod: function(file, type) {
                       
                       //TODO
                   },
                   __fsize: function(file, type) {
                       
                       //TODO
                   },
                   __end: function() {

                       res.end();
                   }
                });
            });
        }

        var pathname = req.uri.pathname;

        if (pathname.match(config.path)) {

            var file = path.join(config.location, pathname),
                ext  = path.extname(file);

            if (ext == '') {

                file = path.join(file, config.index);
                ext  = path.extname(config.index);
            }

            if (ext in {'.shtml': true, '.shtm': true, '.stm': true}) {
                
                ssi(file);
            }
            else {

                res.sendfile(file);
            }
        }

        return false;
    });
}