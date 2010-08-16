
module.exports = function(config) {

    this.stack.push(function(req, res, self) {
        
        req.auth = req.auth || {

            check: function(callback, realm) {

                if ('authorization' in req.headers) {

                    var parts = req.headers.authorization.split(' ');

                    if (parts[0].toLowerCase() == 'basic') {

                        var credentials = new Buffer(parts[1], 'base64')
                            .toString('utf8')
                            .split(':');

                        if ( !! callback.call(this, credentials[0], credentials[1])) {

                            req.auth.user = credentials[0];

                            return true;
                        }
                    }
                }

                res.headers['WWW-Authenticate'] =
                    'Basic realm="' + config.realm + '"';

                self.emit('error', 401);

                return false;
            },

            authorized: function() {
                
                return this.user !== undefined;
            }
        };

        for(var i in config) {

            if (req.url.pathname.match(config[i].path)) {

                if ( ! req.auth.check(config[i].callback, config[i].realm)) {

                    return false;
                }
            }
        }

        return true;
    });
}