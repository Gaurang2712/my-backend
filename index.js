import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt'

dotenv.config();
const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 3002;

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://my-backend-abgs.onrender.com',
    'https://fuckyou-u0e9.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL Connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false // Use only for development, remove in production
  }
});

// Database Connection and Table Creation
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
    return;
  }
  
  console.log('Database connected successfully');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  client.query(createTableQuery, (tableErr) => {
    release();
    if (tableErr) {
      console.error('Error creating users table:', tableErr);
    } else {
      console.log('Users table ensured');
    }
  });
});

// User Registration Route
app.post('/addUser', async (req, res) => {
  const { name, email, password } = req.body;

  // Server-side validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email', 
      [name, email, hashedPassword]
    );

    console.log('User created successfully:', result.rows[0]);
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('User registration error:', error);
    
    // Specific error handling
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }

    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// User Listing Route (Optional)
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;