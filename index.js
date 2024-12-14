import express, { json } from 'express';
import { Client } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';


// Initialize dotenv
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup - should be before routes
app.use(cors());
app.use(json());

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Database connection error:', err));

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS your_table (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      description TEXT
    );
  `;
  await client.query(query);
};

const insertSampleData = async () => {
  const checkQuery = 'SELECT COUNT(*) FROM your_table;';
  const result = await client.query(checkQuery);
  
  if (result.rows[0].count === '0') {
    const insertQuery = `
      INSERT INTO your_table (name, description) VALUES
      ('Item 1', 'Description of item 1'),
      ('Item 2', 'Description of item 2');
    `;
    await client.query(insertQuery);
  }
};

const initializeDatabase = async () => {
  try {
    await createTable();
    await insertSampleData();
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};

// Routes
app.get('/', (req, res) => {
  res.send('Hello from Node.js app with PostgreSQL!');
});

app.get('/data', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM your_table');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database query failed');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  client.end();
  process.exit(0);
});

// Initialize database and start server
initializeDatabase();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

