var debug = require('debug')('bucketeer/filter/resume');

var allow = false;

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  if (!allow && new RegExp(options.pattern).test(obj.Key)) {
    debug('matched', obj.Key, options.pattern)
    allow = true;
  }
  cb(null, allow);
};
