

exports.write = function(req, message) {
        console.log('Client ' + req.connection.remoteAddress + ' ' + message);
    }