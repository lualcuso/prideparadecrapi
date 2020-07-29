var mysql = require('mysql');
var dbconfig = require('../config/database');
var bcrypt = require('bcryptjs');
var uuidv4 = require('uuid').v4;
var sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var connection = mysql.createConnection(dbconfig.connection);

connection.connect();
connection.query('USE ' + dbconfig.database);

module.exports = function(app, passport) {
	app.post('/signup', passport.authenticate('local-signup'), function(req, res) {
		const msg = {
			to: res.req.user.email,
			from: 'info@pridevirtualcr.com',
			subject: 'Bienvenido al Pride Parade Virtual 2020',
			html: `<div><p>¡Hola! Gracias por ser parte del Pride Virtual CR 2020, una iniciativa que llena Costa Rica y toda la web de colores, aún desde casa.</p></div>
						<p>Si <strong style="text-decoration: underline;">NO</strong> fuiste vos quien se inscribió, por favor hacer click <a href="https://forms.gle/iZwcwv6jD8LxVLV99/">aquí</a>.</p>`,
		};
		sgMail.send(msg);
		res.status(200).send({ username: res.req.user.username });
	});

	app.post('/login', passport.authenticate('local-login'),
        function(req, res) {
            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
			}
		const user = res.req.user;
		if (user) {
			res.status(200).send(user);
		} else {
			res.status(200).send({})
		}
		
	});
	
	app.post("/forgot", function (req, res) {
		var email = req.body.email;
		connection.query("SELECT username FROM users WHERE email = ? ",[email], function(err, rows){
			var currentTime = new Date();
			expirationDate = expirationDate.setHours(expirationDate.getHours() + 12);
			var username = rows[0].username;
			var recoveryCode = uuidv4();
			var insertQuery = "INSERT INTO recoveries ( username, email, code, used, created_at ) values (?,?,?,?,?,?)";
			connection.query(insertQuery, [username, email, recoveryCode, false, currentTime], function(err, rows) {
				res.status(200).send({message: 'Done'});
        	});
		});
	});

	app.post("/recover", function (req, res) {
		var email = req.body.email;
		var code = req.body.code;
		var password = bcrypt.hashSync(req.body.password);
		connection.query("SELECT * FROM recoveries WHERE email = ? ",[email], function(err, rows){
			if (rows.length) {
				var recoverRequest = rows[0];
				if (recoverRequest.code === code) {
					var updateQuery = "UPDATE users SET password = ? WHERE email = ?";
					connection.query(updateQuery, [password, email], function(err, rows) {
						res.status(200).send({message: 'Password changed'});
					});
				} else {
					res.status(200).send({message: 'Incorrect code'});
				}
			} else {
				res.status(200).send({message: 'Not exists'});
			}
			
		});
	});

	app.get('/users', function(req, res) {
		const finalResponse = {users: [], count: 0};
		connection.query("SELECT COUNT(*) AS usersCount FROM users WHERE disabled = ? ", [false], function(err, rows) {
			if (req.user) {
				const filteredUser = rows.filter((user) => {
					return user.username === req.user;
				});

				if (filteredUser.length === 0) {
					rows.push(req.user)
				}
			}
			finalResponse.count = rows[0].usersCount;
		});

		connection.query("SELECT id, username, first_name, last_name, message, avatar_url FROM users WHERE disabled = ? ORDER BY RAND() LIMIT 10", [false], function(err, rows) {
			if (err)
				res.status(200).send({users: [], count: 0, message: 'Error'});
			if (rows.length) {
				finalResponse.users = rows;
				res.status(200).send(finalResponse);
			} else {
				finalResponse.users = [];
				res.status(200).send(finalResponse);
			}
		});
	});

	app.get('/users/validateemail', function(req, res) {
		var email = req.query.email;
		connection.query("SELECT * FROM users WHERE email = ? ", [email] , function(err, rows){
			if (rows.length) {
				res.status(200).send({ error: 'El email ya ha sido registrado' });
			} else {
				res.status(200).send({ message: 'El email es valido' });
			}
		});
	});

	app.get('/users/validateusername', function(req, res) {
		var usermane = req.body.usermane;
		connection.query("SELECT * FROM users WHERE username = ? ", [usermane] , function(err, rows){
			if (rows.length) {
				res.status(200).send({ error: 'El usuario ya ha sido registrado' });
			} else {
				res.status(200).send({ error: 'El uaurio es valido' });
			}
		});
	});

	app.get("/user/logged", function(req, res){
		if (req.user) {
			var user = req.user;
			delete user.password;
			res.status(200).send(user);
		} else {
			res.status(200).send({});
		}
	});

	app.get('/user/:username', isLoggedIn, function(req, res) {
		const username = req.params.username
		connection.query("SELECT id, username, first_name, last_name, message, avatar_url FROM users WHERE username = ? AND disabled = ? ",[username,false], function(err, rows){
			res.status(200).send(rows[0]);
        });
	});

	app.get('/users/messages', function (req, res) {
		connection.query("SELECT id, username, message FROM users WHERE disabled = ? ORDER BY id DESC LIMIT 20 ", [false], function(err, rows){
			res.status(200).send(rows);
        });
	});

	app.get('/logout', function(req, res) {
		req.logout();
		res.status(200).send({})
	});

	app.post("/report", function (req, res) {
		var username = req.body.username;
		connection.query("SELECT * FROM reports WHERE username = ?", [username], function(err, rows) {
			if (!rows.length) {
				var insertQuery = "INSERT INTO reports ( username, created_at ) values (?,?)";
				connection.query(insertQuery, [username, new Date()], function(err, rows) {
					res.status(200).send({message: 'Denuncia realizada'});
				});
			} else {
				res.status(200).send({message: 'Denuncia realizada'});
			}
		});
		
	});

	app.get("/reports", function (req, res) {
		connection.query("SELECT t2.id, t1.username, t1.message FROM users t1 INNER JOIN reports t2 ON t1.username = t2.username", function(err, rows) {
			res.status(200).send({reports: rows});
		});
    });
    
    app.post("/report/action", function(req, res) {
		var id = req.body.id
		var action = req.body.action;

		// Queries
		var updateQuery = "UPDATE users SET disabled = ? WHERE username = ?";
		var deleteQuery = "DELETE FROM reports WHERE id = ?";
		connection.query("SELECT * FROM reports WHERE id = ?", [id], function(err, rows) {
			if (rows.length) {
				if (action === 'accept') {
					const username = rows[0].username;
					connection.query(updateQuery, [true, username], function(err, result) {
						console.log(result.affectedRows)
						if (result.affectedRows) {
							connection.query(deleteQuery, [id], function(err, rows) {
								res.status(200).send({message: 'Usuario y denuncia eliminada'});
							});
						}
					});
				} 
				if (action === "reject") {
					connection.query(deleteQuery, [id], function(err, rows) {
						res.status(200).send({message: 'Denuncia eliminada'});
					});
				}
				
			}
		});
	});
	
	app.post('/emails', function(req, res) {
		var passcode = req.body.passcode;
		
		if (passcode === "send") {
			connection.query("SELECT email FROM users WHERE disabled = ? ", [false], function(err, rows) {
				if (rows.length) {
					rows.forEach(function(user) {
						// var msg = {
						// 	to: user.email,
						// 	from: 'info@pridevirtualcr.com',
						// 	subject: 'Bienvenido al Pride Parade Virtual 2020',
						// 	html: `<div><p>¡Hola! Gracias por ser parte del Pride Virtual CR 2020, una iniciativa que llena Costa Rica y toda la web de colores, aún desde casa.</p></div>
						// 				<p>Si <strong style="text-decoration: underline;">NO</strong> fuiste vos quien se inscribió, por favor hacer click <a href="https://forms.gle/iZwcwv6jD8LxVLV99/">aquí</a>.</p>`,
						// };
						// sgMail.send(msg);
					});
				}
				res.status(200).send({message: 'Mensajes enviados'});
			});
		}
	});
};

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();
		
	res.status(200).send({user: {}, message: 'User is not logged'});
}
