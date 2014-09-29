var nconf = require('nconf');
var request = require('request');

exports.trips = function (req, res) {
	request.get({
    uri: 'https://dash.by/api/chassis/v1/trips',
    headers: {Authorization: 'Bearer ' + req.session.access_token}
  }, function(error, response, body) {
  	if (!error && response.statusCode == 200) {
    	console.log(body) // Print the response for debugging
    	res.json(JSON.parse(body));
  	}else{
  		var trips = JSON.parse(body);
  		console.log("trips: "+ trips); // Print the response for debugging
  		res.json(response.statusCode, trips);
  	}
  });
}