var WebSocket = require('racer-highway/node_modules/ws');

function broadcast(wss, msg) {
  var i, l;
  for (i = 0, l = wss.clients.length; i < l; i++) {
    wss.clients[i].send(msg);
  }
}

module.exports = {
  setup: function(server, store) {
    var wss = new WebSocket.Server({path: '/api/v1/sockets/kitten-count', server: server}),
      model = store.createModel(),
      aggregate = model.at('aggregate.alltime');

    aggregate.subscribe();
    aggregate.on('change', 'kitten', function(count) {
      broadcast(wss, JSON.stringify({count: count}));
    });
  }
};
