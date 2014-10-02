var debug = require('debug')('filter:block');

module.exports = function(obj, context, cb) {
  debug('run', obj.Key);
  cb(null, false);
};
