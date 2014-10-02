var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('bucketeer/action/cloudfront-invalidate');

var pathsToInvalidate = [];

var invalidate = function(cb) {
  debug('invalidate', pathsToInvalidate);
  var cf = this.cloudfront;
  var createInvalidation = Q.nbind(cf.createInvalidation, cf);
  var chunked =  _.chain(pathsToInvalidate).groupBy(function(element, idx) {
    return Math.floor(idx / 1000);
  }).toArray().value();
  chunked.reduce(function(curr, next) {
      return curr.then(function() {
        return createInvalidation(next);
      });
    }, Q())
    .then(function() {
      cb();
    })
    .fail(cb);
};

var init = function() {
  this.on('allObjectsProcessed', invalidate);
};

var run = function(obj, options, cb) {
  debug(obj.Key);
  pathsToInvalidate.push('/' + obj.Key);
  cb();
};

module.exports = {
  init: init,
  run: run
};
