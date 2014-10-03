var debug = require('debug')('bucketeer/filter/passthrough');

var Filter = function(context) {
  this.context = context;
};

Filter.prototype.run = function(obj, options, cb) {
  debug('run', obj.Key);
  cb(null, true);
};

module.exports = Filter;
