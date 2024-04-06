const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'nodelogin'
});
app.use(
	session({
	  secret: 'secret', // Change this to a secure secret key
	  resave: false,
	  saveUninitialized: true,
	})
  );
app.set("view engine", "ejs")
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.text());

app.get('/', function(request, response) {
	// Render login template
	response.sendFile(path.join(__dirname + '/login.html'));
});
app.get('/signup', function(request, response) {
	// Render login template
	response.sendFile(path.join(__dirname + '/signup.html'));
});

app.get('/logout',(req,res)=>{
	req.session.destroy()
	console.log(`Session destroyed`)
	return res.redirect('/')
})

app.post('/create_user',(req,res)=>{
	let username = req.body.username;
	let password = req.body.password;

		connection.connect();
		console.log(`Username is ${username} and Password is ${password}`);
		if (username && password) {
			// Execute SQL query that'll select the account from the database based on the specified username and password
			connection.query('INSERT INTO accounts (username, password) VALUES (?,?)', [username, password], function(error, results, fields) {
				// If there is an issue with the query, output the error
				if (error) throw error;
				if(connection){
					console.log("Registration successful")
				}
				// If the account exists
				res.redirect('/');
			});
		} else {
			res.send('Please enter Username and Password!');
			res.end();
		}
	});

app.post('/auth', function(request, response) {
	// Capture the input fields
	let username = request.body.username;
	console.log(username)
	let password = request.body.password;
	// Ensure the input fields exists and are not empty
	if (username && password) {
		// Execute SQL query that'll select the account from the database based on the specified username and password
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			// If there is an issue with the query, output the error
			if (error) throw error;
			if(connection){
				console.log("Connected to db")
			}
			// If the account exists
			if (results.length > 0) {
				// Authenticate the user
				request.session.loggedin = true;
				request.session.username = username;
				// Redirect to home page
				response.redirect('/interests');
			} else {
				response.send('Incorrect Username and/or Password!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.get('/interests', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin) {
		// Output username
		response.render('interest');
	} else {
		// Not logged in
		response.send('Please login to view this page!');
	}
	response.end();
});

// API endpoint to store selected categories
app.post('/api/categories', (req, res) => {
  const selectedCategories = req.body.categories;
  const id = req.session.id;
  const username = req.session.username;
	// Check if the username is not available in the session
	if (!username) {
	  return res.status(401).json({ error: 'User not authenticated' });
	}
	else{
		console.log(username)
	}
  // Insert selected categories into the MySQL table

  const query = 'UPDATE accounts SET categories = ? WHERE username = ?';
  const values = selectedCategories.map((category) => [category]);
  console.log(values)

  connection.query(query, [values,username], (err) => {
    if (err) {
      console.error('Error saving categories to MySQL:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.status(200).json({ message: 'Categories saved successfully' });
    
    }
  });
});


app.get('/home',(req, res) =>{
	// If the user is loggedin
	if (req.session.loggedin) {
		// Output username
		res.render('user');

	} else {
		// Not logged in
		res.send('Please login to view this page!');
	}
	res.end();
});


app.get('/get-news', async (req, res) => {
	// Retrieve the user's username from the session
	const username = req.session.username;
	// Check if the username is not available in the session
	if (!username) {
	  return res.status(401).json({ error: 'User not authenticated' });
	}
  
	// Retrieve the user's selected category from the database
	const getCategoryQuery = 'SELECT categories FROM accounts WHERE username = ?';
  
	connection.query(getCategoryQuery, [username], async (error, results) => {
	  if (error) {
		console.error('Error fetching user category:', error);
		return res.status(500).json({ error: 'Internal server error' });
	  }
  
	  // Check if the user exists in the database
	  if (results.length === 0) {
		return res.status(404).json({ error: 'User not found' });
	  }
  
	  // Extract the user's category from the query results
	  const userCategory = results[0].categories;
	  res.json({ variableValue: userCategory });
	  // Fetch news articles based on the user's category from a news API
	  console.log(userCategory);
	});
  });
app.get('/get-username', (req, res) => {
    const username = req.session.username;
	
    if (username) {
		res.send(username)
    } else {
        res.status(404).json({ error: 'User not authenticated' });
    }
});


app.post('/insert-interaction', (req, res) => {
	const { user_id, article_id, action_type } = req.body;
	console.log(user_id);
	// Prepare the SQL INSERT statement
	const insertQuery = 'INSERT INTO user_interactions (user_id, article_id, action_type) VALUES (?, ?, ?)';
	const values = [user_id, article_id, action_type];
	console.log('Request Body:', req.body);
	// Execute the SQL query to insert the interaction
	connection.query(insertQuery, values, (err, result) => {
	  if (err) {
		console.error('Error inserting interaction:', err);
		res.status(500).json({ error: 'Error inserting interaction' });
	  } else {
		console.log('Interaction inserted successfully');
		res.status(200).json({ message: 'Interaction inserted successfully' });
	  }
	});
  });
app.listen(3000);