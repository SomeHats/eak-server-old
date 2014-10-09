module.exports = {
  setup: function(server, store) {
    require('./kitten').setup(server, store);
  }
};
