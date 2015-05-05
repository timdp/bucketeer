var debug = require('debug')('bucketeer/filter/resume')

var Filter = function (context) {
  this.context = context
  this.allow = false
}

Filter.prototype.run = function (obj, options, cb) {
  debug('run', obj.Key)
  if (!this.allow && new RegExp(options.pattern).test(obj.Key)) {
    debug('matched', obj.Key, options.pattern)
    this.allow = true
  }
  cb(null, this.allow)
}

module.exports = Filter
