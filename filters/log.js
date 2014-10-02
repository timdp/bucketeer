var debug = require('debug')('bucketeer/filter/log');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  console.log(obj.Key);
  cb(null, true);
};
