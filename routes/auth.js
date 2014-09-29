var nconf = require('nconf');
var request = require('request');

exports.login = function (req, res) {
  res.redirect(nconf.get('AUTHORIZE_URL') + '?client_id=' + nconf.get('CLIENT_ID') + '&response_type=code&scope=' + nconf.get('SCOPES'));
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
  	console.log("No authorization_code was received.")
    res.redirect('/');
  }

  function saveAuthToken(error, response, body) {
    if (!error && response.code != 200) {
      //TODO: Remove this: only for debugging
      console.log("received an error while fetching the access token"); 
      console.log(error);
      res.status(response.code).json(body);
    }else{
      var token = JSON.parse(body || '{}');
      req.session.access_token = token.access_token;
    }
  }
};