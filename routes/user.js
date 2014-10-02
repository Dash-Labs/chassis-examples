var request = require('request');

exports.profile = function(req, cb) {
    request.get({
      uri: "https://dash.by/api/chassis/v1/user/profile",
      headers: {Authorization: 'Bearer ' + req.session.access_token}
    }, function(error, response, body) {
        var user = JSON.parse(body);
        return cb(user);
    });
};