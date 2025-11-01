const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST create contact message (khách gửi)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const result = await pool.query(
      `INSERT INTO contacts (name,email,phone,subject,message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email, phone || null, subject || null, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all contacts (admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT reply to contact
router.put('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const result = await pool.query(
      `UPDATE contacts SET reply = $1, replied_at = NOW(), status = 'replied', updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reply, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE contacts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;