var moment = require('moment'),
  async = require('async'),
  ProgressBar = require('progress'),
  debugAuto = require('debug')('analytics:aggregate:automated'),
  debugAdd = require('debug')('analytics:aggregate:addevent');

var model;

var types = ['session', 'kitten', 'death', 'edit', 'level', 'cutscene', 'skip', 'action', 'incompatible', 'finish', 'page'],
  intervals = ['minute', 'hour', 'day', 'week', 'month', 'year'];

function relevantAggregateIds(time, intervals) {
  return intervals.map(function(interval) {
    return interval + '-' + time.clone().startOf(interval).unix();
  }).concat(['alltime']);
}

function createBlank() {
  var out = {}, i, l;
  for (i = 0, l = types.length; i < l; i++) {
    out[types[i]] = 0;
  }
  return out;
}

function getBlanks(start, end, intervals) {
  var blanks = [],
    blank = createBlank(types),
    intervalType, st, en, i, l;
  blank.t = 0;
  blank.interval = 'alltime';
  blank.id = 'alltime';
  blanks.push(blank);

  for (i = 0, l = intervals.length; i < l; i++) {
    intervalType = intervals[i];
    st = start.clone().startOf(intervalType);
    en = end.clone().add(intervalType, 1);

    do {
      blank = createBlank(types);
      blank.t = st.unix();
      blank.interval = intervalType;
      blank.id = intervalType + '-' + blank.t;
      blanks.push(blank);
    } while (st.add(intervalType, 1).isBefore(en));
  }
  return blanks;
}

function contains(x, xs) {
  var i, l;
  for (i = 0, l = xs.length; i < l; i++) {
    if (x === xs[i]) {
      return true;
    }
  }
  return false;
}

module.exports = {
  setup: function (store, cb) {
    model = store.createModel().at('aggregate');
    this.prepare(undefined, undefined, cb);
    setInterval(this.prepare, 1000 * 60 * 30);
  },

  addEvent: function (type, timestamp, cb) {
    if (typeof timestamp === 'function') {
      cb = timestamp;
      timestamp = Date.now();
    }

    if (!contains(type, types)) {
      debugAdd('Invalid type: ' + type);
      return cb('400: Type ' + type + ' is not an allowed type!');
    }

    var now = moment(timestamp),
      ids = relevantAggregateIds(now, intervals);

    model.fetch.apply(model, ids.concat([function (err) {
      if (err) {
        debugAdd('Error fetching aggregate ids: ' + ids.join(' '));
        return cb(err);
      }

      async.each(ids, function(id, cb) {
        model.at(id).increment(type, function(err) {
          if (err) {
            debugAdd('Error incrementing id ' + id);
          }

          model.unfetch(id);
          cb(err);
        });
      }, function (err) {
        if (!err) {
          debugAdd('Incremented ' + ids.length + ' ids for event type ' + type);
        }

        cb(err);
      });
    }]));
  },
  prepare: function(start, end, cb) {
    if (typeof cb !== 'function') { cb = function(){ return null; }; }
    // Prepare will make sure there are blank fields for aggregate data a 10 minutes into the past and 50
    // minutes into the future. It should be triggered every 30 minutes.
    var now = Date.now(),
      blanks, bar;

    start = start || moment(now).subtract('minutes', 10);
    end = end || moment(now).add('minutes', 50);
    blanks = getBlanks(start, end, intervals, createBlank);
    debugAuto('preparing to add ' + blanks.length + ' entries');
    if (blanks.length > 100) {
      bar = new ProgressBar('[:bar] :current/:total :etas', {total: blanks.length});
    }

    async.mapLimit(blanks, 5, function(blank, cb) {
      model.fetch(blank.id, function (err) {
        if (err) {
          return cb(err, null);
        }

        if (model.get(blank.id)) {
          model.unfetch(blank.id);
          if (bar) {
            bar.tick();
          }
          return cb(null, false);
        }

        model.set(blank.id, blank, function(err) {
          if (err) {
            return cb(err, null);
          }

          model.unfetch(blank.id);
          if (bar) {
            bar.tick();
          }
          cb(null, true);
        });
      });
    }, function (err, blanks) {
      if (err) {
        cb(err);
      }

      debugAuto('Added ' + (blanks.filter(function (blank) { return blank; }).length) + ' new items');
      cb();
    });
  }
};

