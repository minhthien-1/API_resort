const express = require("express");
const pool = require("../db");
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
 *     responses:
 *       200:
 *         description: Tổng doanh thu toàn hệ thống
 */
router.get("/total", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0)::BIGINT AS total_revenue
      FROM bookings
      WHERE status IN ('confirmed', 'completed');
    `);
        res.json({ total_revenue: Number(result.rows[0].total_revenue) });
    } catch (err) {
        console.error("❌ Lỗi khi tính tổng doanh thu:", err);
        res.status(500).json({ error: "Lỗi khi tính tổng doanh thu", details: err.message });
    }
});

/**
 * @swagger
 * /api/revenue/monthly:
 *   get:
 *     summary: Doanh thu theo từng tháng
 *     tags: [Revenue]
 *     responses:
 *       200:
 *         description: Danh sách doanh thu 12 tháng gần nhất
 */
router.get("/monthly", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', check_in), 'YYYY-MM') AS month,
        COALESCE(SUM(total_amount), 0)::BIGINT AS total_revenue
      FROM bookings
      WHERE status IN ('confirmed', 'completed')
      GROUP BY month
      ORDER BY month ASC;
    `);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Lỗi khi lấy doanh thu theo tháng:", err);
        res.status(500).json({ error: "Lỗi khi lấy doanh thu theo tháng", details: err.message });
    }
});

/**
 * @swagger
 * /api/revenue/filter:
 *   get:
 *     summary: Doanh thu theo tháng và năm cụ thể
 *     tags: [Revenue]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tháng cần lọc
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Năm cần lọc
 *     responses:
 *       200:
 *         description: Doanh thu trong tháng-năm được chọn
 */
router.get("/filter", async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year)
            return res.status(400).json({ error: "Thiếu tham số month hoặc year" });

        const result = await pool.query(
            `
      SELECT COALESCE(SUM(total_amount), 0)::BIGINT AS total_revenue
      FROM bookings
      WHERE status IN ('confirmed', 'completed')
        AND EXTRACT(MONTH FROM check_in) = $1
        AND EXTRACT(YEAR FROM check_in) = $2;
      `,
            [parseInt(month), parseInt(year)]
        );

        res.json({
            month: parseInt(month),
            year: parseInt(year),
            total_revenue: Number(result.rows[0].total_revenue)
        });
    } catch (err) {
        console.error("❌ Lỗi khi lọc doanh thu:", err);
        res.status(500).json({ error: "Lỗi khi lọc doanh thu", details: err.message });
    }
});

/**
 * @swagger
 * /api/revenue/by-room-type:
 *   get:
 *     summary: Doanh thu theo loại phòng
 *     tags: [Revenue]
 *     responses:
 *       200:
 *         description: Danh sách doanh thu theo từng loại phòng
 */
router.get("/by-room-type", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        rt.name AS room_type,
        COALESCE(SUM(b.total_amount), 0)::BIGINT AS total_revenue,
        COUNT(b.id) AS total_bookings
      FROM room_types rt
      LEFT JOIN rooms r ON r.room_type_id = rt.id
      LEFT JOIN bookings b ON b.room_id = r.id AND b.status IN ('confirmed', 'completed')
      GROUP BY rt.name
      ORDER BY total_revenue DESC;
    `);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Lỗi khi lấy doanh thu theo loại phòng:", err);
        res.status(500).json({ error: "Lỗi khi lấy doanh thu theo loại phòng", details: err.message });
    }
});

module.exports = router;
