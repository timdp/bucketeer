var debug = require('debug')('action:empty');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  cb();
};
