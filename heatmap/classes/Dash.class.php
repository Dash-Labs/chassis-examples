<?php

require_once 'Coordinate.class.php';
require_once 'Config.class.php';

class Dash {

  // dash api
  private static $trip_api = "https://dash.by/api/chassis/v1/trips";
  private static $route_api = "https://dash.by/api/chassis/v1/routes/";
  private static $dash_authorize = "https://dash.by/api/auth/token";

  static function authorize($code) {
    $head = array("Accept" =>"application/json",
                  "Content-type" => "multipart/form-data");
    $header="";
    foreach ($head as $key => $value) {
        $header .= $key . '=' . $value . '&';
    }
    $header = rtrim($header, '&');

    $parameters="";
    $params = array(
        "client_id" => Config::$client_id,
        "client_secret" => Config::$client_secret,
        "code" => $code,
        "grant_type" => "authorization_code"
    );
    foreach ($params as $key => $value) {
        $parameters .= $key . '=' . $value . '&';
    }
    $parameters = rtrim($parameters, '&');

    $ch = curl_init();
    curl_setopt($ch,CURLOPT_URL, self::$dash_authorize);
    curl_setopt($ch,CURLOPT_POST, true);
    curl_setopt($ch,CURLOPT_HEADER, $header);
    curl_setopt($ch,CURLOPT_POSTFIELDS,$parameters);
    curl_setopt($ch,CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $token_string = curl_exec($ch);
    $token_json = json_decode($token_string, true);
    $token = $token_json['access_token'];
    return $token;
  }

  static function heatmap() {
    $token = $_SESSION[Config::$token];
    $trip_id = self::get_user_trip_id($token);
    $coordinate_map = self::get_coordinate_info($trip_id, $token);
    // var_dump($coordinate_map);
    self::create_csv($coordinate_map);
  }

  private static function create_csv($coordinate_map) {
    // Creating downloadable CSV files
    // output headers so that the file is downloaded rather than displayed
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=heatmap.csv');
    
    // create a file pointer connected to the output stream
    $output = fopen("php://output", "w");
    fputcsv($output, array("weight", "lat", "lon"));
    foreach ($coordinate_map as $key => $value) {
      $line = $value . "," . $key;
      $coordinate = explode(',',$key);
      fputcsv($output, array("$value", "$coordinate[0]", "$coordinate[1]"));
    }
    fclose($output);
  }

  private static function get_coordinate_info($trip_id, $token) {
    $coordinate_map = array();
    foreach ($trip_id as $id) {
      $routes = self::get_json_data_from_dash_api(self::$route_api . $id, $token);
      
      // get coordinate
      foreach ($routes as $route) {
        $coordinate = new Coordinate($route['latitude'], $route['longitude']);
        $coordinate_string = $coordinate->__toString();
        if (array_key_exists($coordinate_string, $coordinate_map)) {
            $coordinate_map[$coordinate_string]++;
        } else {
            $coordinate_map[$coordinate_string] = 1;
        }
      }
    }
    return $coordinate_map;
  }

  private static function get_user_trip_id($token) {
    $trips = self::get_json_data_from_dash_api(self::$trip_api, $token);

    // get trip id
    $trip_id = array();
    foreach ($trips['result'] as $trip) {
         array_push($trip_id, $trip['id']);
    }
    return $trip_id;
  }

  private static function get_json_data_from_dash_api($url, $token){
    $curl_h = curl_init($url);

    curl_setopt($curl_h, CURLOPT_HTTPHEADER,
        array(
            "Authorization: Bearer " . $token,
        )
    );

    curl_setopt($curl_h, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($curl_h);
    return json_decode($response, true);
  }
}