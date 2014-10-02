var debug = require('debug')('bucketeer/action/log');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  console.log(typeof options.format === 'string' ? options.format : '%s', obj.Key);
  cb();
};
