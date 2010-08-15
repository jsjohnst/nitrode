var nitrode = require('../nitrode');

nitrode.createServer(function(req, res) {
    res.send('<h1>Error 404: Page not found!</h1>', 404);
},
{
    pubdir: __dirname + '/public'
});