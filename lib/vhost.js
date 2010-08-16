

module.exports = function(config) {
    
    this.stack.push(function(req, res) {

        var host = req.headers.host.split(':')[0];

        if (host in config) {

            config[host].emit('request', req, res, config[host]);

            return false;
        }

        return true;
    });
}