// src/models/User.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Lấy tất cả users
  static async getAllUsers() {
    try {
      const query = 'SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy user theo ID
  static async getUserById(userId) {
    try {
      const query = 'SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Lấy user theo email
  static async getUserByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Tạo user mới
  static async createUser(userData) {
    try {
      const { username, email, password, full_name, phone, role } = userData;
      
      // Kiểm tra email đã tồn tại
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `
        INSERT INTO users (username, email, password, full_name, phone, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING id, username, email, full_name, phone, role, is_active, created_at
      `;

      const result = await pool.query(query, [
        username,
        email,
        hashedPassword,
        full_name,
        phone,
        role || 'staff'
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật user
  static async updateUser(userId, userData) {
    try {
      const { username, email, full_name, phone, role, is_active } = userData;

      // Kiểm tra email có bị trùng với user khác không
      if (email) {
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );
        if (existingUser.rows.length > 0) {
          throw new Error('Email already exists');
        }
      }

      const query = `
        UPDATE users 
        SET username = COALESCE($1, username),
            email = COALESCE($2, email),
            full_name = COALESCE($3, full_name),
            phone = COALESCE($4, phone),
            role = COALESCE($5, role),
            is_active = COALESCE($6, is_active),
            updated_at = NOW()
        WHERE id = $7
        RETURNING id, username, email, full_name, phone, role, is_active, updated_at
      `;

      const result = await pool.query(query, [
        username,
        email,
        full_name,
        phone,
        role,
        is_active,
        userId
      ]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Cập nhật password
  static async updatePassword(userId, oldPassword, newPassword) {
    try {
      const user = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );

      if (user.rows.length === 0) {
        throw new Error('User not found');
      }

      // Kiểm tra old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.rows[0].password);
      if (!isPasswordValid) {
        throw new Error('Invalid old password');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const query = `
        UPDATE users 
        SET password = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `;

      await pool.query(query, [hashedPassword, userId]);
      return { message: 'Password updated successfully' };
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Xóa user
  static async deleteUser(userId) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Kiểm tra password
  static async verifyPassword(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      const isValid = await bcrypt.compare(password, user.password);
      return isValid;
    } catch (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }
}

module.exports = User;
