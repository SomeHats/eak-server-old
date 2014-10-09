var async = require('async'),
  aggregate = require('./aggregate'),
  debug = require('debug')('analytics:sessions');

var timeLimit = 60; // seconds before a session is implicitly closed

function getSession(id, user, model, cb) {
  var session = model.at('games.' + id);
  session.fetch(function(err) {
    var sessionData;
    if (err) {
      debug('Error fetching session ' + id + ': ' + err);
      return cb(err);
    }

    sessionData = session.get();
    if (sessionData === undefined) {
      debug('404: Cannot find session ' + id);
      return cb('404: session ' + id + ' not found');
    }

    if (user !== sessionData.user) {
      debug('403: Cannot update session ' + id + ': users do not match');
      return cb('401: users do not match');
    }

    return cb(null, session, sessionData);
  });
}

function getOpenSession(id, user, model, cb) {
  getSession(id, user, model, function(err, session, sessionData) {
    if (err) {
      return cb(err);
    }

    if (sessionData.finished) {
      debug('400: Cannot update session ' + id + ': session finished');
      return cb('401: session finished');
    }

    cb(null, session, sessionData);
  });
}

function getEvent(sessionFn, sessionId, eventId, user, model, cb) {
  sessionFn(sessionId, user, model, function(err, session) {
    var event;
    if (err) {
      return cb(err);
    }

    event = session.at('events.' + eventId);
    if (event.get() === undefined) {
      return cb('404: Event ' + eventId + ' not found on session ' + sessionId);
    }

    return cb(null, event, session);
  });
}

function getSessionEvent(sessionId, eventId, user, model, cb) {
  getEvent(getSession, sessionId, eventId, user, model, cb);
}

function getOpenSessionEvent(sessionId, eventId, user, model, cb) {
  getEvent(getOpenSession, sessionId, eventId, user, model, cb);
}

function checkinData(id, session) {
  var event = session.get('events.' + id);
  if (event === undefined) { return undefined; }
  return {
    id: id,
    finished: event.finished,
    start: event.start,
    duration: event.duration || 0,
    paths: {
      finished: 'events.' + id + '.finished',
      duration: 'events.' + id + '.duration'
    }
  };
}

function checkiner(session, finish) {
  finish = finish || false;
  return function(event, cb) {
    if (event === undefined) {
      cb('400: Unknown event');
    } else if (event.finished) {
      cb('400: Cannot checkin finished session event');
    } else if (Date.now() - (event.start + event.duration) > timeLimit * 1000) {
      cb('400: Cannot checkin to event ' + event.id + ' after ' + timeLimit + ' seconds');
    } else {
      async.parallel([
        function(cb) {
          session.set(event.paths.duration, Date.now() - event.start, cb);
        },
        function(cb) {
          if (finish) {
            session.set(event.paths.finished, true, cb);
          } else {
            cb();
          }
        }
      ], cb);
    }
  };
}

module.exports = {
  create: function(data, userId, model, cb) {
    data.user = userId;
    data.id = model.id();
    data.finished = false;
    data.duration = 0;
    data.start = Date.now();

    async.parallel([
      function(cb) {
        model.at('games').add(data, cb);
      },
      function(cb) {
        aggregate.addEvent('session', cb);
      }
    ], function(err) {
      if (err) {
        debug('Error adding session event ' + data.id + ' for user ' + userId + ': ' + err);
        return cb(err);
      }

      debug('Added session event ' + data.id + ' for user ' + userId);
      cb(null, {user: userId, id: data.id});
    });
  },

  checkin: function(id, data, user, model, cb) {
    getOpenSession(id, user, model, function(err, session) {
      var checkinEvents;
      if (err) {
        return cb(err);
      }

      if (data.ids === undefined) {
        return cb('400: You must supply a list of ids!');
      }

      checkinEvents = data.ids.map(function (id) {
        return checkinData(id, session);
      });

      checkinEvents.push({
        id: id,
        finished: session.get('finished'),
        start: session.get('start'),
        duration: session.get('duration') || 0,
        paths: {
          finished: 'finished',
          duration: 'duration',
        }
      });

      async.each(checkinEvents, checkiner(session), function(err) {
        if (err) {
          debug('Error checking in ' + data.ids.length + ' ids: ' + err);
          return cb(err);
        }

        debug('Checked in ' + data.ids.length + ' on session ' + id);
        return cb(null, {success: true});
      });
    });
  },

  stop: function(id, user, model, cb) {
    getOpenSession(id, user, model, function(err, session) {
      var checkinEvents;
      if (err) {
        return cb(err);
      }

      checkinEvents = Object.keys(session.get('events') || {}).filter(function(id) {
        return !session.get('events.' + id + '.finished');
      }).map(function(id) {
        return checkinData(id, session);
      });
      checkinEvents.push({
        id: id,
        finished: session.get('finished'),
        start: session.get('start'),
        duration: session.get('duration') || 0,
        paths: {
          finished: 'finished',
          duration: 'duration',
        }
      });

      async.each(checkinEvents, checkiner(session, true), function(err) {
        if (err) {
          debug('Error stopping session: ' + err);
          return cb(err);
        }

        debug('Stopped session ' + id);
        return cb(null, {success: true, session: session.get()});
      });
    });
  },

  events: {
    create: function(sessionId, user, data, model, cb) {
      getOpenSession(sessionId, user, model, function(err, session) {
        var event;
        if (err) {
          return cb(err);
        }

        if (typeof data.type !== 'string' || typeof data.data !== 'object' || typeof data.hasDuration !== 'boolean') {
          return cb('400: invalid body');
        }

        event = {
          id: model.id(),
          start: Date.now(),
          type: data.type,
          data: data.data
        };
        if (data.hasDuration) {
          event.duration = 0;
          event.finished = false;
        } else {
          event.finished = true;
        }

        async.parallel([
          function(cb) {
            session.at('events').add(event, cb);
          },
          function(cb) {
            aggregate.addEvent(event.type, cb);
          }
        ], function(err) {
          if (err) {
            debug('Error adding event ' + event.id + ' to session ' + sessionId + ': ' + err);
            return cb(err);
          }

          debug('Created event ' + event.id + ' on session ' + sessionId);
          cb(null, event);
        });
      });
    },

    update: function(sessionId, eventId, data, user, model, cb) {
      getOpenSessionEvent(sessionId, eventId, user, model, function(err, event) {
        if (err) {
          return cb(err);
        }

        if (!data || Object.keys(data).length < 1) {
          debug('Update event ' + eventId + ': no changes');
          return cb(null, event.get());
        }

        event.setEach('data', data, function(err) {
          if (err) {
            debug('Error updating event ' + eventId, data, err);
            return cb(err);
          }

          debug('Updated event ' + eventId);
          cb(null, event.get());
        });
      });
    },

    stop: function(sessionId, eventId, user, model, cb) {
      getOpenSessionEvent(sessionId, eventId, user, model, function(err, event, session) {
        if (err) {
          return cb(err);
        }

        if (event.get('finished')) {
          debug('Cannot stop already finished event ' + eventId);
          return cb('400: event already finished');
        }

        checkiner(session, true)(checkinData(eventId, session), function(err) {
          if (err) {
            debug('Error stopping event ' + eventId, err);
            return cb(err);
          }

          debug('Stopped event ' + eventId);
          cb(null, event.get());
        });
      });
    }
  }
};
