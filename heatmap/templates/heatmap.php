<?php
if(!isset($_SESSION['token'])){ 
  header('Location: ../');
}
?>

<head>
  <link href='http://fonts.googleapis.com/css?family=Open+Sans|Raleway' rel='stylesheet' type='text/css'>
  <style>
    html, body, #map-canvas {
      height: 100%;
      margin: 0px;
      padding: 0px;
      font-family: 'Raleway', sans-serif;
      z-index:1;
    }
  
    #draggable {
      z-index:100; 
      background-color: rgba(200,200,255,.7); 
      width: 250px;
      padding: 20px;
      position:absolute;
      top:10px;
      left:100px;
      cursor: move;
      border: black 1px solid;
    }
    #radius-label, #opacity-label, #max-label {
      margin-top: 10px;
    }
    #radius-slider, #opacity-slider, #max-slider {
      width:250px;
      margin-top: 10px;
    }
    #project {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    #radius-slider .ui-slider-handle, 
    #opacity-slider .ui-slider-handle,
    #max-slider .ui-slider-handle {
      cursor:pointer;
    }
  </style>
  
  <script src="./js/papaparse.min.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=visualization"></script>

  <script src="./js/jquery-2.1.1.min.js"></script>
  <script src="https://code.jquery.com/ui/1.11.0/jquery-ui.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.11.0/themes/smoothness/jquery-ui.css">

  <script>
    var map, pointarray, heatmap;
    var csv = [];
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function handleFileSelect() {
      var url = "/sustainability/energy/api/dash/api/heatmap";

      Papa.parse(url, {
        header: true,
        download: true,
        dynamicTyping: true,
        complete: function(results) {
          csv = [];
          if(results.meta.fields.indexOf("weight") == -1) {
            for(idx in results["data"]) {
              var row = results["data"][idx];
              csv.push(new google.maps.LatLng(row["lat"], row["lon"]))
            }
          } else {
            var max = results["data"][0]["weight"];
            for(idx in results["data"]) {
              var row = results["data"][idx];
              
              max = Math.max(max, row["weight"]);
              csv.push({
                location: new google.maps.LatLng(row["lat"], row["lon"]),
                weight: row["weight"]
              });
            }
            $("#max-label").html("max: "+numberWithCommas(max));
            $("#max-slider").slider("option","max",max);
            $("#max-slider").slider("option","value",max);
          }
          
          console.log(results);
                    
          loadHeatmap(csv);
        }
      });
    }

    function initialize() {
      var mapOptions = {
        zoom: 5,
        center: new google.maps.LatLng(39.854815, -100.276788),
        mapTypeId: google.maps.MapTypeId.SATELLITE
      };
      map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);
    }
    
    function loadHeatmap(csv) {
      var pointArray = new google.maps.MVCArray(csv);
      if(heatmap) heatmap.setMap(null);
      heatmap = new google.maps.visualization.HeatmapLayer({
        data: pointArray,
        radius: $("#radius-slider").slider("value"),
        opacity: $("#opacity-slider").slider("value")
      });
      heatmap.setMap(map);
    }
    
    $(document).ready(function(){
      handleFileSelect();
      google.maps.event.addDomListener(window, 'load', initialize);
      $(function() {
        $( "#draggable" ).draggable();
      });
      $(function() {
        $( "#radius-slider" ).slider({
          orientation: "horizontal",
          range: "min",
          min: 1,
          max: 50,
          value: 20,
          slide: function(event, ui) {
            $("#radius-label").html("radius: " + ui.value);
            if(heatmap == null) return;
            heatmap.set('radius', ui.value);
          }
        });
        $( "#opacity-slider" ).slider({
          orientation: "horizontal",
          range: "min",
          min: 0,
          max: 100,
          value: 50,
          slide: function(event, ui) {
            $("#opacity-label").html("opacity: " + ui.value/100);
            if(heatmap == null) return;
            heatmap.set('opacity', ui.value/100);
          }
        });
        $( "#max-slider" ).slider({
          orientation: "horizontal",
          range: "min",
          min: 0,
          max: 1,
          value: 0,
          slide: function(event, ui) {
            $("#max-label").html("max: " + numberWithCommas(ui.value));
            if(heatmap == null) return;
            heatmap.set('maxIntensity', ui.value);
          }
        });
      });
    });
  </script>
</head>
<body>
  <!-- there goes the map -->
  <div id="map-canvas"> </div>

  <!-- the draggable input and display controls -->
  <div id="draggable">
    <div id="radius-label">radius: 20</div>
    <div id="radius-slider"></div>

    <div id="opacity-label">opacity: 0.5</div>
    <div id="opacity-slider"></div>

    <div id="max-label">max: -</div>
    <div id="max-slider"></div>
  </div>
</body>