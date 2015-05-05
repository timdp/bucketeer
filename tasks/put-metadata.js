var _ = require('lodash')
var debug = require('debug')('bucketeer/task/put-metadata')

var maybeUpdateObject = function (key, head, newData, s3, cb) {
  var change = false
  for (var dk in newData) {
    if (newData.hasOwnProperty(dk) && head.Metadata[dk] !== newData[dk]) {
      change = true
      break
    }
  }
  if (change) {
    s3.copyObject(null, key, null, key, {
      ContentType: head.ContentType,
      Metadata: _.assign(head.Metadata, newData),
      MetadataDirective: 'REPLACE'
    }, cb)
  } else {
    cb()
  }
}

var Action = function (context) {
  this.context = context
}

Action.prototype.run = function (obj, options, cb) {
  debug('run', obj.Key)
  var s3 = this.context.s3
  s3.headObject(obj.Key, function (err, head) {
    if (err) {
      return cb(err)
    }
    maybeUpdateObject(obj.Key, head, options.data, s3, cb)
  })
}

module.exports = Action
