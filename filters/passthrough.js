var debug = require('debug')('filter:passthrough');

module.exports = function(obj, context, cb) {
  debug('run', obj.Key);
  cb(null, true);
};
