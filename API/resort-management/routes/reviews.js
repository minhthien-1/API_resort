const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Quản lý đánh giá phòng
 */

/**
 * @swagger
 * /api/reviews/{room_id}:
 *   get:
 *     summary: Lấy danh sách đánh giá theo room_id
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: room_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của phòng
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 */
router.get('/:room_id', reviewsController.getReviewsByRoomId);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Gửi đánh giá mới
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Review'
 *     responses:
 *       201:
 *         description: Đã thêm đánh giá mới
 */
router.post('/', reviewsController.addReview);

/**
 * @swagger
 * /api/reviews/reply/{review_id}:
 *   post:
 *     summary: Gửi phản hồi cho một đánh giá
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: review_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của đánh giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               reply_content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Phản hồi thành công
 */
router.post('/reply/:review_id', reviewsController.replyToReview);

module.exports = router;
