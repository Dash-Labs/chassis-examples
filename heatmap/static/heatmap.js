var map, pointarray, heatmap;
var csv = [];
var heatmapURL= document.getElementById("api").innerHTML;

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function handleFileSelect() {
  var url = heatmapURL;
  handleCSVFile(url);
}

function handleFileSelectBetweenDate(start_time, end_time) {
  var url = heatmapURL + '/' + start_time + '/' + end_time;
  handleCSVFile(url);
}

function handleCSVFile(url) {
  $.getJSON(url, function(data) {
    if (jQuery.isEmptyObject(data)) {
      console.log("get all the trip data");
    } else {
      console.log(data);
      start_time = data['start_time'];
      end_time = data['end_time'];
      heatmapArray = [];
      $.each(data['result'], function (index, row) {
          heatmapArray.push({
                location: new google.maps.LatLng(row["lat"], row["lon"]),
                weight: row["weight"]
          });
      });
      loadHeatmap(heatmapArray);
      handleFileSelectBetweenDate(start_time, end_time);
    }
  });
}

function initialize() {
  var mapOptions = {
    zoom: 5,
    center: new google.maps.LatLng(39.854815, -100.276788),
    mapTypeId: google.maps.MapTypeId.TERRAIN
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

function loadHeatmap(heatmapArray) {
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapArray,
    radius: 20,
    opacity: 1,
    map: map
  });
}

$(document).ready(function(){
  handleFileSelect();
  google.maps.event.addDomListener(window, 'load', initialize);
  google.maps.event.addDomListenerOnce(window, "drag", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
    heatmap.setMap(map);
  });
  google.maps.event.addDomListenerOnce(window, "zoom_changed", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
    heatmap.setMap(map);
  });
});