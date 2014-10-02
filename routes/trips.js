var nconf = require('nconf');
var request = require('request');
var _ = require('lodash');
var async = require('async');
var csv = require('express-csv');
var Trip = require('./models/trip.js');
var user = require('./user.js');

var createTrip = function(vehicles, tripBody) {
    var vehicle = _.find(vehicles, function(vehicle){
        return vehicle[tripBody.vehicleId];
    });
    var trip = new Trip(tripBody.dateStart, tripBody.dateEnd, vehicle[tripBody.vehicleId], tripBody.startAddress, tripBody.startMapImageUrl, tripBody.startTemperature, tripBody.startWeatherConditions, tripBody.stats, tripBody.alerts,
    tripBody.endAddress, tripBody.endMapImageUrl, tripBody.endTemperature, tripBody.endWeatherConditions);
    return trip;
};

exports.trips = function(req, res) {
  try {
    fetchUserVehicles(req, function(profile, vehicleIdNameArr){
        if(vehicleIdNameArr) {
            console.log("Fetched user vehicles: "+ vehicleIdNameArr.length);
            fetchAllTrips(req, vehicleIdNameArr, function(error, trips) {
               res.setHeader('Content-disposition', 'attachment; filename=trips.csv');
               trips.unshift(Trip.tripSummaryHeader(profile.preferredUnits));
               res.csv(trips);
            });
        }
    });
  } catch(error) {
    res.json(500, JSON.parse({error: "Error encountered while downloading the trips"}));
  }
};

function fetchUserVehicles(req, cb) {
    user.profile(req, function(profile){
        if (profile && profile.vehicles) {
            var vehicleIdNameArr = _.map(profile.vehicles, function(vehicle){
                var result = {};
                result[vehicle.id] = vehicle.name;
                return result;
            });
            return cb(profile, vehicleIdNameArr);
        }else{
            return cb();
        }
    });
}

function fetchAllTrips(req, vehicles, cb) {
  var done = false;
  var  uri = 'https://dash.by/api/chassis/v1/trips';
  var  trips = [];
  async.until(function(){ return done }, function(cb) {
    request.get({
      uri: uri,
      headers: {Authorization: 'Bearer ' + req.session.access_token}
    }, function(error, response, body) {
        var message = JSON.parse(body);
        if (message && message.result && message.result.length > 0) {
            trips = trips.concat(_.map(message.result, _.wrap(vehicles, createTrip)));
        }
        if(message && message.nextUrl) {
            uri =  message.nextUrl;
            console.log("calling next uri: " + message.nextUrl);
        }else{
            done = true;
        }
      cb();
    });
  }, function(error) {
    cb(error, trips);
  });
}

