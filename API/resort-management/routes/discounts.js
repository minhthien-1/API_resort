const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Discounts
 *   description: Quản lý voucher giảm giá
 */

/**
 * @swagger
 * /api/discounts:
 *   get:
 *     summary: Lấy danh sách tất cả voucher giảm giá
 *     tags: [Discounts]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, inactive]
 *         description: Lọc theo trạng thái voucher
 *     responses:
 *       200:
 *         description: Danh sách voucher
 */
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let sql = `
      SELECT 
        id, code, name, description, discount_type, value,
        valid_from, valid_until, status, usage_limit, usage_used
      FROM discounts
    `;
        const params = [];

        if (status) {
            sql += ` WHERE status = $1`;
            params.push(status);
        }

        sql += ` ORDER BY created_at DESC`;

        const { rows } = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Lỗi lấy danh sách voucher:", err);
        res.status(500).json({ error: "Lỗi khi lấy danh sách voucher", details: err.message });
    }
});

/**
 * @swagger
 * /api/discounts:
 *   post:
 *     summary: Thêm voucher mới
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - discount_type
 *               - value
 *               - valid_from
 *               - valid_until
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               discount_type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               value:
 *                 type: number
 *               valid_from:
 *                 type: string
 *                 format: date
 *               valid_until:
 *                 type: string
 *                 format: date
 *               usage_limit:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Voucher đã được tạo
 */
router.post('/', async (req, res) => {
    try {
        const { code, name, description, discount_type, value, valid_from, valid_until, usage_limit } = req.body;
        if (!code || !name || !discount_type || !value || !valid_from || !valid_until) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        const result = await pool.query(
            `INSERT INTO discounts (code, name, description, discount_type, value, valid_from, valid_until, usage_limit, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',NOW(),NOW())
       RETURNING *`,
            [code, name, description, discount_type, value, valid_from, valid_until, usage_limit || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("❌ Lỗi thêm voucher:", err);
        res.status(500).json({ error: "Lỗi khi thêm voucher", details: err.message });
    }
});


/**
 * @swagger
 * /api/discounts/{id}:
 *   put:
 *     summary: Cập nhật thông tin voucher
 *     tags: [Discounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của voucher cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               discount_type: { type: string, enum: [percentage, fixed] }
 *               value: { type: number }
 *               valid_from: { type: string, format: date }
 *               valid_until: { type: string, format: date }
 *               status: { type: string, enum: [active, expired, inactive] }
 *               usage_limit: { type: integer }
 *     responses:
 *       200:
 *         description: Voucher đã được cập nhật
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fields = Object.keys(req.body);
        if (fields.length === 0) {
            return res.status(400).json({ error: "Không có dữ liệu để cập nhật" });
        }

        const setClause = fields.map((key, i) => `${key} = $${i + 1}`).join(', ') + ', updated_at = NOW()';
        const values = Object.values(req.body);
        values.push(id);

        const result = await pool.query(
            `UPDATE discounts SET ${setClause} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Không tìm thấy voucher" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ Lỗi cập nhật voucher:", err);
        res.status(500).json({ error: "Lỗi khi cập nhật voucher", details: err.message });
    }
});


/**
 * @swagger
 * /api/discounts/{id}:
 *   delete:
 *     summary: Xóa voucher theo ID
 *     tags: [Discounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của voucher cần xóa
 *     responses:
 *       200:
 *         description: Voucher đã bị xóa
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM discounts WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Không tìm thấy voucher để xóa" });
        }

        res.json({ message: 'Đã xóa voucher', deleted: result.rows[0] });
    } catch (err) {
        console.error("❌ Lỗi xóa voucher:", err);
        res.status(500).json({ error: "Lỗi khi xóa voucher", details: err.message });
    }
});


module.exports = router;
