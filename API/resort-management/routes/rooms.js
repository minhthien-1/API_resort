const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomController');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Quản lý phòng
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Lấy danh sách phòng
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: resort_id
 *         schema:
 *           type: integer
 *         description: Lọc theo resort ID
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Lọc theo vị trí
 *       - in: query
 *         name: room_type
 *         schema:
 *           type: string
 *         description: Lọc theo loại phòng
 *     responses:
 *       200:
 *         description: Danh sách phòng
 */
router.get('/', roomsController.getAllRooms);

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Lấy chi tiết phòng
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của phòng
 *     responses:
 *       200:
 *         description: Chi tiết phòng
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', roomsController.getRoomById);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Tạo phòng mới
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resort_id:
 *                 type: integer
 *                 description: ID của resort
 *               room_type_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của loại phòng
 *               location:
 *                 type: string
 *                 description: Vị trí
 *               address:
 *                 type: string
 *                 description: Địa chỉ cụ thể
 *               status:
 *                 type: string
 *                 enum: [available, maintenance]
 *                 description: Trạng thái
 *               description:
 *                 type: string
 *                 description: Mô tả phòng
 *               num_bed:
 *                 type: string
 *                 description: Cấu hình giường
 *               price_per_night:
 *                 type: number
 *                 description: Giá tiền/đêm
 *             required:
 *               - resort_id
 *               - room_type_id
 *               - location
 *     responses:
 *       201:
 *         description: Đã tạo phòng
 */
router.post('/', roomsController.createRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Cập nhật phòng
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của phòng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resort_id:
 *                 type: integer
 *               room_type_id:
 *                 type: string
 *                 format: uuid
 *               location:
 *                 type: string
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [available, maintenance]
 *               description:
 *                 type: string
 *               num_bed:
 *                 type: string
 *               price_per_night:
 *                 type: number
 *     responses:
 *       200:
 *         description: Đã cập nhật phòng
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', roomsController.updateRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Xóa phòng
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của phòng
 *     responses:
 *       200:
 *         description: Đã xóa phòng
 *       404:
 *         description: Không tìm thấy
 */
router.delete('/:id', roomsController.deleteRoom);

module.exports = router;