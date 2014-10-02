var debug = require('debug')('bucketeer/action/empty');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  cb();
};
