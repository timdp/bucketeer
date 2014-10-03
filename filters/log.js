var debug = require('debug')('bucketeer/filter/log');

var Filter = function(context) {
  this.context = context;
};

Filter.prototype.run = function(obj, options, cb) {
  debug('run', obj.Key);
  console.log(typeof options.format === 'string' ? options.format : '%s', obj.Key);
  cb(null, true);
};

module.exports = Filter;
