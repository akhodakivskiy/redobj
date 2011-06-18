/*!
 * Redobj
 * Copyright(c) 2011 Anton Khodakivskiy <akhodakivskiy@gmail.com>
 */

/**
 * Redobj constructor
 *
 * @param {Redis.Client} Redis connection
 * @param {String} name Name to be used in redis keys
 * @api public
 */

Redobj = function(client, name, keys) {
  this.client = client;
  this.name   = name;
  this.keys   = keys;
};

/**
 * Retrieves a single object given its id. Callbacks with null if the object does not exists.
 * The id is assigned to the `_id` property of the object returned.
 *
 * @param {Number} Object id.
 * @param {Array[String]} (optional) Keys that should be retrieved. By default retrieves all the keys.
 * @param {Function} Callback function.
 * @see exports.Redobj#mget
 * @api public
 */

Redobj.prototype.get = function() {
  this._keysCb(arguments, function(id, keys, callback) {
    if (isNaN(id)) {
      callback(new Error('id is not a number'), null);
    } else {
      this._get(id, keys, callback); 
    }
  });
};

/**
 * Saves a single object. Assignes the `_id` property to the object passsed in.
 *
 * @param {Object} obj Object to store.
 * @param {Array[String]} (optional) Keys that should be stored. By default stores all the keys.
 * @param {Function} Callabck function.
 * @see exports.Redobj#mset
 * @api public
 */

Redobj.prototype.set = function() {
  this._keysCb(arguments, function(obj, keys, callback) {
    if (!(obj instanceof Object)) {
      callback(new Error('can only set Object instances'));
    } else {
      this._set(obj, keys, callback);
    }
  });
};

/**
 * Deletes a single object from the storage. 
 * On success deletes the `_id` property of the object passsed in.
 *
 * @param {Object|Number} Expects the `_id` property to be set on the object.
 * @param {Function} Callabck function.
 * @see exports.Redobj#mdel
 * @api public
 */

Redobj.prototype.del = function(obj, callback) {
  if (!(obj instanceof Object)) {
    callback(new Error('can only del Object instances'));
  } else {
    this._del(obj, callback);
  }
};

/**
 * Retrieves multiple objects given their ids.
 * The id is assigned to the `_id` property of each object returned.
 *
 * @param {Array[Number]} Object id.
 * @param {Array[String]} (optional) Keys that should be retrieved. By default retrieves all the keys.
 * @param {Function} Callback function.
 * @see exports.Redobj#get
 * @api public
 */

Redobj.prototype.mget = function() {
  this._chain(arguments, this.get, true);
};

/**
 * Saves multiple objects. Assignes the `_id` property on each saved object.
 *
 * @param {Array[Object]} Objects array to store.
 * @param {Array[String]} (optional) Keys that should be stored. By default stores all the keys.
 * @param {Function} Callabck function.
 * @see exports.Redobj#set
 * @api public
 */

Redobj.prototype.mset = function() {
  this._chain(arguments, this.set, true);
};

/**
 * Deletes multiple objects from the storage. 
 * On success deletes the `_id` property of each object passsed in.
 *
 * @param {Array[Object|Number]} Expects the `_id` property to be set on each object.
 * @param {Function} Callabck function.
 * @see exports.Redobj#del
 * @api public
 */

Redobj.prototype.mdel = function() {
  this._chain(arguments, this.del, false);
};

/**
 * Gets for all the objects with the given key value. 
 * On success deletes the `_id` property of each object passsed in.
 *
 * @param {String} Key name.
 * @param {String} Key value.
 * @param {Array[String]} (optional) Keys that should be stored. By default stores all the keys.
 * @param {Function} Callabck function.
 * @see Redobj#get
 * @see Redobj#mget
 * @api public
 */

Redobj.prototype.find = function(key) {
  this._keysCb(__slice.call(arguments, 1), function(val, keys, callback) {
    var type = this.keys[key];
    if (!type || !type['backref']) {
      callback.call(new Error('no backrefs for key: ' + key));
    } else {
      var key_str = 'backrefs:' + this.name + ':' + key + ':' + val;
      var that = this;
      this.client.smembers(key_str, function(err, ids) {
        if (err) {
          callback(err);
        } else {
          that.mget(ids, keys, callback);
        }
      });
    }
  });
};

/**
 * @api private
 */

Redobj.prototype._delKeyBackref = function(id, key, type, callback) {
  var that = this;

  this.get(id, [key], function(err, res) {
    if (err || res === null || res[key] === undefined) {
      callback.call(that, err);
    } else {
      var value = res[key];
      var key_str = 'backrefs:' + that.name + ':' + key + ':';
      var multi = this.client.multi(); 
      switch (type.name) {
      case STRING_TYPE:
        multi.srem(key_str + value, id);
        break;
      case LIST_TYPE:
      case SET_TYPE:
        for (var i = 0; i < value.length; i++) {
          multi.srem(key_str + value[i], id);
        }
        break;
      }
      multi.exec(function(err, res) {
        callback.call(that, err);
      });
    }
  });
};

Redobj.prototype._addKeyBackref = function(id, key, value, type, callback) {
  var key_str = 'backrefs:' + this.name + ':' + key + ':';

  var multi = this.client.multi();
  switch (type.name) {
  case STRING_TYPE:
    multi.sadd(key_str + value, id);
    break;
  case LIST_TYPE:
  case SET_TYPE:
    for (var i = 0; i < value.length; i++) {
      multi.sadd(key_str + value[i], id);
    }
    break;
  }
  multi.exec(function(err, res) {
    callback.call(this, err);
  });
};

Redobj.prototype._setKeyBackref = function(id, key, value, type, callback) {
  this._delKeyBackref(id, key, type, function(err) {
    if (err) {
      callback(err);
    } else {
      this._addKeyBackref(id, key, value, type, callback);
    }
  });
}

Redobj.prototype._setBackrefs = function(id) {
  this._keysCb(__slice.call(arguments, 1), function(obj, keys, callback) {
    var args = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = obj[key];
      var type = this.keys[key];
      if (key !== undefined && val !== undefined && type !== undefined && type.backref) {
        args.push([id, key, val, type]);
      }
    }
    _chain(this, args, this._setKeyBackref, callback);
  });
};

Redobj.prototype._delBackrefs = function(id) {
  var that = this;
  this._keysCb(__slice.call(arguments, 1), function(obj, keys, callback) {
    var args = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = obj[key];
      var type = this.keys[key];
      if (key !== undefined && val !== undefined && type !== undefined && type.backref) {
        args.push([id, key, type]);
      }
    }
    _chain(that, args, this._delKeyBackref, callback);
  });
};

Redobj.prototype._get = function(id, keys, callback) {
  var obj = new Object();
  var multi = this.client.multi();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var type = this.keys[key];
    if (key && type) {
      this._getKey(multi, id, key, type, function(key, val) {
        if (obj) obj[key] = val;
      });
    }
  }
  multi.exec(function(err, res) {
    if (_isEmpty(obj)) obj = null;
    if (!err && obj) obj._id = id;
    callback(err, obj);
  });
};

Redobj.prototype._getKey = function(multi, id, key, type, callback) {
  var obj_str = this.name + ":" + id;
  var key_str = obj_str + ":" + key;
  var f = function(err, res) {
    if (!err && res) {
      callback(key, res);
    }
  }
  switch (type.name) {
  case STRING_TYPE:
    multi.hget(obj_str, key, f);
    break;
  case LIST_TYPE:
    multi.lrange(key_str, 0, -1, f);
    break;
  case SET_TYPE:
    multi.smembers(key_str, f);
    break;
  default: break;
  }
};

Redobj.prototype._set = function(obj, keys, callback) {
  this._objId(obj, function(err, id) {
    if (err) {
      callback(err);
    } else {
      this._setBackrefs(id, obj, keys, function(err) {
        if (err) {
          callback(err);
        } else {
          var multi = this.client.multi();
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var type = this.keys[key];
            var val = obj[key];
            if (key && val && type) {
              this._setKey(multi, id, key, type, val);
            }
          }
          
          multi.exec(function(err, res) {
            if (!err) obj._id = id;
            callback.call(this, err, obj);
          });
        }
      });
    }
  });
};

Redobj.prototype._setKey = function(multi, id, key, type, val) {
  var obj_str = this.name + ":" + id;
  var key_str = obj_str + ":" + key;
  switch (type.name) {
  case STRING_TYPE:
    multi.hset(obj_str, key, val);
    break;
  case LIST_TYPE:
    multi.del(key_str);
    for (var i = 0; i < val.length; i++) {
      multi.rpush(key_str, val[i]);
    }
    break;
  case SET_TYPE:
    multi.del(key_str);
    for (var i = 0; i < val.length; i++) {
      multi.sadd(key_str, val[i]);
    }
    break;
  default: break;
  }
};

Redobj.prototype._del = function(obj, callback) {
  this._delBackrefs(obj._id, obj, function(err) {
    if (err) {
      callback(err);
    } else {
      var multi = this.client.multi();
      for (var key in this.keys) {
        type = this.keys[key];
        if (key && type) {
          this._delKey(multi, obj._id, key, type);
        }
      }
      
      multi.exec(function(err, res) {
        if (!err) delete obj._id;
        callback.call(this, err, obj);
      });
    }
  });
};

Redobj.prototype._delKey = function(multi, id, key, type) {
  var obj_str = this.name + ":" + id;
  var key_str = obj_str + ":" + key;
  switch (type.name) {
  case STRING_TYPE:
    multi.hdel(obj_str, key);
    break;
  case LIST_TYPE:
  case SET_TYPE:
    multi.del(key_str);
  default: break;
  }
};

Redobj.prototype._objId = function(obj, callback) {
  if (obj._id !== undefined) {
    callback.call(this, null, obj._id);
  } else {
    var that = this;
    this.client.incr("ids:" + this.name, function(err, id) {
      callback.call(that, err, id);
    });
  }
};

Redobj.prototype._chain = function(args, fn, withKeys) {
  this._keysCb(args, function(objs, keys, callback) {
    var a = [];
    for (var i = 0; i < objs.length; i++) {
      if (withKeys) {
        a.push([objs[i], keys]);
      } else {
        a.push([objs[i]]);
      }
    }
    _chain(this, a, fn, callback);
  });
};

__slice = Array.prototype.slice;

Redobj.prototype._keysCb = function(args, callback) {
  var cb = args[args.length - 1];
  var keys = Object.keys(this.keys);
  var first = args[args.length - 2];
  if (args.length > 2) {
    keys = args[args.length - 2];
    first = args[args.length - 3];
  }
  callback.call(this, first, keys, cb);
};

/**
 * Constants
 * @api private
 */

STRING_TYPE = '_string_type';
LIST_TYPE = '_list_type';
SET_TYPE = '_set_type';

function _isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
}


function _chain(that, args, fn, callback) {
  var objs = [];
  var f = function(i) {
    if (i >= args.length) {
      callback.call(that, null, objs);
    } else {
      var arg = args[i];
      arg.push(function(err, res) {
        if (err) {
          callback.call(that, err);
        } else {
          objs.push(res);
          f(i + 1);
        }
      });
      fn.apply(that, arg);
    }
  };
  f(0);
}

function _typeFactory(name, opts) {
  var type = { name: name };
  for (var i = 0; i < opts.length; i++) {
    type[opts[i]] = true;
  }
  return type;
}

function _typeFactoryString() {
  return _typeFactory(STRING_TYPE, arguments);
}

function _typeFactoryList() {
  return _typeFactory(LIST_TYPE, arguments);
}

function _typeFactorySet() {
  return _typeFactory(SET_TYPE, arguments);
}

module.exports.Redobj = Redobj;
module.exports.string = _typeFactoryString;
module.exports.list = _typeFactoryList;
module.exports.set = _typeFactorySet;
