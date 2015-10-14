#!flask/bin/python
from flask import Flask, abort, request, jsonify, redirect, url_for, render_template, session, make_response
from flask.ext.session import Session
from uuid import uuid4
import requests
import urllib
import json
import csv
import StringIO

app = Flask(__name__)
app.config.from_object('config')

TRIP_API = app.config["TRIP_API"]
ROUTE_API = app.config["ROUTE_API"]
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
FUEL_EFFICIENCY = 'fuelEfficiency'

sess = Session()

@app.errorhandler(400)
def not_found(error):
    return make_response(jsonify({'error': 'Bad request'}), 400)

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html', title='404')

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
    response = requests.post(REDIRECT_URI, data=post_data)
    token_json = response.json()
    return token_json["access_token"]

@app.route('/heatmap/heatmap')
def heatmap():
    if TOKEN in session:
        return render_template('heatmap.html', title='heatmap')
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/speed-fuel')
def speed_fuel():
    if TOKEN in session:
        return render_template('speed-fuel.html', title='speed fuel info')
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/heatmap')
def get_current_month_heatmap():
    if TOKEN in session:
        return get_heatmap_csv(None, None)
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/heatmap/<date_start>/<date_end>', methods=['GET'])
def get_previous_month_heatmap(date_start, date_end):
    if TOKEN in session:
        return get_heatmap_csv(date_start, date_end)
    else:
        return redirect(url_for('index'))

def get_heatmap_csv(date_start, date_end):
    token = session[TOKEN]
    trips = get_trips_data(date_start, date_end, token)

    if NEXT_URL in trips:
        nextUrl = trips[NEXT_URL]
        next_date_start = nextUrl[47:60]
        next_date_end = nextUrl[-13:]
        # create heatmap csv file
        sio = StringIO.StringIO()
        writer = csv.writer(sio)
        # set column header
        writer.writerow(('lat', 'lon'))
        # store the next URL at the first row (Handle it at front end)
        writer.writerow((next_date_start, next_date_end))
        # write longitude and latitude data into csv
        write_coordinate_data_into_csv(writer, trips, token)
        output = make_response(sio.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=heatmap.csv"
        output.headers["Content-type"] = "text/csv"
        return output

def write_coordinate_data_into_csv(writer, trips, token):
    for trip in trips['result']:
        routes = get_json_data_from_dash_api(ROUTE_API + trip['id'], token)
        for route in routes:
            writer.writerow((route[LATITUDE], route[LONGITUDE]))

@app.route('/heatmap/api/speed-fuel')
def get_current_month_speed_fuel_info():
    if TOKEN in session:
        return get_speed_fuel_csv(None, None)
    else:
        return redirect(url_for('index'))

@app.route('/heatmap/api/speed-fuel/<date_start>/<date_end>', methods=['GET'])
def get_previous_month_speed_fuel_info(date_start, date_end):
    if TOKEN in session:
        return get_speed_fuel_csv(date_start, date_end)
    else:
        return redirect(url_for('index'))

def get_speed_fuel_csv(date_start, date_end):
    token = session[TOKEN]
    trips = get_trips_data(date_start, date_end, token)

    if NEXT_URL in trips:
        nextUrl = trips[NEXT_URL]
        next_date_start = nextUrl[47:60]
        next_date_end = nextUrl[-13:]
        # create speed-fuel csv file
        sio = StringIO.StringIO()
        writer = csv.writer(sio)
        # set column header
        writer.writerow((DATE, SPEED, FUEL_EFFICIENCY))
        # store the next URL at the first row (Handle it at front end)
        writer.writerow((0, next_date_start, next_date_end))
        # write date, speed and fuel efficiency data into csv
        write_speed_fuel_data_into_csv(writer, trips, token)
        output = make_response(sio.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=speed_fuel.csv"
        output.headers["Content-type"] = "text/csv"
        return output

def write_speed_fuel_data_into_csv(writer, trips, token):
    for trip in trips['result']:
        routes = get_json_data_from_dash_api(ROUTE_API + trip['id'], token)
        for route in routes:
            writer.writerow((route[DATE], route[SPEED], route[FUEL_EFFICIENCY]))

def get_json_data_from_dash_api(api_url, token):
    headers = {'Authorization': 'Bearer ' + token}
    response = requests.get(api_url, headers=headers)
    return response.json()

def get_trips_data(date_start, date_end, token):
    if date_start is None and date_end is None:
        return get_json_data_from_dash_api(TRIP_API, token)
    else:
        return get_json_data_from_dash_api(TRIP_API + "?startTime=" + date_start + "&endTime=" + date_end, token)

if __name__ == '__main__':
    app.run(debug=True)
