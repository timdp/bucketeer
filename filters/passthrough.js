var debug = require('debug')('filter:passthrough');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  cb(null, true);
};
