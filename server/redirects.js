var express = require('express'),
  router = express.Router();

router.get('/play.html', function(req, res) {
  res.redirect('/play/');
});

router.get('/:lang/play.html', function(req, res) {
  res.redirect('/' + req.params.lang + '/play/');
});

module.exports = router;
