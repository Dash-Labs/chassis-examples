#!flask/bin/python
from flask import Flask, abort, request, jsonify, redirect, url_for, render_template, session, make_response, send_from_directory
from flask.ext.session import Session
from uuid import uuid4
import requests
import urllib
import json
import csv
import StringIO

app = Flask(__name__, static_folder='static')
app.config.from_object('config')

TRIP_API = app.config["TRIP_API"]
ROUTE_API = app.config["ROUTE_API"]
USER_API = app.config['USER_API']
DASH_AUTHORIZE = app.config["DASH_AUTHORIZE"]
CLIENT_ID = app.config["CLIENT_ID"]
CLIENT_SECRET = app.config["CLIENT_SECRET"]
REDIRECT_URI = app.config["REDIRECT_URI"]
SCOPE = app.config["SCOPE"]

STATE = "state"
TOKEN = "token"
NEXT_URL = "nextUrl"
LATITUDE = 'latitude'
LONGITUDE = 'longitude'
DATE = 'date'
SPEED = 'speed'
VEHICLES = 'vehicles'
VEHICLEID = 'vehicleId'

# SPPED default parameters
PREFERRED_UNITS = 'preferredUnits'
DISTANCE = 'distance'
SPEED_CITY_HIGHWAY_DEFAULT = 'speed_city_highway_default'
MILES = 'Miles'
SPEED_CITY_HIGHWAY_DEFAULT_MILES = 40
SPEED_CITY_HIGHWAY_DEFAULT_KILOMETERS = 64

# FUEL_EFFICIENCY default parameters
FUEL_EFFICIENCY = 'fuelEfficiency'
CITY_FUEL_EFFICIENCY = 'cityFuelEfficiency'
HIGHWAY_FUEL_EFFICIENCY = 'highwayFuelEfficiency'
MILES_PER_US_GALLON = 'MilesPerUSGallon'
MILES_PER_US_GALLON_CITY_DEFAULT = 21
MILES_PER_US_GALLON_HIGHWAY_DEFAULT = 27
MILES_PER_IMPERIAL_GALLON = 'MilesPerImperialGallon'
MILES_PER_IMPERIAL_GALLON_CITY_DEFAULT = 25
MILES_PER_IMPERIAL_GALLON_HIGHWAY_DEFAULT = 32
KILOMETERS_PER_LITER = 'KilometersPerLiter'
KILOMETERS_PER_LITER_CITY_DEFAULT = 9
KILOMETERS_PER_LITER_HIGHWAY_DEFAULT = 11
LITER_PER_100_KILOMETER = 'LiterPer100Kilometer'
LITER_PER_100_KILOMETER_CITY_DEFAULT = 11
LITER_PER_100_KILOMETER_HIGHWAY_DEFAULT = 8.7

# NEXT_URL default parameters
STATE_TIME = "startTime="
END_TIME = "endTime="
MILLISECOND_TIME_LENGTH = 13

sess = Session()

'''
Error Handle Module
'''

@app.errorhandler(400)
def not_found(error):
    return make_response(jsonify({'error': 'Bad request'}), 400)

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html', title='404')

'''
Main Page Module
'''

@app.route('/heatmap/static/<path:path>')
def send_js(path):
    return send_from_directory('static', path)

@app.route('/heatmap/')
@app.route('/heatmap/index')
def index():
    if TOKEN in session:
        return render_template('navigation.html', title='Home')
    else:
        return render_template('login.html', title='login')

@app.route('/heatmap/login')
def login():
    session[STATE] = str(uuid4())
    params = {"client_id": CLIENT_ID,
              "response_type": "code",
              "state": session[STATE],
              "redirect_uri": REDIRECT_URI,
              "scope": SCOPE}
    login_url = "https://dash.by/api/auth/authorize?" + urllib.urlencode(params)
    return redirect(login_url, code=302)

@app.route('/heatmap/logout')
def logout():
    # Clear the session
    session.clear()
    # Redirect the user to the main page
    return redirect(url_for('index'))

@app.route('/heatmap/api/authorize', methods=['GET'])
def authorize():
    code = request.args.get('code', '')
    state = request.args.get('state', '')
    if is_request_Valid(state, code):
        token = get_token(code)
        session[TOKEN] = token
        return redirect(url_for('index'))
    else:
        abort(400)

def is_request_Valid(state, code):
    if STATE not in session or state != session[STATE] or code is None:
        return False
    return True

def get_token(code):
    post_data = {"grant_type": "authorization_code",
                 "code": code,
                 "client_id": CLIENT_ID,
                 "client_secret": CLIENT_SECRET}
    response = requests.post(DASH_AUTHORIZE, data=post_data)
    token_json = response.json()
    return token_json["access_token"]

'''
Trips Activity Heatmap API Module
'''

@app.route('/heatmap/heatmap')
def trip_heatmap():
    if TOKEN in session:
        return render_template('heatmap.html', title='heatmap')
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/heatmap')
def get_current_trip_heatmap():
    if TOKEN in session:
        return get_heatmap(None, None)
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/heatmap/<date_start>/<date_end>', methods=['GET'])
def get_previous_trip_heatmap(date_start, date_end):
    if TOKEN in session:
        return get_heatmap(date_start, date_end)
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/heatmap/<date_start>/<date_end>/<selected>', methods=['GET'])
def get_user_selected_trip_heatmap(date_start, date_end, selected):
    if TOKEN in session:
        if selected == "selected":
            return get_heatmap_selected(date_start, date_end)
        else:
            abort(400)
    else:
        return redirect(url_for('index'))

'''
Trips Activity Heatmap API help function Module
'''

def get_heatmap(date_start, date_end):
    token = session[TOKEN]
    trips = get_trips_data(date_start, date_end, token)

    json_object = {}

    if NEXT_URL in trips:
        nextUrl = trips[NEXT_URL]
        write_next_time_into_json(json_object, nextUrl)
        write_trip_coordinate_data_into_json(json_object, trips, token)

    return json.dumps(json_object)

def get_heatmap_selected(date_start, date_end):
    token = session[TOKEN]
    trips = get_selected_trips_data(date_start, date_end, token)

    json_object = {}
    write_trip_coordinate_data_into_json(json_object, trips, token)

    return json.dumps(json_object)

def write_trip_coordinate_data_into_json(json_object, trips, token):
    # add coordinate data into map
    route_map = dict()
    write_trip_data_into_map(route_map, trips, token)
    # add value in map into json
    write_map_into_json_object(json_object, route_map)

def write_trip_data_into_map(route_map, trips, token):
    for trip in trips['result']:
        routes = get_json_data_from_dash_api(ROUTE_API + trip['id'], token)
        for route in routes:
            write_coordinate_data_into_map(route_map, route)

'''
fuel-efficiency Heatmap API Module
'''

@app.route('/heatmap/pollution-heatmap')
def speed_fuel():
    if TOKEN in session:
        return render_template('pollution-heatmap.html', title='fuel-efficiency info')
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/pollution-heatmap')
def get_current_fuel_efficiency_info():
    if TOKEN in session:
        return get_fuelEfficiency(None, None)
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/pollution-heatmap/<date_start>/<date_end>', methods=['GET'])
def get_previous_fuel_efficiency_info(date_start, date_end):
    if TOKEN in session:
        return get_fuelEfficiency(date_start, date_end)
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/pollution-heatmap/<date_start>/<date_end>/<selected>', methods=['GET'])
def get_user_selected_heatmap(date_start, date_end, selected):
    if TOKEN in session:
        if selected == "selected":
            return get_fuelEfficiency(date_start, date_end)
        else:
            abort(400)
    else:
        return redirect(url_for('index'))

def get_fuelEfficiency(date_start, date_end):
    token = session[TOKEN]
    store_car_info_into_session(token)
    trips = get_trips_data(date_start, date_end, token)

    json_object = {}

    if NEXT_URL in trips:
        nextUrl = trips[NEXT_URL]
        write_next_time_into_json(json_object, nextUrl)
        write_fuelEfficiency_coordinate_data_into_json(json_object, trips, token)

    return json.dumps(json_object)

def write_fuelEfficiency_coordinate_data_into_json(json_object, trips, token):
    # add coordinate data into map
    route_map = dict()
    write_fuelEfficiency_coordinate_data_into_map(route_map, trips, token)
    # add value in map into json
    write_map_into_json_object(json_object, route_map)

def write_fuelEfficiency_coordinate_data_into_map(route_map, trips, token):
    for trip in trips['result']:
        vehicleId = trip[VEHICLEID]
        # get fuel efficiency unit
        fuelEfficiency_unit = session[FUEL_EFFICIENCY]
        # get fuel efficiency data (from API or Default Value)
        cityFuelEfficiency = session[vehicleId + '-' + CITY_FUEL_EFFICIENCY]
        highwayFuelEfficiency = session[vehicleId + '-' + HIGHWAY_FUEL_EFFICIENCY]
        # get default ditance unit value
        distance_unit_value = session[SPEED_CITY_HIGHWAY_DEFAULT]
        # get route data
        routes = get_json_data_from_dash_api(ROUTE_API + trip['id'], token)
        for route in routes:
            if SPEED in route and FUEL_EFFICIENCY in route:
                if route[SPEED] > distance_unit_value:
                   fuelEfficiency = highwayFuelEfficiency
                else:
                   fuelEfficiency = cityFuelEfficiency
                # if the user's preferredUnit.fuelEfficiency is LiterPer100Kilometer,
                # then this is inverted (smaller values are better fuel efficiency)
                if fuelEfficiency_unit == LITER_PER_100_KILOMETER:
                    if route[FUEL_EFFICIENCY] > fuelEfficiency:
                        write_coordinate_data_into_map(route_map, route)
                else:
                    if route[FUEL_EFFICIENCY] < fuelEfficiency:
                        write_coordinate_data_into_map(route_map, route)

def store_car_info_into_session(token):
    user = get_json_data_from_dash_api(USER_API, token)
    # set user-defined distance unit defualt value (Miles or Kilometers)
    set_ditance_unit_value(user[PREFERRED_UNITS][DISTANCE])
    # get user-defined fuel efficiency unit
    fuel_efficiency_unit = user[PREFERRED_UNITS][FUEL_EFFICIENCY]
    # store user-defined fuel efficiency unit in session
    session[FUEL_EFFICIENCY] = fuel_efficiency_unit
    # get default fuel efficiency value based on units
    cityFuelEfficiency = get_city_default_fuel_efficiency_unit_value(fuel_efficiency_unit)
    highwayFuelEfficiency = get_highway_default_fuel_efficiency_unit_value(fuel_efficiency_unit)

    for vehicle in user['vehicles']:
        vehicleId = vehicle['id']
        if CITY_FUEL_EFFICIENCY not in vehicle:
            session[vehicleId + '-' + CITY_FUEL_EFFICIENCY] = cityFuelEfficiency
        else:
            session[vehicleId + '-' + CITY_FUEL_EFFICIENCY] = vehicle[CITY_FUEL_EFFICIENCY]
        if HIGHWAY_FUEL_EFFICIENCY not in vehicle:
            session[vehicleId + '-' + HIGHWAY_FUEL_EFFICIENCY] = highwayFuelEfficiency
        else:
            session[vehicleId + '-' + HIGHWAY_FUEL_EFFICIENCY] = vehicle[HIGHWAY_FUEL_EFFICIENCY]

def set_ditance_unit_value(preferredUnits_distance):
    if preferredUnits_distance == MILES:
        session[SPEED_CITY_HIGHWAY_DEFAULT] = SPEED_CITY_HIGHWAY_DEFAULT_MILES
    else:
        session[SPEED_CITY_HIGHWAY_DEFAULT] = SPEED_CITY_HIGHWAY_DEFAULT_KILOMETERS

def get_city_default_fuel_efficiency_unit_value(preferredUnits_fuelEfficiency):
    if preferredUnits_fuelEfficiency == MILES_PER_US_GALLON:
        return MILES_PER_US_GALLON_CITY_DEFAULT
    elif preferredUnits_fuelEfficiency == MILES_PER_IMPERIAL_GALLON:
        return MILES_PER_IMPERIAL_GALLON_CITY_DEFAULT
    elif preferredUnits_fuelEfficiency == KILOMETERS_PER_LITER:
        return KILOMETERS_PER_LITER_CITY_DEFAULT
    else:
        return LITER_PER_100_KILOMETER_CITY_DEFAULT

def get_highway_default_fuel_efficiency_unit_value(preferredUnits_fuelEfficiency):
    if preferredUnits_fuelEfficiency == MILES_PER_US_GALLON:
        return MILES_PER_US_GALLON_HIGHWAY_DEFAULT
    elif preferredUnits_fuelEfficiency == MILES_PER_IMPERIAL_GALLON:
        return MILES_PER_IMPERIAL_GALLON_HIGHWAY_DEFAULT
    elif preferredUnits_fuelEfficiency == KILOMETERS_PER_LITER:
        return KILOMETERS_PER_LITER_HIGHWAY_DEFAULT
    else:
        return LITER_PER_100_KILOMETER_HIGHWAY_DEFAULT

'''
Function shared by Trip Activity and Fuel-Efficiency Heatmap
'''

def write_map_into_json_object(json_object, route_map):
    json_array = []
    for key in route_map:
        coordinate_object = {}
        coordinate_list = key.split(',')
        coordinate_object['lat'] = coordinate_list[0]
        coordinate_object['lon'] = coordinate_list[1]
        coordinate_object['weight'] = route_map[key]
        json_array.append(coordinate_object)
    json_object['result'] = json_array

def write_coordinate_data_into_map(route_map, route):
    coordinate = str(route[LATITUDE]) + "," + str(route[LONGITUDE])
    if coordinate in route_map:
        route_map[coordinate] += 1
    else:
        route_map[coordinate] = 1

# get next time from nextURL in dash trips API and write into JSON object
def write_next_time_into_json(json_object, nextUrl):
    json_object['start_time'] = get_next_time(nextUrl, STATE_TIME, len(STATE_TIME))
    json_object['end_time'] = get_next_time(nextUrl, END_TIME, len(END_TIME))

# nextUrl: the next_url from Dash Trips API
# keyWord: "startTime" or "endTime"
def get_next_time(nextUrl, keyWord, length):
    keyWordIndex = nextUrl.rfind(keyWord)
    # get the time belongs to the keyWord
    return nextUrl[keyWordIndex + length : keyWordIndex + length + MILLISECOND_TIME_LENGTH]

def get_json_data_from_dash_api(api_url, token):
    headers = {'Authorization': 'Bearer ' + token}
    response = requests.get(api_url, headers=headers)
    return response.json()

def get_selected_trips_data(date_start, date_end, token):
    return get_json_data_from_dash_api(TRIP_API + "?startTime=" + date_start + "&endTime=" + date_end + "&paged=false", token)

def get_trips_data(date_start, date_end, token):
    if date_start is None and date_end is None:
        return get_json_data_from_dash_api(TRIP_API, token)
    else:
        return get_json_data_from_dash_api(TRIP_API + "?startTime=" + date_start + "&endTime=" + date_end, token)

if __name__ == '__main__':
    app.run(threaded=True)
