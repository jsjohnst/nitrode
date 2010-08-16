

module.exports = function(config) {
    
    this.stack.push(function(req, res) {

        for (var i in config) {
            
            var rewrite = config[i],
                matches = req.url.match(rewrite.path);

            if (matches) {

                for (var i in matches) {

                    req.url = req.url.replace('$' + i, matches[i]);
                }
            }
        }

        return true;
    });
}