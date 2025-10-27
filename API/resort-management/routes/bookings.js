const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: API thống kê booking
 */

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
router.get('/total', async (req, res) => {
    try {
        const r = await pool.query('SELECT COUNT(*) AS total FROM bookings');
        res.json({ total: Number(r.rows[0].total) });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server khi lấy tổng booking' });
    }
});

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
router.get('/filter', async (req, res) => {
    try {
        const { month, year } = req.query;
        let sql = `SELECT COUNT(*) AS total FROM bookings WHERE 1=1`;
        const params = [];
        if (month && year) {
            sql += ` AND EXTRACT(MONTH FROM check_in) = $1 AND EXTRACT(YEAR FROM check_in) = $2`;
            params.push(parseInt(month), parseInt(year));
        }
        const result = await pool.query(sql, params);
        res.json({ total: Number(result.rows[0].total) });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;