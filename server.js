if (process.env.NR_ENABLED) {
  require('newrelic');
}

require('coffee-script/register');

var http  = require('http');
var derby = require('derby');
var express = require('./server/express');

var chalk = require('chalk');

var error = require('./server/error');
var publicDir = process.cwd() + '/public';

var defaults = require('./config/defaults');

for(var key in defaults) {
  process.env[key] = process.env[key] || defaults[key];
}

derby.run(function(){
  var store = require('./server/store')(derby);
  express(store, error, function(expressApp, upgrade){
    var server = http.createServer(expressApp);

    require('./server/sockets').setup(server, store);
    server.on('upgrade', upgrade);

    server.listen(process.env.PORT, function() {
      console.log('%d listening. Go to: http://localhost:%d/', process.pid, process.env.PORT);
    });
  });
});
