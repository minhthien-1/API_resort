const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Middleware xác thực JWT
let authorize;
try {
  authorize = require('../middleware/authorize');
} catch (error) {
  // Nếu không có middleware authorize, tạo một mock function
  authorize = () => (req, res, next) => {
    // Mock user để test không cần JWT
    req.user = { userId: 1, role: 'guest' };
    next();
  };
}

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: API quản lý thanh toán
 */

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Tạo thanh toán mới
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, paymentMethod, amount]
 *             properties:
 *               bookingId: { type: string }
 *               paymentMethod: { type: string, enum: [cash, card, bank_transfer, e_wallet] }
 *               amount: { type: number }
 *               discountCode: { type: string }
 *     responses:
 *       201:
 *         description: Thanh toán thành công
 *       400:
 *         description: Thiếu thông tin hoặc lỗi validation
 *       404:
 *         description: Không tìm thấy booking
 */
router.post('/', authorize(['guest', 'staff', 'admin']), paymentController.createPayment);

/**
 * @swagger
 * /api/payments/my-payments:
 *   get:
 *     summary: Lấy lịch sử thanh toán của khách
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lịch sử thanh toán
 */
router.get('/my-payments', authorize(['guest', 'staff', 'admin']), paymentController.getMyPayments);

/**
 * @swagger
 * /api/payments/list:
 *   get:
 *     summary: Lấy tất cả thanh toán (Admin/Staff)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Danh sách thanh toán
 */
router.get('/list', authorize(['admin', 'staff']), paymentController.getAllPayments);

/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Thống kê thanh toán
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thống kê thanh toán
 */
router.get('/stats', authorize(['admin', 'staff']), paymentController.getPaymentStats);

/**
 * @swagger
 * /api/payments/by-method:
 *   get:
 *     summary: Thanh toán theo phương thức
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Danh sách thanh toán theo phương thức
 */
router.get('/by-method', authorize(['admin', 'staff']), paymentController.getPaymentsByMethod);

/**
 * @swagger
 * /api/payments/:id/invoice:
 *   get:
 *     summary: Xuất phiếu thanh toán theo ID
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Phiếu thanh toán
 *       404:
 *         description: Không tìm thấy phiếu thanh toán
 */
router.get('/:id/invoice', paymentController.getPaymentInvoice);

/**
 * @swagger
 * /api/payments/:id:
 *   get:
 *     summary: Lấy chi tiết thanh toán
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Chi tiết thanh toán
 *       404:
 *         description: Không tìm thấy thanh toán
 */
router.get('/:id', paymentController.getPaymentById);

/**
 * @swagger
 * /api/payments/:id/refund:
 *   post:
 *     summary: Hoàn tiền thanh toán (Admin/Staff)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refundAmount]
 *             properties:
 *               refundAmount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Hoàn tiền thành công
 *       400:
 *         description: Lỗi validation hoặc không thể hoàn tiền
 *       404:
 *         description: Không tìm thấy thanh toán
 */
router.post('/:id/refund', authorize(['admin', 'staff']), paymentController.refundPayment);

module.exports = router;

//Thêm thông báo
router.post("/pay", async (req, res) => {
  return res.status(200).json({
    message: "Thanh toán thành công!"
  });
});
// Client-side function to call the payment API
async function pay(info) {
  const res = await fetch("/payment/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(info),
  });

  const data = await res.json();

  if (res.ok) {
    Swal.fire({ icon: "success", text: data.message });
  } else {
    Swal.fire({ icon: "error", text: data.message });
  }
}


