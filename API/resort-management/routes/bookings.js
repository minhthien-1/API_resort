const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');

// Middleware xác thực JWT
let authorize;
try {
  authorize = require('../middleware/authorize');
} catch (error) {
  authorize = () => (req, res, next) => {
    req.user = { userId: 1, role: 'guest' };
    next();
  };
}

/**
 * @swagger
 * tags:
 *   - name: Bookings
 *     description: API quản lý booking
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Tạo đặt phòng mới
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, checkIn, checkOut, pricePerNight]
 *             properties:
 *               roomId:
 *                 type: string
 *               checkIn:
 *                 type: string
 *                 format: date
 *                 example: "25/12/2025"
 *               checkOut:
 *                 type: string
 *                 format: date
 *                 example: "28/12/2025"
 *               pricePerNight:
 *                 type: number
 *     responses:
 *       201:
 *         description: Đặt phòng thành công
 *       400:
 *         description: Thiếu thông tin
 */
router.post('/', authorize(['guest', 'staff', 'admin']), bookingsController.createBooking);

/**
 * @swagger
 * /api/bookings/total:
 *   get:
 *     summary: Lấy tổng số booking
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Tổng số booking
 */
router.get('/total', bookingsController.getTotalBookings);

/**
 * @swagger
 * /api/bookings/filter:
 *   get:
 *     summary: Lọc tổng số booking theo tháng/năm
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Kết quả lọc booking
 */
router.get('/filter', bookingsController.filterBookings);

/**
 * @swagger
 * /api/bookings/top-booked:
 *   get:
 *     summary: Lấy danh sách phòng được đặt nhiều nhất
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Danh sách phòng top booked
 */
router.get('/top-booked', bookingsController.getTopBookedRooms);

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     summary: Lấy lịch sử đặt phòng của khách
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lịch sử đặt phòng
 */
router.get('/my-bookings', authorize(['guest', 'staff', 'admin']), bookingsController.getMyBookings);

/**
 * @swagger
 * /api/bookings/list:
 *   get:
 *     summary: Lấy tất cả bookings (Admin/Staff)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách bookings
 */
router.get('/list', authorize(['admin', 'staff']), bookingsController.getAllBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Lấy chi tiết booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết booking
 */
router.get('/:id', bookingsController.getBookingById);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   put:
 *     summary: Hủy đặt phòng
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hủy thành công
 */
router.put('/:id/cancel', authorize(['guest', 'staff', 'admin']), bookingsController.cancelBooking);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Cập nhật trạng thái booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id/status', authorize(['admin', 'staff']), bookingsController.updateBookingStatus);

module.exports = router;