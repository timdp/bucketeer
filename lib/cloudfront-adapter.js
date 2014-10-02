var _ = require('lodash');
var AWS = require('aws-sdk');
var debug = require('debug')('bucketeer/cloudfront-adapter');

var CloudFrontAdapter = function(settings) {
  AWS.config.update({
    accessKeyId: settings.key,
    secretAccessKey: settings.secret
  });
  this._cf = new AWS.CloudFront(settings.distribution);
  this.distribution = settings.distribution;
};

CloudFrontAdapter.prototype.createInvalidation = function(paths, cb) {
  debug('createInvalidation', paths);
  var params = {
    DistributionId: this.distribution,
    InvalidationBatch: {
      CallerReference: '' + new Date().getTime(),
      Paths: {
        Quantity: paths.length,
        Items: paths.map(function(str) {
          return encodeURI(str);
        })
      }
    }
  }
  this._cf.createInvalidation(params, cb);
};

module.exports = CloudFrontAdapter;
