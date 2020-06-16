var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app = express();
var cors = require('cors');
var port = process.env.PORT || 3000;

var passport = require('passport');
var flash = require('connect-flash');

require('./config/passport')(passport); 

app.use(cors());

app.use(morgan('dev')); 
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

app.use(session({
	secret: 'parade',
	resave: true,
	saveUninitialized: true
})); 
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// require('./app/auth.js')(app, passport); 
// require('./app/user.js')(app, passport); 
// require('./app/report.js')(app, passport); 

require('./app/routes.js')(app, passport); 

app.listen(port);
console.log('The magic happens on port ' + port);