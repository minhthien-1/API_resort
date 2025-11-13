const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query(
    'SELECT id, username, password_hash, role, email FROM users WHERE username = $1 OR email = $1',
    [username]  // Dùng parameter duy nhất, nhưng check cả username & email
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: true,
      message: 'Login successful',
      token: token,
      user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name  }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== REGISTER =====
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, password required' });
    }

    const existUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, email, role',
      [username, email, password, full_name || '', phone || '', 'guest', true]
    );

    const newUser = result.rows[0];
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: true,
      message: 'Register successful',
      token: token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role,  }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
