var debug = require('debug')('filter:block');

module.exports = function(obj, options, cb) {
  debug('run', obj.Key);
  cb(null, false);
};
