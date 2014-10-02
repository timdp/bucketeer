var _ = require('lodash');
var debug = require('debug')('bucketeer/action/put-acl');

// TODO Support other settings
var compareAcl = function(currentAcl, newAcl) {
  switch (newAcl) {
    case 'public-read':
      return _.where(currentAcl.Grants, {
        Permission: 'READ',
        Grantee: {
          Type: 'Group',
          URI: 'http://acs.amazonaws.com/groups/global/AllUsers'
        }
      }).length;
      break;
    default:
      throw new Error('Unknown ACL setting: ' + newAcl);
  }
}

module.exports = function(obj, options, cb) {
  var s3 = this.s3;
  s3.getObjectAcl(obj.Key, function(err, currentAcl) {
    if (err) {
      return cb(err);
    }
    if (compareAcl(currentAcl, options.acl)) {
      cb();
    } else {
      s3.putObjectAcl(obj.Key, options.acl, cb);
    }
  });
};
