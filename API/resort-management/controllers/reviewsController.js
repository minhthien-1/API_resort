// controllers/reviewsController.js
const pool = require('../db');

// 🟢 Lấy tất cả review theo room_id
exports.getReviewsByRoomId = async (req, res) => {
  const { room_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, username, rating, comment, created_at FROM reviews WHERE room_id = $1 ORDER BY created_at DESC',
      [room_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách review:', err);
    res.status(500).json({ error: 'Lỗi khi tải đánh giá' });
  }
};

// 🟡 Tạo review mới
exports.createReview = async (req, res) => {
  const { username, rating, comment, room_id } = req.body;
  if (!room_id || !rating || !comment) {
    return res.status(400).json({ error: 'Thiếu dữ liệu bắt buộc' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (room_id, username, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [room_id, username || 'Khách ẩn danh', rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Lỗi khi thêm review:', err);
    res.status(500).json({ error: 'Lỗi khi gửi đánh giá' });
  }
};
