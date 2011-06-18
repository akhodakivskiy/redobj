# Redobj

## Description

Redobj is a simple object data mapper built on top of `node_redis`.

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


