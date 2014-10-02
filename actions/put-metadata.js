var _ = require('lodash');
var debug = require('debug')('action:put-metadata');

var headObject = function(key, s3, cb) {
  debug('headObject', key);
  s3.headObject({
    Bucket: s3.bucket,
    Key: key
  }, cb);
};

var updateObject = function(key, obj, s3, cb) {
  debug('updateObject', key);
  var param = _.extend(obj, {
    Bucket: s3.bucket,
    CopySource: s3.bucket + '/' + key,
    Key: key
  });
  s3.copyObject(param, cb);
};

var maybeUpdateObject = function(key, head, newData, s3, cb) {
  var change = false;
  for (var dk in newData) {
    if (newData.hasOwnProperty(dk) && head.Metadata[dk] !== newData[dk]) {
      change = true;
      break;
    }
  }
  if (change) {
    var param = {
      ContentType: head.ContentType,
      Metadata: _.extend(head.Metadata, newData),
      MetadataDirective: 'REPLACE'
    };
    updateObject(key, param, s3, cb);
  } else {
    cb();
  }
};

module.exports = function(obj, options, cb) {
  var s3 = this.s3;
  headObject(obj.Key, s3, function(err, head) {
    if (err) {
      return cb(err);
    }
    var newData = options.data;
    maybeUpdateObject(obj.Key, head, newData, s3, cb);
  });
};
