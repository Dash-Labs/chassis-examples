var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('./utils/logger');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var auth = require('./routes/auth');
var trips = require('./routes/trips');
var nconf = require('nconf');

nconf.env().argv();
nconf.file('./app-config.json');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
var sessionOpts = {};
sessionOpts.name = nconf.get('COOKIE_NAME');
sessionOpts.secret = nconf.get('SESSION_SECRET');
sessionOpts.resave = "true";
sessionOpts.saveUninitialized = "true";
logger.debug("Overriding 'Express' logger");
app.use(require('morgan')("combined",{ "stream": logger.stream }));
app.use(session(sessionOpts));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.get('/login', auth.login);
app.get('/authorize', auth.authorize);
app.get('/trips', trips.trips);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
