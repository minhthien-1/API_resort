const pool = require('../db');

// 🧩 Lấy tất cả review theo room_id
async function getReviewsByRoom(room_id) {
  const query = `
    SELECT review_id, room_id, username, rating, comment, created_at
    FROM reviews
    WHERE room_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(query, [room_id]);
  return rows;
}

// 💬 Lấy phản hồi của review
async function getRepliesByReview(review_id) {
  const query = `
    SELECT reply_id, review_id, username, reply_content, created_at
    FROM review_replies
    WHERE review_id = $1
    ORDER BY created_at ASC
  `;
  const { rows } = await pool.query(query, [review_id]);
  return rows;
}

// ➕ Thêm review mới
async function addReview({ room_id, username, rating, comment }) {
  const query = `
    INSERT INTO reviews (room_id, username, rating, comment)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [room_id, username, rating, comment]);
  return rows[0];
}

// 💬 Thêm phản hồi cho review
async function addReply({ review_id, username, reply_content }) {
  const query = `
    INSERT INTO review_replies (review_id, username, reply_content)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [review_id, username, reply_content]);
  return rows[0];
}

// 🗑️ Xóa review
async function deleteReview(review_id) {
  const query = `DELETE FROM reviews WHERE review_id = $1 RETURNING *`;
  const { rows } = await pool.query(query, [review_id]);
  return rows[0];
}

// 🗑️ Xóa phản hồi
async function deleteReply(reply_id) {
  const query = `DELETE FROM review_replies WHERE reply_id = $1 RETURNING *`;
  const { rows } = await pool.query(query, [reply_id]);
  return rows[0];
}

module.exports = {
  getReviewsByRoom,
  getRepliesByReview,
  addReview,
  addReply,
  deleteReview,
  deleteReply,
};
