var redobj  = require("..")
  , redis   = require("redis");

var client = redis.createClient();

var model = new redobj.Redobj(client, 'example', {
    a: redobj.string('backref')
  , b: redobj.set()
  , c: redobj.list('backref')
});

var obj = { a: 'a string', b: [ 'a', 'list', 'a' ], c: [ 'a', 'set', 'a' ] }

model.set(obj, function(err, obj) {
  var id = obj._id;
  console.log("Object stored with id", id);
  model.get(id, function(err, obj) {
    console.log("Object retrieved", obj);
    model.find('c', 'set', ['a', 'b'], function(err, objs) {
      console.log(objs.length + " objects found, only `a` and `b` keys were retrieved", objs);
      model.mdel(objs, function(err, obj) {
        console.log("Object deleted");
        process.exit(0)
      });
    });
  });
});
