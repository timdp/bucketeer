var debug = require('debug')('bucketeer/filter/passthrough');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  cb(null, true);
};
