// middleware/authorize.js
const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực JWT và kiểm tra quyền
 * @param {Array} allowedRoles - Danh sách role được phép truy cập
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1]; // Lấy token sau "Bearer "

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token không tồn tại' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
      
      // Nếu có danh sách role được phép, kiểm tra role
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden: Không có quyền truy cập' });
      }

      // Gán thông tin user vào request để các middleware/controller khác sử dụng
      req.user = payload;
      next();

    } catch (error) {
      return res.status(401).json({ error: 'Invalid token: Token không hợp lệ' });
    }
  };
}

module.exports = authorize;

