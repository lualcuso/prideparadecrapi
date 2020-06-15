var LocalStrategy   = require('passport-local').Strategy;

var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var dbconfig = require('./database');
var connection = mysql.createConnection(dbconfig.connection);
connection.connect();
connection.query('USE ' + dbconfig.database);

module.exports = function(passport) {
    
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    
    passport.deserializeUser(function(id, done) {
        connection.query("SELECT * FROM users WHERE id = ? ",[id], function(err, rows){
            done(err, rows[0]);
        });
    });
    
    passport.use(
        'local-signup',
        new LocalStrategy({
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true 
        },
        function(req, username, password, done) {
            connection.query("SELECT * FROM users WHERE username = ?",[username], function(err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, false, {});
                } else {
                    var newUserMysql = {
                        username: username,
                        password: bcrypt.hashSync(password),
                        first_name: req.body.firstname,
                        last_name: req.body.lastname,
                        avatar_url: req.body.avatarurl,
                        message: req.body.message,
                        email: req.body.email,
                        created_at: new Date()
                    };

                    var insertQuery = "INSERT INTO users ( username, password, first_name, last_name, email, avatar_url, message, created_at ) values (?,?,?,?,?,?,?,?)";
                    connection.query(insertQuery,[newUserMysql.username, newUserMysql.password, 
                        newUserMysql.first_name, newUserMysql.last_name, newUserMysql.email,
                        newUserMysql.avatar_url,  newUserMysql.message, newUserMysql.created_at], function(err, rows) {
                        newUserMysql.id = rows.insertId;

                        return done(null, newUserMysql);
                    });
                }
            });
        })
    );

    passport.use(
        'local-login',
        new LocalStrategy({
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true 
        },
        function(req, username, password, done) { 
            connection.query("SELECT * FROM users WHERE username = ?",[username], function(err, rows){
                if (err)
                    return done(err);
                if (!rows.length) {
                    return done(null, false, { message: 'Invalid user or password'}); 
                }

                if (!bcrypt.compareSync(password, rows[0].password))
                    return done(null, false, { message: 'Invalid user or password'}); 

                return done(null, rows[0]);
            });
        })
    );
};
