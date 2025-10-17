// routes/resorts.js
const express = require('express');
const router = express.Router();
const resortsController = require('../controllers/resortController');

/**
 * @swagger
 * tags:
 *   name: Resorts
 *   description: Quản lý resort
 */

/**
 * @swagger
 * /api/resorts:
 *   get:
 *     summary: Lấy danh sách resort
 *     tags: [Resorts]
 *     responses:
 *       200:
 *         description: Danh sách resort
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resort'
 */
router.get('/', resortsController.getAllResorts);

/**
 * @swagger
 * /api/resorts/{id}:
 *   get:
 *     summary: Lấy chi tiết resort
 *     tags: [Resorts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của resort
 *     responses:
 *       200:
 *         description: Chi tiết resort
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resort'
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', resortsController.getResortById);

/**
 * @swagger
 * /api/resorts:
 *   post:
 *     summary: Tạo resort mới
 *     tags: [Resorts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Resort'
 *     responses:
 *       201:
 *         description: Đã tạo resort
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resort'
 */
router.post('/', resortsController.createResort);

/**
 * @swagger
 * /api/resorts/{id}:
 *   put:
 *     summary: Cập nhật resort
 *     tags: [Resorts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của resort
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Resort'
 *     responses:
 *       200:
 *         description: Đã cập nhật resort
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resort'
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', resortsController.updateResort);

/**
 * @swagger
 * /api/resorts/{id}:
 *   delete:
 *     summary: Xóa resort
 *     tags: [Resorts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID của resort
 *     responses:
 *       200:
 *         description: Đã xóa resort
 */
router.delete('/:id', resortsController.deleteResort);

module.exports = router;
