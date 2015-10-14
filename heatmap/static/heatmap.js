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
  Papa.parse(url, {
    header: true,
    download: true,
    dynamicTyping: true,
    complete: function(results) {
      csv = [];
      first_row = true;
      for(idx in results["data"]) {
        var row = results["data"][idx];
        if (first_row) {
          var start_time = row["lat"];
          var end_time = row["lon"];
          first_row = false;
        } else {
          csv.push(new google.maps.LatLng(row["lat"], row["lon"]));
        }
      }
      console.log(results);
                
      loadHeatmap(csv);

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

function loadHeatmap(csv) {
  var pointArray = new google.maps.MVCArray(csv);
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: pointArray,
    radius: 20,
    opacity: 0.8
  });
  heatmap.setMap(map);
}

$(document).ready(function(){
  handleFileSelect();
  google.maps.event.addDomListener(window, 'load', initialize);
});