var _ = require('lodash');
var debug = require('debug')('action:put-acl');

var getObjectACL = function(key, options, cb) {
  debug('getObjectACL', key);
  options.s3.getObjectAcl({
    Bucket: options.bucket,
    Key: key
  }, cb);
};

var putObjectACL = function(key, acl, options, cb) {
  debug('putObjectACL', key, acl);
  options.s3.putObjectAcl({
    Bucket: options.bucket,
    Key: key,
    ACL: acl
  }, cb);
};

var maybePutObjectACL = function(key, currentACL, options, cb) {
  var newACL = options.acl;
  if (!compareACL(currentACL, newACL)) {
    putObjectACL(key, newACL, options, cb);
  } else {
    cb();
  }
};

// TODO Support other settings
var compareACL = function(currentACL, newACL) {
  switch (newACL) {
    case 'public-read':
      return _.where(currentACL.Grants, {
        Permission: 'READ',
        Grantee: {
          Type: 'Group',
          URI: 'http://acs.amazonaws.com/groups/global/AllUsers'
        }
      }).length;
      break;
    default:
      throw new Error('Unknown ACL setting: ' + newACL);
  }
}

module.exports = function(obj, context, cb) {
  getObjectACL(obj.Key, context.options, function(err, acl) {
    if (err) {
      return cb(err);
    }
    maybePutObjectACL(obj.Key, acl, context.options, cb);
  });
};
