'use strict'

var _ = require('lodash')
var S3Facade = require('./lib/s3-facade.js')
var CloudFrontFacade = require('./lib/cloudfront-facade.js')
var Minivault = require('minivault-core')
var userHome = require('user-home')
var debug = require('debug')('bucketeer')
var path = require('path')

var settings = null
var actions = null
var s3 = null
var cloudfront = null
var prefixQueue = []
var seenPrefixes = {}
var currentPrefix = null

var handleError = function (err) {
  console.error(err.stack || new Error(err).stack)
  process.exit(1)
}

var loadActions = function () {
  debug('loadActions')
  var ctx = {
    s3: s3,
    cloudfront: cloudfront
  }
  actions = {}
  _.uniq(settings.actions).forEach(function (action) {
    var obj = null
    try {
      var Cls = require('./' + action.type + 's/' + action.name + '.js')
      obj = new Cls(ctx)
    } catch(e) {
      handleError(new Error('Failed to load action "' + action.name + '": ' +
        e.message))
    }
    if (obj !== null) {
      actions[action.name] = obj
    }
  })
  debug('loadedActions', Object.keys(actions))
}

var addPrefix = function (prefix) {
  if (!seenPrefixes.hasOwnProperty(prefix)) {
    debug('addPrefix', prefix)
    seenPrefixes[prefix] = true
    prefixQueue.push(prefix)
  }
}

var nextPrefix = function () {
  if (prefixQueue.length) {
    currentPrefix = prefixQueue.shift()
    debug('nextPrefix', currentPrefix)
    nextBatch()
  } else {
    disposeActions()
  }
}

var nextBatch = function (marker) {
  s3.listObjects(currentPrefix, marker, null, handleList)
}

var handleList = function (err, data) {
  if (err) {
    return handleError(err)
  }
  checkPrefixes(data.CommonPrefixes)
  debug('handleList', _.pluck(data.Contents, 'Key'))
  var afterwards = (typeof data.NextMarker !== 'undefined') ?
    function () {
      nextBatch(data.NextMarker)
    } :
    nextPrefix
  applyAndContinue(data.Contents,
    processObject,
    afterwards)
}

var checkPrefixes = function (prefixes) {
  _.pluck(prefixes, 'Prefix')
    .filter(function (prefix) {
      return (prefix !== '/')
    }).forEach(addPrefix)
}

var processObject = function (obj, toNextObject, idx) {
  debug('processObject', idx, obj.Key)
  applyAndContinue(settings.actions,
    createFallthrough(obj, toNextObject),
    toNextObject)
}

var createFallthrough = function (obj, toNextObject) {
  return function (action, toNextAction, idx) {
    applyAction(obj, action, function (err, result) {
      if (err) {
        return toNextAction(err)
      }
      // If the action was a filter, we got false here.
      if (result === false) {
        toNextObject()
      } else {
        toNextAction()
      }
    }, idx)
  }
}

var applyAction = function (obj, action, toNextAction, idx) {
  debug('applyAction', obj.Key, idx, action.type, action.name, action.options)
  var cb = getActionCallback(action, toNextAction)
  actions[action.name].run(obj, action.options || {}, cb)
}

var getActionCallback = function (action, toNextAction) {
  if (action.type !== 'filter') {
    return toNextAction
  }
  return function (err, result) {
    if (err) {
      return toNextAction(err)
    }
    // The action is a filter and it returned false. Pass that along.
    if (result === false) {
      toNextAction(null, false)
    } else {
      toNextAction()
    }
  }
}

var disposeActions = function () {
  debug('disposeActions')
  var toDispose = Object.keys(actions).filter(function (name) {
    return (typeof actions[name].dispose === 'function')
  })
  applyAndContinue(toDispose,
    disposeAction,
    done)
}

var disposeAction = function (name, toNextAction, idx) {
  debug('disposeAction', name)
  actions[name].dispose(toNextAction)
}

var done = function () {
  debug('done')
}

var applyAndContinue = function (subjects, cb, after) {
  var i = 0
  var step = function (err, result) {
    if (err) {
      return handleError(err)
    }
    if (i >= subjects.length) {
      debug('after')
      after()
    } else {
      debug('apply', i)
      cb(subjects[i], step, i++)
    }
  }
  step()
}

var getAuth = function () {
  var configFile = path.join(userHome, '.minivault.json')
  try {
    return new Minivault(require(configFile)).getSync('aws')
  } catch (e) {
    debug('minivaultFailure', e)
  }
  return require('./config/auth.json')
}

var run = function () {
  var auth = getAuth()
  settings = _.assign({
    region: 'us-east-1',
    filters: []
  }, require('./config/settings.json'))
  s3 = new S3Facade({
    bucket: settings.bucket,
    region: settings.region,
    key: auth.key,
    secret: auth.secret
  })
  if (typeof settings.cloudfront === 'object' &&
    typeof settings.cloudfront.distribution === 'string') {
    cloudfront = new CloudFrontFacade({
      distribution: settings.cloudfront.distribution,
      key: auth.key,
      secret: auth.secret
    })
  }
  loadActions()
  addPrefix('')
  nextPrefix()
}

run()
