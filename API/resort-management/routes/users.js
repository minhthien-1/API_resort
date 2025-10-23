// routes/users.js

const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy tất cả users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Danh sách users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Lỗi server
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, username, email, password_hash, full_name, phone, role, is_active, permissions, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json({
      status: true,
      code: 200,
      message: 'Users retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: false,
      code: 500,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Lấy user theo ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Thông tin user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User không tìm thấy
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT id, username, email, password_hash, full_name, phone, role, is_active, permissions, created_at, updated_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        code: 404,
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: true,
      code: 200,
      message: 'User retrieved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      status: false,
      code: 500,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo user mới
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - full_name
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, staff, guest]
 *     responses:
 *       201:
 *         description: User tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post('/', async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'Missing required fields: username, email, password, full_name'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'Invalid email format'
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already exists
    const existingEmailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingEmailCheck.rows.length > 0) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'Email already exists'
      });
    }

    // Check if username already exists
    const existingUsernameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUsernameCheck.rows.length > 0) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, permissions)
      VALUES ($1, $2, $3, $4, $5, $6, true, '{}')
      RETURNING id, username, email, password_hash, full_name, phone, role, is_active, permissions, created_at
    `;

    const result = await pool.query(query, [
      username,
      email,
      hashedPassword,
      full_name,
      phone || null,
      role || 'guest'
    ]);

    res.status(201).json({
      status: true,
      code: 201,
      message: 'User created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      status: false,
      code: 500,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật thông tin user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, staff, guest]
 *               is_active:
 *                 type: boolean
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: User cập nhật thành công
 *       404:
 *         description: User không tìm thấy
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, phone, role, is_active, permissions } = req.body;

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: false,
          code: 400,
          message: 'Invalid email format'
        });
      }

      // Check if email already exists (for other users)
      const existingEmailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (existingEmailCheck.rows.length > 0) {
        return res.status(400).json({
          status: false,
          code: 400,
          message: 'Email already exists'
        });
      }
    }

    // Check if username already exists (for other users)
    if (username) {
      const existingUsernameCheck = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      );
      if (existingUsernameCheck.rows.length > 0) {
        return res.status(400).json({
          status: false,
          code: 400,
          message: 'Username already exists'
        });
      }
    }

    // Build the query based on provided fields
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updateFields.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    if (permissions !== undefined) {
      updateFields.push(`permissions = $${paramCount}`);
      values.push(JSON.stringify(permissions));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, password_hash, email, full_name, phone, role, is_active, permissions, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        code: 404,
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: true,
      code: 200,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      status: false,
      code: 500,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/change-password:
 *   put:
 *     summary: Thay đổi password user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password thay đổi thành công
 *       401:
 *         description: Old password không đúng
 *       404:
 *         description: User không tìm thấy
 */
router.put('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'Missing required fields: old_password, new_password'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user and check old password
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        code: 404,
        message: 'User not found'
      });
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(old_password, userResult.rows[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: false,
        code: 401,
        message: 'Invalid old password'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `;

    await pool.query(updateQuery, [hashedPassword, id]);

    res.status(200).json({
      status: true,
      code: 200,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      status: false,
      code: 500,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Xóa user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User xóa thành công
 *       404:
 *         description: User không tìm thấy
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        code: 404,
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: true,
      code: 200,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      status: false,
      code: 500,
      message: error.message
    });
  }
});

module.exports = router;
