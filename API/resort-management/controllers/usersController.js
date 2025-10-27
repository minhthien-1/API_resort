// src/controllers/userController.js
const User = require('../models/User');

class UserController {
  // GET: Lấy tất cả users
  async getAllUsers(req, res) {
    try {
      const users = await User.getAllUsers();
      return res.status(200).json({
        status: true,
        code: 200,
        message: 'Users retrieved successfully',
        data: users
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        code: 500,
        message: error.message
      });
    }
  }

  // GET: Lấy user theo ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.getUserById(id);

      if (!user) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        status: true,
        code: 200,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        code: 500,
        message: error.message
      });
    }
  }

  // POST: Tạo user mới
  async createUser(req, res) {
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

      const userData = {
        username,
        email,
        password,
        full_name,
        phone: phone || null,
        role: role || 'staff'
      };

      const newUser = await User.createUser(userData);

      return res.status(201).json({
        status: true,
        code: 201,
        message: 'User created successfully',
        data: newUser
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(400).json({
          status: false,
          code: 400,
          message: error.message
        });
      }
      return res.status(500).json({
        status: false,
        code: 500,
        message: error.message
      });
    }
  }

  // PUT/PATCH: Cập nhật user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, full_name, phone, role, is_active } = req.body;

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
      }

      const userData = {
        username,
        email,
        full_name,
        phone,
        role,
        is_active
      };

      const updatedUser = await User.updateUser(id, userData);

      return res.status(200).json({
        status: true,
        code: 200,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: error.message
        });
      }
      if (error.message.includes('already exists')) {
        return res.status(400).json({
          status: false,
          code: 400,
          message: error.message
        });
      }
      return res.status(500).json({
        status: false,
        code: 500,
        message: error.message
      });
    }
  }

  // PUT: Cập nhật password
  async updatePassword(req, res) {
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

      await User.updatePassword(id, old_password, new_password);

      return res.status(200).json({
        status: true,
        code: 200,
        message: 'Password updated successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: error.message
        });
      }
      if (error.message.includes('Invalid')) {
        return res.status(401).json({
          status: false,
          code: 401,
          message: error.message
        });
      }
      return res.status(500).json({
        status: false,
        code: 500,
        message: error.message
      });
    }
  }

  // DELETE: Xóa user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      await User.deleteUser(id);

      return res.status(200).json({
        status: true,
        code: 200,
        message: 'User deleted successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: error.message
        });
      }
      return res.status(500).json({
        status: false,
        code: 500,
        message: error.message
      });
    }
  }
}

module.exports = new UserController();
