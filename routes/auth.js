var nconf = require('nconf');
var request = require('request');
var session = require('express-session');

exports.login = function (req, res) {
  console.log("yay login was called!");
  res.redirect(nconf.get('AUTHORIZE_URL') + '?client_id=' + nconf.get('CLIENT_ID') + '&response_type=code&scope=' + nconf.get('SCOPES'));
};

exports.authorize = function(req, res) {
 console.log("yay authorize was called!");
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
  	console.log("No authorization_code was received.")
    res.redirect('/');
  }

  function saveAuthToken(error, response, body) {
    console.log("yay we got a response for token call!");
    if (!error && response.code != 200) {
      //TODO: Remove this: only for debugging
      console.log("received an error while fetching the access token"); 
      console.log(error);
      res.status(response.code).json(body);
    }else{
      console.log("token!!!say wha????");
      var token = JSON.parse(body || '{}');
      console.log("token!!!"+token);
      req.session.access_token = token.access_token;
    }
  }
};