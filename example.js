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
        user: 'admin',
        pass: 'admin',
        realm: 'Admin Supreme Area'
    }]
});