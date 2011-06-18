# Redobj

## Description

Redobj is a simple non-blocking object data mapper built on top of `node_redis`.

##Install
### Install npm if you haven't done this yet:
    curl http://npmjs.org/install.sh | sh

### Install redobj

    npm install redobj

##Documentation

Use `dox` in order to generage API docs. Will add a static page to pages.github.com with the docs.

Simple example, included in `examples/simple.js`:

    var redobj  = require("../lib/redobj")
      , redis   = require("redis");

    var client = redis.createClient();

    var redobj = new redobj.Redobj(client, 'example', {
        a: redobj.string('backref')
      , b: redobj.set()
      , c: redobj.list('backref')
    });

    var obj = { a: 'a string', b: [ 'a', 'list', 'a' ], c: [ 'a', 'set', 'a' ] }

    redobj.set(obj, function(err, obj) {
      var id = obj._id;
      console.log("Object stored with id", id);
      redobj.get(id, function(err, obj) {
        console.log("Object retrieved", obj);
        redobj.find('c', 'set', ['a', 'b'], function(err, obj) {
          console.log("Object found, only `a` and `b` keys were retrieved", obj);
          redobj.del(obj, function(err, obj) {
            console.log("Object deleted");
          });
        });
      });
    });

##Defining object structure

Currently only one level objects are supported. The values may be interpreted as `strings`, `lists` and `sets`. Redobj will also store back references in case the key is created with the corresponding flag.  Example:

    var model = new redobj.Redobj(redis_client, 'test' {
        a: redobj.string('backref')
      , b: redobj.set()
      , c: redobj.list('backref')
    });

##`set`/`get`/`del`

Now we can use the Redobj model in order to set, get and delete read objects into redis data store:

    model.set({ a: 1, b: ['x', 'x'], c: ['y', 'y'] }, function(err, obj) {
        ... 
    });

    model.get(10, ['a', 'b'], function(err, obj) {
        ... 
    });

    model.del(10, function(err, obj) {
        ...
    });

The second argument passed to the `get` function is optional and should contain the list of keys that you want to retrieve. Also available for the `set` function, will only save the specified keys.

##`mset`/`mget`/`mdel`

These functions are the same way as their equivalents `set`/`get`/`del`. The difference is that they accepr arrays of objets/ids

    model.mset([ {a: 1}, {a: 2} ], ['a'], function(err, objs) {
        ...
    });

    model.mget([ 1, 2, 3 ], ['a'], function(err, objs) {
        ...
    });

    model.mset([ {_id: 1}, 2 ], ['a'], function(err, objs) {
        ...
    });

##`find`

You will be able to do the backward lookups if a key of your model is marked with `backref` option. In our model `a` and `c` keys are back references, so we can use them for search:

    model.find('a', 'find me', function(err, objs) {
        ... // Will retrieve all the objects where key `a` value is `find me`
    });

    model.find('c', 2, function(err, objs) {
        ... // Will retrieve all the objects where key `c` (a list) contains value `2`
    });

##Available key types:

Currently there are 3 key types available. Ther are mapped to the corresponding Redis primitives.

    1. redobj.string
    2. redobj.list
    3. redobj.set

Shortly I will probably add hashes and embedded models as separate key types.

##Contribute?

Sure, any feedback is appreciated. Feel free to fork and request pulls. I hope I will figure out how to accept them.

##Running tests

Requires `vows` in order to run all the tests:

    npm install vows

Make sure you have a running redis server.

*Important!* The test suite will select Redis database 15 and **flush** it prior to running the tests.

Run tests with one of the following:

    1. node test/redobj.js
    2. vows test/redobj.js


