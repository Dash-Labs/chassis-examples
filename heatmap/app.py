#!flask/bin/python
from flask import Flask, abort, request, jsonify, redirect, url_for, render_template, session, make_response
from flask.ext.session import Session
import requests
import urllib
import json
# csv
import csv
import StringIO

TOKEN = "token"
NEXT_URL = "nextUrl"

app = Flask(__name__, instance_relative_config=True)
app.config.from_object('config')

app.config['SESSION_TYPE'] = 'memcached'
app.config['SECRET_KEY'] = SESSION_SECRET
sess = Session()

@app.errorhandler(400)
def not_found(error):
    return make_response(jsonify({'error': 'Bad request'}), 400)

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.route('/')
@app.route('/index')
def index():
    if TOKEN in session:
        return render_template('navigation.html', title='Home')
    else:
        return render_template('login.html', title='login')

@app.route('/login')
def login():
    params = {"client_id": CLIENT_ID,
              "response_type": "code",
              "state": STATE,
              "redirect_uri": REDIRECT_URI,
              "scope": SCOPE}
    login_url = "https://dash.by/api/auth/authorize?" + urllib.urlencode(params)
    return redirect(login_url, code=302)

@app.route('/api/authorize', methods=['GET'])
def authorize():
    code = request.args.get('code', '')
    state = request.args.get('state', '')
    if state != STATE or code is None:
        return redirect(url_for('index'))
    else:
        token = get_token(code)
        session[TOKEN] = token
        return redirect(url_for('index'))

def get_token(code):
    post_data = {"grant_type": "authorization_code",
                 "code": code,
                 "client_id": CLIENT_ID,
                 "client_secret": CLIENT_SECRET}
    response = requests.post(REDIRECT_URI, data=post_data)
    token_json = response.json()
    return token_json["access_token"]

@app.route('/heatmap')
def heatmap():
    if TOKEN in session:
        return render_template('heatmap.html', title='heatmap')
    else:
        return redirect(url_for('index'))

@app.route('/api/heatmap')
def get_current_month_heatmap():
    if TOKEN in session:
        return get_heatmap_csv(None, None)
    else:
        return redirect(url_for('index'))

@app.route('/api/heatmap/<date_start>/<date_end>', methods=['GET'])
def get_previous_month_heatmap(date_start, date_end):
    if TOKEN in session:
        return get_heatmap_csv(date_start, date_end)
    else:
        return redirect(url_for('index'))

def get_heatmap_csv(date_start, date_end):
    token = session[TOKEN]
    if date_start is None and date_end is None:
        trips = get_json_data_from_dash_api(TRIP_API, token)
    else:
        trips = get_json_data_from_dash_api(TRIP_API + "?startTime=" + date_start + "&endTime=" + date_end, token)
    trips_id = get_user_trip_id(trips)

    if NEXT_URL in trips:
        nextUrl = trips[NEXT_URL]
        next_date_start = nextUrl[47:60]
        next_date_end = nextUrl[-13:]
        # create heatmap csv file
        sio = StringIO.StringIO()
        writer = csv.writer(sio)
        writer.writerow(('lat', 'lon'))
        writer.writerow((next_date_start, next_date_end))
        get_coordinate_info(writer, trips_id, token)
        output = make_response(sio.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=heatmap.csv"
        output.headers["Content-type"] = "text/csv"
        return output

def get_coordinate_info(writer, trips_id, token):
    for trip_id in trips_id:
        routes = get_json_data_from_dash_api(ROUTE_API + trip_id, token)
        # get coordinate
        for route in routes:
            writer.writerow((route['latitude'], route['longitude']))

def get_json_data_from_dash_api(api_url, token):
    headers = {'Authorization': 'Bearer ' + token}
    response = requests.get(api_url, headers=headers)
    return response.json()
    # return json.loads(response.text)

def get_user_trip_id(trips):
    trips_id = []
    for trip in trips['result']:
        trips_id.append(trip['id'])
    return trips_id

if __name__ == '__main__':
    app.run(debug=True)
