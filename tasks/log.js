'use strict'

var debug = require('debug')('bucketeer/task/log')

var Action = function (context) {
  this.context = context
}

Action.prototype.run = function (obj, options, cb) {
  debug('run', obj.Key)
  console.log(typeof options.format === 'string' ? options.format : '%s', obj.Key)
  cb()
}

module.exports = Action
