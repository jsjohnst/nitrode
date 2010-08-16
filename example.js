var nitrode = require('../nitrode');

nitrode.createServer({
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
    }]
});