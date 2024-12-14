import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3002;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://my-backend-abgs.onrender.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

// Middleware - IMPORTANT: place these in this specific order
app.use(cors(corsOptions));
app.use(bodyParser.json());

// API routes BEFORE static file serving
// Explicitly handle /users route BEFORE static serving
app.get('/users', (req, res) => {
  console.log('Accessing /users route directly');

  // Add more verbose logging
  console.log('Full request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  const sql = 'SELECT * FROM users';
  pool.query(sql, (err, result) => {
    if (err) {
      console.error('Detailed error retrieving users:', err);
      return res.status(500).json({
        error: 'Error retrieving users',
        details: err.message
      });
    }

    console.log('Users query result:', {
      rowCount: result.rowCount,
      rows: result.rows
    });

    // Ensure array is returned
    res.json(result.rows || []);
  });
});

app.post('/addUser', (req, res) => {
  const { name, email, password } = req.body;
  const sql =
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *';
  pool.query(sql, [name, email, password], (err, result) => {
    if (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ error: 'Error creating user' });
    } else {
      res.json(result.rows[0]); // Return the inserted user
    }
  });
});

// Static file serving AFTER API routes
app.use(express.static(path.join(__dirname, 'build')));

// Fallback route for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

// Check the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('PostgreSQL Connected...');
    const sql = `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL
    )`;
    client.query(sql, (err) => {
      release();
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Table created');
      }
    });
  }
});

// Run server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
