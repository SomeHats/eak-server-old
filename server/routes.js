var express = require('express'),
  sessions = require('./sessions'),
  count = require('./count');

var router = express.Router();

router.get('/api/session', function(req, res) {
  res.json({
    session: req.session,
    headers: req.headers
  });
});
// Create a session
router.post('/api/v1/sessions', function(req, res, next) {
  var model = req.getModel();
  sessions.create(req.body, req.session.userId, model, function (err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

// Check in with a session & its child events
router.post('/api/v1/sessions/:id', function(req, res, next) {
  var model = req.getModel();
  sessions.checkin(req.params.id, req.body, req.session.userId, model, function(err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

// Stop an ongoing session
router.delete('/api/v1/sessions/:id', function(req, res, next) {
  var model = req.getModel();
  sessions.stop(req.params.id, req.session.userId, model, function(err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

// Create a new event on a session
router.post('/api/v1/sessions/:id/events', function(req, res, next) {
  var model = req.getModel();
  sessions.events.create(req.params.id, req.session.userId, req.body, model, function(err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

// Update an on-going event
router.post('/api/v1/sessions/:id/events/:eventId', function(req, res, next) {
  var model = req.getModel();
  sessions.events.update(req.params.id, req.params.eventId, req.body, req.session.userId, model, function(err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

// End an on-going session event
router.delete('/api/v1/sessions/:id/events/:eventId', function(req, res, next) {
  var model = req.getModel();
  sessions.events.stop(req.params.id, req.params.eventId, req.session.userId, model, function(err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

function parseList(list) {
  if (typeof list !== 'string' || !list.trim()) {
    return [];
  }

  return list
    .split(',')
    .map(function(item) {
      return item.trim();
    })
    .filter(function(item) {
      return item !== '';
    });
}

// Count the number of entries for a given type/time:
router.get('/api/v1/count/:ids', function(req, res, next) {
  var model = req.getModel(),
    ids = parseList(req.params.ids),
    types = parseList(req.query.types);

  count.get(ids, types, model, function(err, response) {
    if (err) {
      return next(err);
    }
    res.json(response);
  });
});

module.exports = router;

