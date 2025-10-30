const Review = require('../models/Reviews');

exports.getReviewsByRoomId = async (req, res) => {
  const { room_id } = req.params;
  try {
    const reviews = await Review.getReviewsByRoom(room_id);

    for (let review of reviews) {
      review.replies = await Review.getRepliesByReview(review.review_id);
    }

    res.json(reviews);
  } catch (err) {
    console.error('❌ Lỗi khi tải đánh giá:', err);
    res.status(500).json({ error: 'Lỗi khi tải đánh giá' });
  }
};

exports.addReview = async (req, res) => {
  const { room_id, username, rating, comment } = req.body;
  try {
    const newReview = await Review.addReview({ room_id, username, rating, comment });
    res.status(201).json(newReview);
  } catch (err) {
    console.error('❌ Lỗi khi thêm đánh giá:', err);
    res.status(500).json({ error: 'Không thể thêm đánh giá' });
  }
};

exports.replyToReview = async (req, res) => {
  const { review_id } = req.params;
  const { username, reply_content } = req.body;
  try {
    const reply = await Review.addReply({ review_id, username, reply_content });
    res.status(201).json({ message: 'Phản hồi thành công', reply });
  } catch (err) {
    console.error('❌ Lỗi khi phản hồi:', err);
    res.status(500).json({ error: 'Không thể phản hồi' });
  }
};
