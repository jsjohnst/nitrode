var nitrode = require('../nitrode');

var srv = nitrode.createServer({
    server: {
        port: 80,
        expose: true
    },
    pubdir: {
        path: /.+/,
        location: __dirname + '/public'
    },
    auth: [{
        path: /.+/,
        callback: function(user, pass) {
            return {
                'admin' : 'admin',
                'user'  : 'password'
            }[user] == pass;
        },
        realm: 'Secure Area'
    }],
    stats: {
        interval: 1000,
        callback: function(stats) {

            if (stats.requests > 0) {

                console.log('reqs: ' + stats.requests);
            }
        },
        request: function(stats) {

            console.log('request served in: ' + stats.time / 1000 + ' seconds.');
        }
    }
});