// db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// Bắt lỗi không mong muốn trên pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // ghi log hoặc khởi động lại pool tùy tình huống
});

module.exports = pool;
