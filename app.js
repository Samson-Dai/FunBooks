var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require("express-session");

var indexRouter = require('./routes/myroutes');

var app = express();

// Database
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/assignment2');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(session({secret:'samson111'}));
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to routers
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
