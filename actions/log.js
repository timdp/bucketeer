var debug = require('debug')('bucketeer/action/log');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  console.log(obj.Key);
  cb();
};
