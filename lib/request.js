
module.exports = function(config) {

    if (typeof config.handle == 'function') {

        this.stack.push(config.handle);
    }

}