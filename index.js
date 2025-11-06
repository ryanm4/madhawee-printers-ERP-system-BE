const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connection = require('./sql-connection');

dotenv.config({ path: './config.env' });
const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(cors())

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
    }
    console.log('Connected to the MySQL database.');
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


app.use((req, res, next) => { 
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
})

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.status(err.statusCode).json({
        status: err.status,
        message: err.message
    }); 
})
 
