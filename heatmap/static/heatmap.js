var map, heatmap, pointArray;
var csv = [];
var heatmapURL= document.getElementById("api").innerHTML;
var isContainDataRange = false;
// gradient
var gradient = [
'rgba(169, 169, 169, 0)',
'rgba(80, 80, 80, 1)',
'rgba(64, 64, 64, 1)',
'rgba(48, 48, 48, 1)',
'rgba(32, 32, 32, 1)',
'rgba(16, 16, 16, 1)',
'rgba(0, 0, 0, 1)'];

// html ID
var input_date_start = "input-date-start";
var input_date_end = "input-date-end";

function getDataWithoutTimeRange() {
  addDataIntoMap(heatmapURL);
}

function getDataBetweenDate(start_time, end_time) {
  addDataIntoMap(heatmapURL + '/' + start_time + '/' + end_time);
}

function getDataBetweenDateUserSelected(start_time, end_time) {
  addDataIntoMap(heatmapURL + '/' + start_time + '/' + end_time + '/selected');
}

/**
 * [return the trips activities only within the time range user selected]
 * @param  {[date]} input_start_time [start time user select]
 * @param  {[date]} input_end_time   [end time user select]
 */
function getDataBetweenSelectedRange(input_start_time, input_end_time) {
  console.log("get trip data between date range user select");
  var divide_end_time = new Date(input_start_time);
  divide_end_time.setMonth(input_start_time.getMonth() + 2);
  while (divide_end_time < input_end_time) {
    getDataBetweenDateUserSelected(input_start_time.getTime(), divide_end_time.getTime());
    input_start_time = new Date(divide_end_time);
    divide_end_time.setMonth(divide_end_time.getMonth() + 2);
  }
  getDataBetweenDateUserSelected(input_start_time.getTime(), input_end_time.getTime());
}

function addDataIntoMap(url) {
  $.getJSON(url, function(data) {
    if (jQuery.isEmptyObject(data) && isContainDataRange ===  false) {
      console.log("get all the trip data");
    } else {
      console.log(data);
      start_time = data['start_time'];
      end_time = data['end_time'];
      $.each(data['result'], function (index, row) {
          pointArray.push({
                location: new google.maps.LatLng(row["lat"], row["lon"]),
                weight: row["weight"]
          });
      });
      console.log(pointArray.getLength());
      if (isContainDataRange === false) {
        getDataBetweenDate(start_time, end_time);
      }
    }
  });
}

function toggleHeatmap() {
  heatmap.setMap(heatmap.getMap() ? null : map);
}

function initialize() {
  var mapOptions = {
    zoom: 5,
    center: new google.maps.LatLng(39.496291, -96.830211),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  loadHeatmap();
}

function loadHeatmap() {
  heatmapInitialArray = [];
  pointArray = new google.maps.MVCArray(heatmapInitialArray);
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: pointArray,
    radius: 20,
    opacity: 1,
    maxIntensity: 40,
    gradient: gradient
  });
  heatmap.setMap(map);
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function submit() {
  var input_start_time = $("#" + input_date_start).val();
  var input_end_time = $("#" + input_date_end).val();
  var input_start_time_object = new Date(input_start_time);
  var input_end_time_object = new Date(input_end_time);
  if (isNaN(input_start_time_object.getTime()) || isNaN(input_end_time_object.getTime())) {
    alert("The date field cannot be empty");
  } else {
    if (input_start_time_object > input_end_time_object) {
      alert("start time should smaller than end time");
    } else {
      var url = window.location.href.split("?")[0];
      window.location.href = url +  "?startTime=" + escape(input_start_time) + "&endTime=" + escape(input_end_time);
    }
  }
  return false;
}

function reset() {
  window.location.href = window.location.href.split("?")[0];
  return false;
}

$(document).ready(function(){
  // get start date and end date from url
  var start_time = getParameterByName("startTime");
  var end_time = getParameterByName("endTime");
  $("#" + input_date_start).val(start_time);
  $("#" + input_date_end).val(end_time);

  google.maps.event.addDomListener(window, 'load', initialize);

  // get full trip activities
  if (start_time === "" || end_time === "") {
    isContainDataRange = false;
    getDataWithoutTimeRange();
  } else {
    // get trip activities within the selected date range
    isContainDataRange = true;
    getDataBetweenSelectedRange(new Date(start_time), new Date(end_time));
  }

});