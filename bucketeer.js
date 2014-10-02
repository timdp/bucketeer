var _ = require('lodash');
var debug = require('debug')('bucketeer');
var S3Adapter = require('./lib/s3-adapter.js');

var handleError = function(err) {
  console.error(err.stack || new Error(err).stack);
  process.exit(1);
};

var loadProcessors = function(type) {
  debug('loadProcessors', type);
  var plural = type + 's';
  var result = {};
  _.uniq(_.pluck(settings[plural], 'name')).forEach(function(name) {
    try {
      result[name] = require('./' + plural + '/' + name + '.js');
    } catch(e) {
      handleError(new Error('Failed to load ' + type + ' "' + name + '": '
        + e.message));
    }
  });
  debug('loadedProcessors', type, Object.keys(result));
  return result;
};

var auth = require('./config/auth.json');
var settings = _.assign({
  region: 'us-east-1',
  filters: []
}, require('./config/settings.json'));

var filters = loadProcessors('filter');
var actions = loadProcessors('action');

var s3 = new S3Adapter({
  bucket: settings.bucket,
  region: settings.region,
  key: auth.key,
  secret: auth.secret
});

var prefixQueue = [],
    seenPrefixes = {},
    currentPrefix = null;

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
  applyAndContinue(data.Contents, false,
    processObject,
    afterwards);
};

var processObject = function(obj, toNextObject, idx) {
  debug('applyFiltersToObject', idx, obj.Key);
  applyAndContinue(settings.filters, true,
    applyFilter.bind(obj),
    function(err, result) {
      if (result) {
        debug('applyActionsToObject', obj.Key);
        applyAndContinue(settings.actions, false,
          applyAction.bind(obj),
          toNextObject);
      } else {
        toNextObject();
      }
    });
};

var applyFilter = function(filter, toNextFilter, idx) {
  debug('applyFilter', this.Key, idx, filter.name, filter.options);
  applyProcessor(filters[filter.name], this, filter.options, toNextFilter);
};

var applyAction = function(action, toNextAction, idx) {
  debug('applyAction', this.Key, idx, action.name, action.options);
  applyProcessor(actions[action.name], this, action.options, toNextAction);
};

var applyProcessor = function(proc, obj, opt, cb) {
  var ctx = {
    s3: s3
  };
  proc.call(ctx, obj, opt || {}, cb);
};

var addPrefix = function(prefix) {  
  if (!seenPrefixes.hasOwnProperty(prefix)) {
    debug('addPrefix', prefix);
    seenPrefixes[prefix] = true;
    prefixQueue.push(prefix);
  }
};

var checkPrefixes = function(prefixes) {
  _.pluck(prefixes, 'Prefix')
    .filter(function(prefix) {
      return (prefix !== '/');
    }).forEach(addPrefix);
};

var nextPrefix = function() {
  if (prefixQueue.length) {
    currentPrefix = prefixQueue.shift();
    debug('nextPrefix', currentPrefix);
    nextBatch();
  } else {
    debug('done');
  }
};

var nextBatch = function(marker) {
  s3.listObjects(currentPrefix, marker, null, handleList);
};

var applyAndContinue = function(subjects, allowSkip, cb, after) {
  var i = 0;
  var step = function(err, result) {
    if (err) {
      return handleError(err);
    }
    if (allowSkip && result === false) {
      debug('skip', i);
      after(null, false);
    } else if (i >= subjects.length) {
      debug('after');
      after(null, true);
    } else {
      debug('apply', i);
      cb(subjects[i], step, i++);
    }
  };
  step();
};

addPrefix('');
nextPrefix();
