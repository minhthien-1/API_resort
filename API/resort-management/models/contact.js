const pool = require('../db');

async function create({ name, email, phone = null, subject = null, message }) {
  const q = `
    INSERT INTO contacts (name, email, phone, subject, message)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const params = [name, email, phone, subject, message];
  const r = await pool.query(q, params);
  return r.rows[0];
}

async function findAll() {
  const r = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
  return r.rows;
}

async function findById(id) {
  const r = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
  return r.rows[0];
}

async function reply(id, replyText) {
  const q = `
    UPDATE contacts
    SET reply = $1, replied_at = NOW(), status = 'replied', updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const r = await pool.query(q, [replyText, id]);
  return r.rows[0];
}

async function updateStatus(id, status) {
  const q = `
    UPDATE contacts
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const r = await pool.query(q, [status, id]);
  return r.rows[0];
}

module.exports = { create, findAll, findById, reply, updateStatus };