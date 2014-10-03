var request = require('request');
var logger = require('../utils/logger');

/**
* Fetches a user's profile information
*/
exports.profile = function(req, res, cb) {
    if (!req.session || !req.session.access_token) {
        logger.info("User not logged in..redirecting to the home page.");
        return res.redirect("/");
    }
    request.get({
      uri: "https://dash.by/api/chassis/v1/user",
      headers: {Authorization: 'Bearer ' + req.session.access_token}
    }, function(error, response, body) {
        if (error || response.statusCode !== 200) {
            logger.error("Received an error when fetching the user profile.");
            logger.error("Response code : " + response.statusCode);
            return cb(error, null);
        } else{
            var user = JSON.parse(body);
            return cb(null, user);
        }
    });
};