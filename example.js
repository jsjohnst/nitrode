var nitrode = require('../nitrode');

nitrode.createServer(function(req, res) {
    res.headers['Content-Type'] = 'text/html';
    res.send('<h1>Error 404: Page not found!</h1>', 404);
},
{
    pubdir: __dirname + '/public',
    auth: [{
        type: 'basic',
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