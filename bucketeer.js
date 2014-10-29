var _ = require('lodash');
var S3Adapter = require('./lib/s3-adapter.js');
var CloudFrontAdapter = require('./lib/cloudfront-adapter.js');
var debug = require('debug')('bucketeer');

var settings = null,
    actions = null,
    s3 = null,
    cloudfront = null,
    prefixQueue = [],
    seenPrefixes = {},
    currentPrefix = null;

var run = function() {
  var auth = require('./config/auth.json');
  settings = _.assign({
    region: 'us-east-1',
    filters: []
  }, require('./config/settings.json'));
  s3 = new S3Adapter({
    bucket: settings.bucket,
    region: settings.region,
    key: auth.key,
    secret: auth.secret
  });
  if (typeof settings.cloudfront === 'object' &&
      typeof settings.cloudfront.distribution === 'string') {
    cloudfront = new CloudFrontAdapter({
      distribution: settings.cloudfront.distribution,
      key: auth.key,
      secret: auth.secret
    });
  }
  loadActions();
  addPrefix('');
  nextPrefix();
};

var loadActions = function() {
  debug('loadActions');
  var ctx = {
    s3: s3,
    cloudfront: cloudfront
  };
  actions = {};
  _.uniq(settings.actions).forEach(function(action) {
    var obj = null;
    try {
      var cls = require('./' + action.type + 's/' + action.name + '.js');
      obj = new cls(ctx);
    } catch(e) {
      handleError(new Error('Failed to load action "' + action.name + '": ' +
        e.message));
    }
    if (obj !== null) {
      actions[action.name] = obj;
    }
  });
  debug('loadedActions', Object.keys(actions));
};

var addPrefix = function(prefix) {
  if (!seenPrefixes.hasOwnProperty(prefix)) {
    debug('addPrefix', prefix);
    seenPrefixes[prefix] = true;
    prefixQueue.push(prefix);
  }
};

var nextPrefix = function() {
  if (prefixQueue.length) {
    currentPrefix = prefixQueue.shift();
    debug('nextPrefix', currentPrefix);
    nextBatch();
  } else {
    disposeActions();
  }
};

var nextBatch = function(marker) {
  s3.listObjects(currentPrefix, marker, null, handleList);
};

var handleList = function(err, data) {
  if (err) {
    return handleError(err);
  }
  checkPrefixes(data.CommonPrefixes);
  debug('handleList', _.pluck(data.Contents, 'Key'));
  var afterwards = data.isTruncated ?
    function() {
      nextBatch(data.NextMarker);
    } :
    nextPrefix;
  applyAndContinue(data.Contents,
    processObject,
    afterwards);
};

var checkPrefixes = function(prefixes) {
  _.pluck(prefixes, 'Prefix')
    .filter(function(prefix) {
      return (prefix !== '/');
    }).forEach(addPrefix);
};

var processObject = function(obj, toNextObject, idx) {
  debug('processObject', idx, obj.Key);
  applyAndContinue(settings.actions,
    createFallthrough(obj, toNextObject),
    toNextObject);
};

var createFallthrough = function(obj, toNextObject) {
  return function(action, toNextAction, idx) {
    applyAction(obj, action, function(err, result) {
      if (err) {
        return toNextAction(err);
      }
      // If the action was a filter, we got false here.
      if (result === false) {
        toNextObject();
      } else {
        toNextAction();
      }
    }, idx);
  };
};

var applyAction = function(obj, action, toNextAction, idx) {
  debug('applyAction', obj.Key, idx, action.type, action.name, action.options);
  var cb = getActionCallback(action, toNextAction);
  actions[action.name].run(obj, action.options || {}, cb);
};

var getActionCallback = function(action, toNextAction) {
  if (action.type !== 'filter') {
    return toNextAction;
  }
  return function(err, result) {
    if (err) {
      return toNextAction(err);
    }
    // The action is a filter and it returned false. Pass that along.
    if (result === false) {
      toNextAction(null, false);
    } else {
      toNextAction();
    }
  };
};

var disposeActions = function() {
  debug('disposeActions');
  var toDispose = Object.keys(actions).filter(function(name) {
    return (typeof actions[name].dispose === 'function');
  });
  applyAndContinue(toDispose,
    disposeAction,
    done);
};

var disposeAction = function(name, toNextAction, idx) {
  debug('disposeAction', name);
  actions[name].dispose(toNextAction);
};

var done = function() {
  debug('done');
};

var applyAndContinue = function(subjects, cb, after) {
  var i = 0;
  var step = function(err, result) {
    if (err) {
      return handleError(err);
    }
    if (i >= subjects.length) {
      debug('after');
      after();
    } else {
      debug('apply', i);
      cb(subjects[i], step, i++);
    }
  };
  step();
};

var handleError = function(err) {
  console.error(err.stack || new Error(err).stack);
  process.exit(1);
};

run();
