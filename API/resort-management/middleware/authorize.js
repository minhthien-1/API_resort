/**
 * Middleware GIẢ LẬP xác thực (Dùng để Test, không cần Token)
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    console.log(`🔓 [TEST MODE] Bỏ qua xác thực...`);

    req.user = {
      // ✅ ĐÃ SỬA: Dùng UUID thật bạn vừa gửi
      userId: '3d806f0d-4b36-4d70-9d00-aff58cd2a1d1', 
      
      username: 'admin_test',
      role: 'admin' // Giả lập quyền to nhất để test mọi API
    };

    next();
  };
}

module.exports = authorize;