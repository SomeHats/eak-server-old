var liveDbMongo = require('livedb-mongo'),
  mongoskin = require('mongoskin'),
  coffeeify = require('coffeeify'),
  livedb = require('livedb');

function redis() {
  var client = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
  if (process.env.REDIS_AUTH) {
    client.auth(process.env.REDIS_AUTH);
  }
  client.select(process.env.REDIS_DB || 0);

  return client;
}

function mongodb() {
  return mongoskin.db(process.env.MONGO_URL, {safe: true, auto_reconnect: true});
}

function setupStore(derby) {
  var redisClient, redisPubsub, store, mongo;

  derby.use(require('racer-bundle'));
  // derby.use(require('racer-schema'), require('./schema'));

  redisClient = redis();
  redisPubsub = redis();
  mongo = liveDbMongo(mongodb());

  store = derby.createStore({
    db: {
      snapshotDb: mongo,
      driver: livedb.redisDriver(mongo, redisClient, redisPubsub)
    }
  });

  store.on('bundle', function(browserify) {
    var pack;

    browserify.transform({global: true}, coffeeify);

    pack = browserify.pack;
    browserify.pack = function(opts) {
      var detectTransform = opts.globalTransform.shift();
      opts.globalTransform.push(detectTransform);
      return pack.apply(this, arguments);
    };
  });

  return store;
}

module.exports = setupStore;
