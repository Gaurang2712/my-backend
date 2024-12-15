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

// Comprehensive CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://my-backend-abgs.onrender.com',
    'https://fuckyou-u0e9.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Database connection handler
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
    process.exit(1); // Exit if database connection fails
  }
  console.log('PostgreSQL Connected...');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    )
  `;

  client.query(createTableQuery, (err) => {
    release();
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Users table ensured');
    }
  });
});

// User Routes
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error retrieving users:', err);
    res.status(500).json({ error: 'Error retrieving users' });
  }
});

app.post('/addUser', async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email', 
      [name, email, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Serve static files last
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Server startup
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});