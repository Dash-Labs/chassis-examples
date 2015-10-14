var nconf = require('nconf');
var request = require('request');
var session = require('express-session');
var logger = require('../utils/logger');

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
  	logger.error("No access token was received from the dash chassis api :(.")
    res.redirect('/');
  }

/**
* Saves the access token in the session.
*/
  function saveAuthToken(error, response, body) {
    if (error) {
        logger.error("An error occurred when calling the dash chassis api for authorization.");
        logger.error(error.stack);
        res.redirect('/');
    } else{
        var message = JSON.parse(body || '{}');
        req.session.access_token = message.access_token;
        res.redirect('/apps');
    }
  }
};