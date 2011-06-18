var assert  = require('assert')
  , vows    = require('vows')
  , redobj  = require('../lib/redobj')
  , redis   = require('redis');

client = redis.createClient();
client.select(15)
client.flushdb();

vows.describe('Redobj').addBatch({
  'single calls': {
    topic: new redobj.Redobj(client, 'one', {
      'a': redobj.string(),
      'b': redobj.string(),
    }),
    'set': { 
      topic: function(redobj) {
        obj = { a: 1, b: 2 };
        redobj.set(obj, this.callback);
      },
      'after set': function(err, obj) {
        assert.equal(err, null);
        assert.ok(obj._id !== undefined, '_id is not set')
      },
      'get': {
        topic: function(obj, redobj) {
          redobj.get(obj._id, this.callback);
        },
        'after get': function(err, obj) {
          assert.equal(err, null);
          assert.ok(obj, 'returned obj is null')
          assert.equal(obj.a, 1);
          assert.equal(obj.b, 2);
        },
        'del': {
          topic: function(obj_get, obj_set, redobj) {
            redobj.del(obj_get, this.callback);
          },
          'after del': function(err, obj) {
            assert.equal(err, null);
            assert.equal(obj._id, undefined);
          },
          'verify del': {
            topic: function(obj_del, obj_get, obj_set, redobj) {
              redobj.get(obj_set._id, this.callback);
            },
            'after verify del': function(err, obj) {
              assert.equal(err, null);
              assert.equal(obj, null);
            },
          }
        },
      },
    },
  },
}).addBatch({
  'multiple calls': {
    topic: new redobj.Redobj(client, 'two', {
      'a': redobj.string(),
      'b': redobj.string(),
    }),
    'mset': { 
      topic: function(redobj) {
        objs = new Array();
        for (var i = 0; i < 10; i++) {
          objs.push({ a: 1, b: 2});
        }
        redobj.mset(objs, this.callback);
      },
      'after set': function(err, objs) {
        assert.equal(err, null);
        for (var i = 0; i < objs.length; i++) {
          assert.ok(objs[i]._id !== undefined, '_id is not set')
        }
      },
      'get': {
        topic: function(objs, redobj) {
          ids = []
          for (var i = 0; i < objs.length; i++) {
            ids.push(objs[i]._id);
          }
          redobj.mget(ids, this.callback);
        },
        'after get': function(err, objs) {
          assert.equal(err, null);
          assert.ok(objs, 'returned obj is null')
          for (var i = 0; i < objs.length; i++) {
            assert.equal(objs[i].a, 1);
            assert.equal(objs[i].b, 2);
          }
        },
        'del': {
          topic: function(objs_get, objs_set, redobj) {
            redobj.mdel(objs_get, this.callback);
          },
          'after del': function(err, objs) {
            assert.equal(err, null);
            for (var i = 0; i < objs.length; i++) {
              assert.equal(objs[i]._id, undefined);
            }
          },
          'verify del': {
            topic: function(objs_del, objs_get, objs_set, redobj) {
              ids = []
              for (var i = 0; i < objs_set.length; i++) {
                ids.push(objs_set[i]._id);
              }
              redobj.mget(ids, this.callback);
            },
            'after verify del': function(err, objs) {
              assert.equal(err, null);
              for (var i = 0; i < objs.length; i++) {
                assert.equal(objs[i], null);
              }
            },
          }
        },
      },
    },
  },
}).addBatch({
  'key partials': {
    topic: new redobj.Redobj(client, 'three', {
      'a': redobj.string(),
      'b': redobj.string(),
      'c': redobj.string(),
    }),
    'set': { 
      topic: function(redobj) {
        obj = { a: 1, b: 2 , c: 3 };
        redobj.set(obj, ['a', 'b'], this.callback);
      },
      'after set': function(err, obj) {
        assert.equal(err, null);
        assert.ok(obj._id !== undefined, '_id is not set')
      },
      'get': {
        topic: function(obj, redobj) {
          redobj.get(obj._id, ['b', 'c'], this.callback);
        },
        'after get': function(err, obj) {
          assert.equal(err, null);
          assert.ok(obj, 'returned obj is null')
          assert.equal(obj.a, undefined);
          assert.equal(obj.b, 2);
          assert.equal(obj.c, null);
        },
        'del': {
          topic: function(obj_get, obj_set, redobj) {
            redobj.del(obj_get, this.callback);
          },
          'after del': function(err, obj) {
            assert.equal(err, null);
            assert.equal(obj._id, undefined);
          },
        },
      },
    },
  },
}).addBatch({
  'faulty calls': {
    topic: new redobj.Redobj(client, 'four', {
      'a': redobj.string(),
      'b': redobj.string(),
    }),
    'get non existings _id' : {
      topic: function(redobj) {
        redobj.get(100, this.callback);
      },
      'after': function(err, res) {
        assert.equal(err, null);
        assert.equal(res, null);
      },
    },
    'set null object' : {
      topic: function(redobj) {
        redobj.mset([null, [], 'str'], this.callback);
      },
      'after': function(err, res) {
        assert.ok(err);
        assert.equal(err.message, 'can only set Object instances');
        assert.isUndefined(res);
      },
    },
  },
}).addBatch({
  'backrefs': {
    topic: new redobj.Redobj(client, 'five', {
      'a': redobj.string('backref'),
      'b': redobj.string(),
    }),
    'set': {
      topic: function(redobj) {
        redobj.mset([
          { a: 1, b: 'a' },
          { a: 1, b: 'b' },
          { a: 2, b: 'a' },
          { a: 2, b: 'b' },
        ], this.callback);
      },
      'after': function(err, objs) {
        assert.isNull(err);
      },
      'find on key `a`': {
        topic: function(objs, redobj) {
          redobj.find('a', 1, this.callback);
        },
        'verify found': function(err, objs) {
          assert.isNull(err);
          assert.ok(objs);
          assert.equal(objs.length, 2);
          assert.equal(objs[0].a, 1);
          assert.equal(objs[1].a, 1);
        },
        'mset': {
          topic: function(objs_find, objs_set, redobj) {
            objs_find[0].a = 3
            objs_find[1].a = 3
            redobj.mset(objs_find, this.callback);
          },
          'after': function(err, objs) {
            assert.isNull(err);
            assert.length(objs, 2);
          },
          'set': {
            topic: function(objs_set, objs_find, objs_set, redobj) {
              redobj.find('a', 3, this.callback)
            },
            'after': function(err, objs) {
              assert.isNull(err);
              assert.length(objs, 2);
            },
            'mdel': {
              topic: function(objs_find2, objs_set, objs_find, objs_set, redobj) {
                redobj.mdel(objs_set, this.callback);
              },
              'verify': function(err, objs) {
                assert.isNull(err);
                assert.length(objs, 4);
              },
            },
          },
        },
      },
    },
  },
}).addBatch({
  'sets and lists': {
    topic: new redobj.Redobj(client, 'five', {
      'a': redobj.set('backref'),
      'b': redobj.list('backref'),
    }),
    'set': {
      topic: function(redobj) {
        redobj.set({ a: [1, 2, 2], b: ['z', 'z', 'x'] }, this.callback);
      },
      'after': function(err, obj) {
        assert.isNull(err);
        assert.ok(obj._id);
      },
      'get': {
        topic: function(obj, redobj) {
          redobj.get(obj._id, this.callback);
        },
        'after': function(err, obj) {
          assert.isNull(err);
          assert.ok(obj);
          assert.length(obj.a, 2);
          assert.include(obj.a, '1');
          assert.include(obj.a, '2');
          assert.length(obj.b, 3);
          assert.equal(obj.b[0], 'z');
          assert.equal(obj.b[1], 'z');
          assert.equal(obj.b[2], 'x');
        },
        'find': {
          topic: function(obj_get, obj_set, redobj) {
            redobj.find('a', 2, this.callback);
          },
          'after': function(err, objs) {
            assert.isNull(err);
            assert.length(objs, 1);
            var obj = objs[0];
            assert.length(obj.a, 2);
            assert.include(obj.a, '1');
            assert.length(obj.b, 3);
            assert.equal(obj.b[1], 'z');
          },
          'delete': {
            topic: function(objs_find, obj_get, obj_set, redobj) {
              redobj.mdel(objs_find, this.callback);
            },
            'after': function(err, obj) {
              assert.isNull(err);
              assert.isUndefined(obj._id);
            }
          },
        },
      },
    },
  },
}).export(module)
