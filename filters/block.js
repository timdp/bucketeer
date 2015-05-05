var debug = require('debug')('bucketeer/filter/block')

var Filter = function (context) {
  this.context = context
}

Filter.prototype.run = function (obj, options, cb) {
  debug('run', obj.Key)
  cb(null, false)
}

module.exports = Filter
