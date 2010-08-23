

module.exports = function(config, server) {

    server.maxConnections = config.connections;
}