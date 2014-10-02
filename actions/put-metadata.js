var _ = require('lodash');
var debug = require('debug')('action:put-metadata');

var headObject = function(key, options, cb) {
  debug('headObject', key);
  options.s3.headObject({
    Bucket: options.bucket,
    Key: key
  }, cb);
};

var updateObject = function(key, obj, options, cb) {
  debug('updateObject', key);
  var param = _.extend(obj, {
    Bucket: options.bucket,
    CopySource: options.bucket + '/' + key,
    Key: key
  });
  options.s3.copyObject(param, cb);
};

var maybeUpdateObject = function(key, head, options, cb) {
  var newData = options.data;
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
    updateObject(key, param, options, cb);
  } else {
    cb();
  }
};

module.exports = function(obj, context, cb) {
  headObject(obj.Key, context.options, function(err, head) {
    if (err) {
      return cb(err);
    }
    maybeUpdateObject(obj.Key, head, context.options, cb);
  });
};
