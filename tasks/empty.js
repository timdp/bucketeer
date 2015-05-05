var debug = require('debug')('bucketeer/task/empty')

var Action = function (context) {
  this.context = context
}

Action.prototype.run = function (obj, options, cb) {
  debug('run', obj.Key)
  cb()
}

module.exports = Action
