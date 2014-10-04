var _ = require('lodash');

//Constructor
function Trip(dateStart, dateEnd, vehicleName, startAddress, startMapImageUrl, startTemperature, startWeatherConditions, stats, alerts,
            endAddress, endMapImageUrl, endTemperature, endWeatherConditions) {
    this.dateStart = dateStart || '';
    this.dateEnd = dateEnd || '';
    this.vehicleName = vehicleName || '';
    this.startAddress = startAddress || '';
    this.startMapImageUrl = startMapImageUrl || '';
    this.startTemperature = startTemperature || '';
    this.startWeatherConditions = startWeatherConditions || '';
    this.endAddress = endAddress || '';
    this.endMapImageUrl = endMapImageUrl || '';
    this.endTemperature = endTemperature || '';
    this.endWeatherConditions = endWeatherConditions || '';
    this.avgFuelEfficiency = stats.averageFuelEfficiency || '';
    this.averageSpeed = stats.averageSpeed || '';
    this.distanceDriven = round(stats.distanceDriven, 1);
    this.timeDriven = formatTime(stats.timeDriven);
    this.fuelConsumed = round(stats.fuelConsumed, 2);
    this.hardBrakeAlerts = getNumOfAlerts('HardBrake', alerts);
    this.hardAccelerationAlerts = getNumOfAlerts('HardAcceleration', alerts);
    this.speedingAlerts = getNumOfAlerts('Speed', alerts);
    this.engineLightAlerts = getNumOfAlerts('EngineLight', alerts);
}

/**
* Rounds the given {@code value} to the number of decimals as indicated by the {@code decimals} property.
*/
function round(value, decimals) {
    if (!value){
        return 0;
    }
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

/**
* Formats the given time in a "h:mm:ss" format
*/
function formatTime(timeInMinutesVal) {
    if (!timeInMinutesVal) {
        return "00:00:00";
    }
    var timeInMinutes = parseFloat(timeInMinutesVal);
    var hours = Math.floor(timeInMinutes / 60);
    var minutes = Math.floor(timeInMinutes % 60);
    var seconds = Math.floor((timeInMinutes * 60) - (hours * 3600) - (minutes * 60));
    return hours + ":" + minutes + ":" + seconds;
}

/**
* Constructs a trip summary header. It uses the user's {@code preferredUnits} to indicate the measurement units in the
* headers.
*/
function tripSummaryHeader(preferredUnits) {
    var header = {};
    header.startDate = "Start Date";
    header.endDate = "End Date";
    header.vehicleName = "Vehicle Name";
    header.startAddress = "Start Address";
    header.startMapImageUrl = "Start Map Image Url";
    header.startTemperature = "Start Temperature (" + preferredUnits.temperature + ")";
    header.startWeatherConditions = "Start Weather Conditions";
    header.endAddress = "End Address";
    header.endMapImageUrl = "End Map Image Url";
    header.endTemperature = "End Temperature ("+ preferredUnits.temperature + ")";
    header.endWeatherConditions = "End Weather Conditions";
    header.avgFuelEfficiency = "Avg Fuel Efficiency (" + preferredUnits.fuelEfficiency + ")";
    header.avgSpeed = "Avg Speed (" +preferredUnits.distance +"/hour)";
    header.distanceDriven = preferredUnits.distance + " Driven";
    header.timeDriven = "Time Driven (hh:mm:ss)";
    header.fuelConsumed = "Fuel Consumed ("+ preferredUnits.volume + ")";
    header.hardBrakeAlerts = "Hard Brake Alerts";
    header.hardAccelerationAlerts = "Hard Acceleration Alerts";
    header.speedingAlerts = "Speeding Alerts";
    header.engineLightAlerts = "EngineLight Alerts";
    return header;
}

/**
* Calculates the number of alerts belonging to the given {@code alertType}.
*/
function getNumOfAlerts(alertType, alerts) {
    if (alerts) {
        return _.where(alerts, {'alertType' : alertType}).length;
    }
    else {
        return 0;
    }
}

module.exports = Trip;
module.exports.tripSummaryHeader = tripSummaryHeader;