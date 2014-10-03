var _ = require('lodash');
var debug = require('debug')('bucketeer/action/cloudfront-invalidate');

var Action = function(context) {
  this.context = context;
  this.pathsToInvalidate = [];
}

Action.prototype.dispose = function(cb) {
  this.invalidate(cb);
};

Action.prototype.run = function(obj, options, cb) {
  debug('run', obj.Key);
  this.pathsToInvalidate.push('/' + obj.Key);
  if (this.pathsToInvalidate.length >= 1000) {
    this.invalidate(cb);
  } else {
    cb();
  }
};

Action.prototype.invalidate = function(cb) {
  debug('invalidate', this.pathsToInvalidate);
  var paths = this.pathsToInvalidate;
  this.context.cloudfront.createInvalidation(paths, function(err, result) {
    if (err) {
      return cb(err);
    }
    paths.length = 0;
    cb();
  });
}

module.exports = Action;
