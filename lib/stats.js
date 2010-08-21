function time() {

    return new Date().getTime();
}

function memory() {

    return process.memoryUsage().rss;
}

module.exports = function(config, self) {

    var requests = 0;

    if (config.callback) {

        config.interval = config.interval || 1000;

        setInterval(function() {

            config.callback.call(self, {
                requests: requests,
                memory: process.memoryUsage()
            });

            requests = 0;
            
        }, config.interval);
    }

    this.stack.unshift(function(req, res) {

        requests++;

        req.stats = {
            
            time: time()
        };

        if (config.request) {
            
            req.on('end', function() {

                config.request.call(self, {

                    time: time() - req.stats.time
                });
            });
        }
    });
}