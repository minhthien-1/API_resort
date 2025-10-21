const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Revenue
 *   description: API thống kê doanh thu
 */

/**
 * @swagger
 * /api/revenue/total:
 *   get:
 *     summary: Tổng doanh thu toàn hệ thống
 *     tags: [Revenue]
 */
router.get('/total', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0)::BIGINT AS total_revenue
      FROM bookings WHERE status = 'confirmed';
    `);
        res.json({ total_revenue: Number(result.rows[0].total_revenue) });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tính tổng doanh thu' });
    }
});

/**
 * @swagger
 * /api/revenue/monthly:
 *   get:
 *     summary: Doanh thu theo từng tháng
 *     tags: [Revenue]
 */
router.get('/monthly', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', check_in), 'YYYY-MM') AS month,
        COALESCE(SUM(total_amount), 0) AS total_revenue
      FROM bookings
      WHERE status = 'confirmed'
      GROUP BY 1 ORDER BY 1;
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi truy vấn doanh thu theo tháng' });
    }
});

module.exports = router;
