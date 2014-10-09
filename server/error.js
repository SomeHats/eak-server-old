var errorApp = require('../src/error');

module.exports = function (err, req, res, next) {
  var message, status;
  if (!err) {
    return next();
  }

  message = err.message || err.toString();
  status = parseInt(message, 10);
  status = ((status >= 400) && (status < 600)) ? status : 500;

  if (err.stack) {
    console.error(status, err, err.stack);
  } else {
    console.error(status, err);
  }

  errorApp.createPage(req, res, next).renderStatic(status, status.toString());
};
