var _ = require('lodash');
var debug = require('debug')('bucketeer/task/put-acl');

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
    default:
      throw new Error('Unknown ACL setting: ' + newAcl);
  }
};

var Action = function(context) {
  this.context = context;
};

Action.prototype.run = function(obj, options, cb) {
  debug('run', obj.Key);
  var s3 = this.context.s3;
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

module.exports = Action;
