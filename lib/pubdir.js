var path = require('path'),
    fs   = require('fs'),
    url  = require('url');

module.exports = function(config) {

    config.mimes = config.mimes || {};
    config.cache = config.cache || 3600 * 24 * 365;

    var mimes = JSON.parse(fs.readFileSync('./conf/mime.json'));

    for (var ext in config.mimes) {
        
        mimes[ext] = config.mimes[ext];
    }

    config.mimes = mimes;

    this.stack.push(function(req, res) {

        var pathname = req.url.pathname;
        
        if (path.extname(req.url.pathname) == '') {

            pathname = path.join(pathname, 'index.html');
        }

        if (pathname.match(config.path)) {

            var file = path.join(config.location, pathname);

            res.sendfile(file);

            return false;
        }

        return true;
    });
}