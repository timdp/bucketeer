var _ = require('lodash');
var debug = require('debug')('bucketeer/task/update-object');

var maybeUpdateObject = function(key, data, newData, s3, cb) {
  var change = false;
  for (var dk in newData) {
    if (newData.hasOwnProperty(dk) && data[dk] !== newData[dk]) {
      change = true;
      break;
    }
  }
  newData = _.assign(newData, {
    ContentType:        data.ContentType,
    ContentEncoding:    data.ContentEncoding,
    Metadata:           data.Metadata,
    MetadataDirective:  'REPLACE'
  });
  if (change) {
    s3.copyObject(null, key, null, key, newData, cb);
  } else {
    cb();
  }
};

var Action = function(context) {
  this.context = context;
};

Action.prototype.run = function(obj, options, cb) {
  debug('run', obj.Key);
  var s3 = this.context.s3;
  s3.headObject(obj.Key, function(err, head) {
    if (err) {
      return cb(err);
    }
    maybeUpdateObject(obj.Key, head, options.params, s3, cb);
  });
};

module.exports = Action;
