const express = require('express');
const router = express.Router();

// Fake Payment - Giả Lập Thanh Toán
router.post('/fake/create', async (req, res) => {
  try {
    const { bookingId, amount, orderInfo } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({
        status: false,
        error: 'Missing bookingId or amount'
      });
    }

    // Tạo URL giả lập
    const paymentUrl = `http://localhost:5500/fake-payment.html?bookingId=${bookingId}&amount=${amount}&orderInfo=${encodeURIComponent(orderInfo)}`;

    res.json({
      status: true,
      paymentUrl: paymentUrl,
      transactionNo: `FAKE_${bookingId}_${Date.now()}`
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message
    });
  }
});

// Fake Payment Return
router.get('/fake/return', async (req, res) => {
  const { status, bookingId, amount } = req.query;

  if (status === 'success') {
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Thanh toán thành công</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .container { background: white; padding: 40px; border-radius: 10px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 500px; }
          .success-icon { font-size: 60px; margin-bottom: 20px; }
          h1 { color: #10b981; margin-bottom: 10px; }
          .info { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
          a { display: inline-block; margin-top: 20px; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Thanh toán thành công!</h1>
          <div class="info">
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p><strong>Số tiền:</strong> ${(amount / 100).toLocaleString('vi-VN')} VNĐ</p>
          </div>
          <a href="home.html">Về trang chủ</a>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Thanh toán thất bại</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .container { background: white; padding: 40px; border-radius: 10px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 500px; }
          h1 { color: #ef4444; }
          a { display: inline-block; margin-top: 20px; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Thanh toán thất bại</h1>
          <p>Vui lòng thử lại</p>
          <a href="payment.html">Quay lại</a>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
