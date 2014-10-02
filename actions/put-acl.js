var _ = require('lodash');
var debug = require('debug')('action:put-acl');

var getObjectACL = function(key, s3, cb) {
  debug('getObjectACL', key);
  s3.getObjectAcl({
    Bucket: s3.bucket,
    Key: key
  }, cb);
};

var putObjectACL = function(key, acl, s3, cb) {
  debug('putObjectACL', key, acl);
  s3.putObjectAcl({
    Bucket: s3.bucket,
    Key: key,
    ACL: acl
  }, cb);
};

var maybePutObjectACL = function(key, currentACL, newACL, s3, cb) {
  if (!compareACL(currentACL, newACL)) {
    putObjectACL(key, newACL, s3, cb);
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

module.exports = function(obj, options, cb) {
  var s3 = this.s3;
  getObjectACL(obj.Key, s3, function(err, currentACL) {
    if (err) {
      return cb(err);
    }
    var newACL = options.acl;
    maybePutObjectACL(obj.Key, currentACL, newACL, s3, cb);
  });
};
