var AWS = require('aws-sdk');
var _ = require('lodash');
var debug = require('debug')('bucketeer');

var auth = require('./config/auth.json');
var settings = _.extend({
  options: {
    filters: {},
    actions: {}
  }
}, require('./config/settings.json'));
var filters = settings.filters.map(function(id) {
  return require('./filters/' + id + '.js');
});
var actions = settings.actions.map(function(id) {
  return require('./actions/' + id + '.js');
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

var configs = {};
['filters', 'actions'].forEach(function(type) {
  configs[type] = settings[type].map(function(id, idx) {
    return settings.options[type].hasOwnProperty(id) ?
      _.extend(options, settings.options[type][id]) :
      options;
  });
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
  applyAndContinue(data.Contents, processObject, afterwards);
};

var processObject = function(obj, toNextObj, idx) {
  debug('applyFiltersToObject', idx, obj.Key);
  applyAndContinue(filters, applyFilter.bind(obj), function(err, result) {
    if (result) {
      debug('applyActions', obj.Key);
      applyAndContinue(actions, applyAction.bind(obj), toNextObj);
    } else {
      toNextObj();
    }
  });
};

var applyAction = function(action, toNextAction, idx) {
  debug('applyAction', idx, this.Key);
  action(this, configs.actions[idx], toNextAction);
};

var applyFilter = function(filter, toNextFilter, idx) {
  debug('applyFilter', idx, this.Key);
  filter(this, configs.filters[idx], function(err, result) {
    if (err) {
      return toNextFilter(err);
    }
    toNextFilter(null, result);
  });
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

var applyAndContinue = function(arr, cb, after) {
  var i = 0;
  var step = function(err, result) {
    if (err) {
      return handleError(err);
    }
    if (result === false) {
      debug('skip', i);
      after(null, false);
    } else if (i >= arr.length) {
      debug('after');
      after(null, true);
    } else {
      debug('apply', i);
      cb(arr[i], step, i++);
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
