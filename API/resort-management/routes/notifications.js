const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all (optionally filter by user_id query)
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    const q = user_id
      ? 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM notifications ORDER BY created_at DESC';
    const params = user_id ? [user_id] : [];
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { title, content, user_id, type } = req.body;
    const result = await pool.query(
      `INSERT INTO notifications (title, content, user_id, type)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, content, user_id || null, type || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT mark as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;