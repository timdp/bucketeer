var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var debug = require('debug')('bucketeer/lib/cloudfront-facade');

var CloudFrontFacade = function(settings) {
  AWS.config.update({
    accessKeyId: settings.key,
    secretAccessKey: settings.secret
  });
  this._cf = new AWS.CloudFront(settings.distribution);
  this.distribution = settings.distribution;
};

CloudFrontFacade.prototype.createInvalidation = function(paths, cb) {
  debug('createInvalidation', paths);
  var params = {
    DistributionId: this.distribution,
    InvalidationBatch: {
      CallerReference: uuid.v4(),
      Paths: {
        Quantity: paths.length,
        Items: paths.map(encodeURI)
      }
    }
  };
  this._cf.createInvalidation(params, cb);
};

module.exports = CloudFrontFacade;
