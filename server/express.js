var express = require('express'),
  cookieSession = require('cookie-session'),
  serveStatic = require('serve-static'),
  compression = require('compression'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  highway = require('racer-highway'),
  derbyLogin = require('derby-login');

module.exports = function (store, error, cb){
  var session = cookieSession({
    keys: [process.env.SECURE_COOKIE_1, process.env.SECURE_COOKIE_2],
    name: 'eak-sess',
    maxage: 1000 * 60 * 60 * 24 * 365
  });

  var handlers = highway(store, {session: session});

  var expressApp = express()
    .use(compression())
    .use(require('./redirects'))
    .use(serveStatic(process.cwd() + '/public'))
    .use(serveStatic(process.env.EAK_STATIC))
    .use(store.modelMiddleware())
    .use(cookieParser())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({extended: true}))
    .use(session)
    .use(derbyLogin.middleware(store, require('../config/login')))
    .use(handlers.middleware);

  expressApp.use(require('./routes'));

  expressApp
    .all('*', function (req, res, next) { next('404: ' + req.url); })
    .use(error);

  require('./aggregate').setup(store, function(err) {
    if (err) {
      throw err;
    }

    cb(expressApp, handlers.upgrade);
  });
};

