// ...existing code...
const pool = require('../db');

async function findAll(user_id = null) {
  if (user_id) {
    const r = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    return r.rows;
  }
  const r = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
  return r.rows;
}

async function findById(id) {
  const r = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return r.rows[0];
}

async function create({ title, content, user_id = null, type = null, is_read = false }) {
  const q = `
    INSERT INTO notifications (title, content, user_id, type, is_read)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const params = [title, content, user_id, type, is_read];
  const r = await pool.query(q, params);
  return r.rows[0];
}

async function markRead(id) {
  const r = await pool.query(
    `UPDATE notifications
     SET is_read = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return r.rows[0];
}

async function markUnread(id) {
  const r = await pool.query(
    `UPDATE notifications
     SET is_read = false, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return r.rows[0];
}

async function markAllRead(user_id) {
  const r = await pool.query(
    `UPDATE notifications
     SET is_read = true, updated_at = NOW()
     WHERE user_id = $1 AND is_read = false
     RETURNING *`,
    [user_id]
  );
  return r.rows;
}

async function countUnread(user_id) {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = false',
    [user_id]
  );
  return r.rows[0] ? r.rows[0].unread : 0;
}

module.exports = {
  findAll,
  findById,
  create,
  markRead,
  markUnread,
  markAllRead,
  countUnread,
};
// ...existing code...