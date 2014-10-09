function filtered(obj, properties) {
  var filteredObj = {},
    i, l;

  if (properties.length === 0) {
    return obj;
  }

  for (i = 0, l = properties.length; i < l; i++) {
    if (obj.hasOwnProperty(properties[i])) {
      filteredObj[properties[i]] = obj[properties[i]];
    }
  }

  return filteredObj;
}

module.exports = {
  get: function(originalIds, types, model, cb) {
    var ids = originalIds.map(function(id) {
      return 'aggregate.' + id.replace(/\./g, '-');
    });

    model.fetch.apply(model, ids.concat([function(err) {
      var res = {},
        entry, i, l;

      if (err) {
        return cb(err);
      }

      for (i = 0, l = ids.length; i < l; i++) {
        entry = model.get(ids[i]);
        if (entry === undefined) {
          return cb('404: id not found: ' + ids[i]);
        }

        res[originalIds[i]] = filtered(entry, types);
      }

      cb(null, res);
    }]));
  }
};
