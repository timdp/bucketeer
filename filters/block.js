var debug = require('debug')('bucketeer/filter/block');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  cb(null, false);
};
