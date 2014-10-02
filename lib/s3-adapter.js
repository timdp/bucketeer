var _ = require('lodash');
var AWS = require('aws-sdk');
var debug = require('debug')('bucketeer/s3-adapter');

var S3Adapter = function(settings) {
  AWS.config.update({
    accessKeyId: settings.key,
    secretAccessKey: settings.secret,
    region: settings.region
  });
  this._s3 = new AWS.S3();
  this.bucket = settings.bucket;
  this.region = settings.region;
};

S3Adapter.prototype.listObjects = function(prefix, marker, options, cb) {
  debug('listObjects', prefix, marker, options);
  var param = _.assign({
    Bucket: this.bucket,
    EncodingType: 'url',
    Delimiter: (typeof prefix === 'string') ? '/' : null,
    Prefix: prefix,
    Marker: marker
  }, options || {});
  this._s3.listObjects(param, function(err, data) {
    if (!err) {
      data.Contents.forEach(function(entry) {
        entry.Key = decodeURIComponent(entry.Key);
      });
    }
    cb(err, data);
  });
};

S3Adapter.prototype.headObject = function(key, cb) {
  debug('headObject', key);
  this._s3.headObject({
    Bucket: this.bucket,
    Key: key
  }, cb);
};

S3Adapter.prototype.getObject = function(key, cb) {
  debug('getObject', key);
  this._s3.getObject({
    Bucket: this.bucket,
    Key: key
  }, cb);
};

S3Adapter.prototype.getObjectAcl = function(key, cb) {
  debug('getObjectAcl', key);
  this._s3.getObjectAcl({
    Bucket: this.bucket,
    Key: key
  }, cb);
};

S3Adapter.prototype.copyObject = function(srcBucket, srcKey, destKey, options, cb) {
  debug('copyObject', srcBucket, srcKey, destKey, options);
  if (typeof srcBucket !== 'string') {
    srcBucket = this.bucket;
  }
  var param = _.assign({
    Bucket: this.bucket,
    CopySource: srcBucket + '/' + srcKey,
    Key: destKey
  }, options || {});
  this._s3.copyObject(param, cb);
};

S3Adapter.prototype.putObjectAcl = function(key, acl, cb) {
  debug('putObjectAcl', key, acl);
  this._s3.putObjectAcl({
    Bucket: this.bucket,
    Key: key,
    ACL: acl
  }, cb);
};

module.exports = S3Adapter;
