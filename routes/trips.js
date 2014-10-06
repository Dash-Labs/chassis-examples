var nconf = require('nconf');
var request = require('request');
var _ = require('lodash');
var async = require('async');
var logger = require('../utils/logger');
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

/**
* Exports a user's trips to a csv file.
**/
exports.trips = function(req, res) {
  try {
    fetchUserVehicles(req, res, function(err, profile, vehicleIdNameArr){
        if (err) {
            logger.error("Error encountered while downloading user's vehicles.");
            logger.error(err.stack);
            res.status(500).json({error: "Error encountered while downloading user's vehicles."});
        }
        else if (vehicleIdNameArr && profile) {
            logger.log("Fetched user vehicles: "+ vehicleIdNameArr.length);
            fetchAllTrips(req, vehicleIdNameArr, function(error, trips) {
               if (error) {
                   res.status(500).json({error: "Error encountered while fetching user's trips"});
               }
               res.setHeader('Content-disposition', 'attachment; filename=dash-trips.csv');
               trips.unshift(Trip.tripSummaryHeader(profile.preferredUnits));
               res.csv(trips);
            });
        }else {
            logger.warn("No user profile or trips found.");
            res.status(400).json({error: "No user profile or trips found."});
        }
    });
  } catch (error) {
        logger.error("Error encountered while exporting user's trips.");
        logger.error(err.stack);
        res.status(500).json({error: "Error encountered while downloading the trips"});
  }
};

/**
* Fetches a user's profile along with their vehicles.
*/
function fetchUserVehicles(req, res, cb) {
    user.profile(req, res, function(err, profile){
        if (err) {
            logger.error("Error occurred while fetching the user profile");
            return cb(err);
        }
        if (profile && profile.vehicles) {
            var vehicleIdNameArr = _.map(profile.vehicles, function(vehicle){
                var result = {};
                result[vehicle.id] = vehicle.name;
                return result;
            });
            return cb(null, profile, vehicleIdNameArr); //return the user profile along with their vehicles
        }else{
            return cb(); //not found
        }
    });
}

/**
* Fetches a user's trips. It fetches the entire trip history by recursively invoking the
*  {@code next_uri} parameter from the response body.
*/
function fetchAllTrips(req, vehicles, cb) {
    var repeat = true;
    var  uri = 'https://dash.by/api/chassis/v1/trips';
    var  trips = [];
    if (!req.session || !req.session.access_token) {
        logger.info("User not logged in..redirecting to the home page.");
        return res.redirect("/");
    }
    async.whilst(
        function () { return repeat; }, //condition to continue the iteration
        function (cb) { //implementation for each iteration
            request.get({
                  uri: uri,
                  headers: {Authorization: 'Bearer ' + req.session.access_token}
                }, function(error, response, body) {
                    if (error || response.statusCode !== 200) {
                        logger.error("Received an error when calling the chassis api for trips.");
                        logger.error(error.stack);
                        return cb(error);
                    }
                    var message = JSON.parse(body);
                    if (message && message.result && message.result.length > 0) {
                        trips = trips.concat(_.map(message.result, _.wrap(vehicles, createTrip)));
                    }
                    if (message && message.nextUrl) {
                        uri =  message.nextUrl;
                        logger.info("Calling the next_url: " + message.nextUrl);
                    }else{
                        repeat = false; //no next uri, iteration can stop now
                    }
                    cb(); //no errors, continue
                });
        },
        function (err) { //error handler
           cb(err, trips);
        }
    );
}

