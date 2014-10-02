var nconf = require('nconf');
var request = require('request');
var session = require('express-session');

exports.login = function (req, res) {
  res.redirect(nconf.get('AUTHORIZE_URL') + '?client_id=' + nconf.get('CLIENT_ID') +'&response_type=code&scope=' + nconf.get('SCOPES'));
};

exports.authorize = function(req, res) {
  if(req.query.code) {
    request.post({
      uri: nconf.get('ACCESS_TOKEN_URL'),
      form: {
          client_id: nconf.get('CLIENT_ID')
        , client_secret: nconf.get('CLIENT_SECRET')
        , code: req.query.code
        , grant_type: 'authorization_code'
      }
    }, saveAuthToken)
  } else {
  	console.log("No token was received.")
    res.redirect('/');
  }

  function saveAuthToken(error, response, body) {
    var message = JSON.parse(body || '{}');
    console.log("token: "+ message.access_token);
    req.session.access_token = message.access_token;
    res.redirect('/apps');
  }
};