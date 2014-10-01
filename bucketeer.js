var AWS = require('aws-sdk');
var _ = require('lodash');
var debug = require('debug')('bucketeer');

var auth = require('./config/auth.json');
var settings = _.assign({
  region: 'us-east-1',
  filters: []
}, require('./config/settings.json'));
var filters = {};
_.uniq(_.pluck(settings.filters, 'name')).forEach(function(name) {
  filters[name] = require('./filters/' + name + '.js');
});
var actions = {};
_.uniq(_.pluck(settings.actions, 'name')).forEach(function(name) {
  actions[name] = require('./actions/' + name + '.js');
});

AWS.config.update({
  accessKeyId: auth.key,
  secretAccessKey: auth.secret,
  region: settings.region
});
var s3 = new AWS.S3(); 

var options = {
  s3: s3,
  bucket: settings.bucket,
  region: settings.region
};

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
  applyAndContinue(data.Contents, false, processObject, afterwards);
};

var processObject = function(obj, toNextObj, idx) {
  debug('applyFiltersToObject', idx, obj.Key);
  applyAndContinue(settings.filters, true, applyFilter.bind(obj), function(err, result) {
      if (result) {
        debug('applyActions', obj.Key);
        applyAndContinue(settings.actions, false, applyAction.bind(obj), toNextObj);
      } else {
        toNextObj();
      }
    });
};

var applyAction = function(action, toNextAction, idx) {
  debug('applyAction', this.Key, idx, action.name, action.options);
  var opt = (typeof action.options === 'object') ?
    _.assign({}, options, action.options) : options;
  actions[action.name](this, opt, toNextAction);
};

var applyFilter = function(filter, toNextFilter, idx) {
  debug('applyFilter', this.Key, idx, filter.name, filter.options);
  var opt = (typeof filter.options === 'object') ?
    _.assign({}, options, filter.options) : options;
  filters[filter.name](this, opt, toNextFilter);
};

var nextBatch = function(marker) {
  var params = {
    Bucket: settings.bucket,
    Delimiter: '/',
    EncodingType: 'url',
    MaxKeys: settings.maxKeys || 100,
    Prefix: currentPrefix
  };
  if (typeof marker !== 'undefined') {
    params.Marker = marker;
  }
  s3.listObjects(params, handleList);
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

var handleError = function(err) {
  console.error(err.stack || new Error().stack);
  process.exit(1);
};

addPrefix('');
nextPrefix();
