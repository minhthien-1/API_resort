// controllers/paymentController.js
const pool = require('../db');

/**
 * Tạo thanh toán mới
 * POST /api/payments
 * Body: { bookingId, paymentMethod, amount, discountCode }
 */
async function createPayment(req, res) {
  const { userId } = req.user;
  const { bookingId, paymentMethod, amount, discountCode } = req.body;

  if (!bookingId || !paymentMethod || !amount) {
    return res.status(400).json({ error: "Thiếu thông tin thanh toán." });
  }

  const allowedMethods = ['cash', 'card', 'bank_transfer', 'e_wallet'];
  if (!allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ." });
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Kiểm tra booking có tồn tại và thuộc về user không
      const bookingCheck = await client.query(
        'SELECT id, total_amount, status FROM bookings WHERE id=$1 AND user_id=$2',
        [bookingId, userId]
      );

      if (bookingCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Không tìm thấy booking hoặc không có quyền thanh toán." });
      }

      const booking = bookingCheck.rows[0];
      
      // Kiểm tra booking đã thanh toán chưa
      const existingPayment = await client.query(
        'SELECT id FROM payments WHERE booking_id=$1 AND status=$2',
        [bookingId, 'completed']
      );

      if (existingPayment.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Booking này đã được thanh toán." });
      }

      let finalAmount = amount;
      let discountId = null;

      // Áp dụng discount code nếu có
      if (discountCode) {
        const discountResult = await client.query(
          `SELECT id, discount_type, value, usage_limit, usage_used, valid_from, valid_until, status 
           FROM discounts WHERE code=$1 AND status='active' AND NOW() BETWEEN valid_from AND valid_until`,
          [discountCode]
        );

        if (discountResult.rows.length > 0) {
          const discount = discountResult.rows[0];
          
          // Kiểm tra số lần sử dụng
          if (discount.usage_used >= discount.usage_limit) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Mã giảm giá đã hết lượt sử dụng." });
          }

          discountId = discount.id;
          
          // Tính toán giảm giá
          if (discount.discount_type === 'percent') {
            finalAmount = amount - (amount * discount.value / 100);
          } else if (discount.discount_type === 'fixed') {
            finalAmount = Math.max(0, amount - discount.value);
          }

          // Cập nhật số lần sử dụng discount
          await client.query(
            'UPDATE discounts SET usage_used = usage_used + 1 WHERE id=$1',
            [discount.id]
          );
        }
      }

      // Tạo payment record
      const paymentResult = await client.query(
        `INSERT INTO payments (booking_id, user_id, payment_method, amount, discount_id, status, transaction_date)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         RETURNING id, transaction_code, amount, status, transaction_date`,
        [bookingId, userId, paymentMethod, finalAmount, discountId]
      );

      const payment = paymentResult.rows[0];

      // Xác nhận thanh toán (trong thực tế, bạn sẽ call payment gateway)
      // Ở đây ta giả lập là thanh toán thành công ngay
      await client.query(
        `UPDATE payments SET status='completed', paid_at=NOW() WHERE id=$1`,
        [payment.id]
      );

      // Cập nhật status booking thành confirmed
      await client.query(
        `UPDATE bookings SET status='confirmed', updated_at=NOW() WHERE id=$1`,
        [bookingId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: "Thanh toán thành công!",
        payment: {
          ...payment,
          status: 'completed',
          paid_at: new Date().toISOString()
        }
      });

    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Lỗi khi tạo thanh toán:", error);
    res.status(500).json({ error: "Lỗi server khi tạo thanh toán." });
  }
}

/**
 * Lấy lịch sử thanh toán của user
 * GET /api/payments/my-payments
 */
async function getMyPayments(req, res) {
  const { userId } = req.user;

  try {
    const { rows } = await pool.query(
      `SELECT 
        p.id,
        p.transaction_code,
        p.amount,
        p.payment_method,
        p.status,
        p.transaction_date,
        p.paid_at,
        b.booking_code,
        b.check_in,
        b.check_out,
        r.resort_name,
        r.location
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN rooms r ON b.room_id = r.id
      WHERE p.user_id = $1
      ORDER BY p.transaction_date DESC`,
      [userId]
    );

    res.status(200).json(rows);

  } catch (error) {
    console.error("❌ Lỗi khi lấy lịch sử thanh toán:", error);
    res.status(500).json({ error: "Lỗi server khi lấy lịch sử thanh toán." });
  }
}

/**
 * Lấy chi tiết một thanh toán
 * GET /api/payments/:id
 */
async function getPaymentById(req, res) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT 
        p.id,
        p.transaction_code,
        p.amount,
        p.payment_method,
        p.status,
        p.transaction_date,
        p.paid_at,
        p.refund_amount,
        p.refunded_at,
        b.id AS booking_id,
        b.booking_code,
        b.check_in,
        b.check_out,
        b.total_amount AS booking_total,
        u.full_name,
        u.email,
        u.phone,
        r.resort_name,
        r.location,
        COALESCE(d.code, 'Không có') AS discount_code,
        COALESCE(d.value, 0) AS discount_value
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON p.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN discounts d ON p.discount_id = d.id
      WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thanh toán" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Lấy tất cả thanh toán (Admin/Staff)
 * GET /api/payments/list
 */
async function getAllPayments(req, res) {
  try {
    const { status, paymentMethod, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        p.id,
        p.transaction_code,
        p.amount,
        p.payment_method,
        p.status,
        p.transaction_date,
        p.paid_at,
        b.booking_code,
        u.full_name,
        u.email,
        r.resort_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON p.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }
    
    if (paymentMethod) {
      params.push(paymentMethod);
      sql += ` AND p.payment_method = $${params.length}`;
    }
    
    if (startDate && endDate) {
      params.push(startDate, endDate);
      sql += ` AND p.transaction_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    
    sql += ` ORDER BY p.transaction_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(sql, params);
    res.json(rows);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Hoàn tiền thanh toán (Admin/Staff)
 * POST /api/payments/:id/refund
 */
async function refundPayment(req, res) {
  const { id } = req.params;
  const { refundAmount, reason } = req.body;

  if (!refundAmount) {
    return res.status(400).json({ error: "Số tiền hoàn trả là bắt buộc." });
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Kiểm tra payment
      const paymentCheck = await client.query(
        'SELECT id, amount, status, booking_id FROM payments WHERE id=$1',
        [id]
      );

      if (paymentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Không tìm thấy thanh toán." });
      }

      const payment = paymentCheck.rows[0];

      if (payment.status !== 'completed') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Chỉ có thể hoàn tiền cho thanh toán đã hoàn thành." });
      }

      // Kiểm tra số tiền hoàn trả không vượt quá số tiền đã thanh toán
      if (refundAmount > payment.amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Số tiền hoàn trả không được vượt quá số tiền đã thanh toán." });
      }

      // Cập nhật refund
      await client.query(
        `UPDATE payments 
         SET refund_amount=$1, refunded_at=NOW(), status='refunded', refund_reason=$2
         WHERE id=$3`,
        [refundAmount, reason || null, id]
      );

      // Cập nhật booking status thành cancelled
      await client.query(
        `UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=$1`,
        [payment.booking_id]
      );

      await client.query('COMMIT');

      res.status(200).json({
        message: "Hoàn tiền thành công!",
        refund_amount: refundAmount
      });

    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Lỗi khi hoàn tiền:", error);
    res.status(500).json({ error: "Lỗi server khi hoàn tiền." });
  }
}

/**
 * Thống kê thanh toán
 * GET /api/payments/stats
 */
async function getPaymentStats(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    let sql = `
      SELECT 
        COUNT(*) AS total_payments,
        COUNT(DISTINCT user_id) AS total_users,
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status='refunded' THEN refund_amount ELSE 0 END), 0) AS total_refunded,
        COALESCE(AVG(CASE WHEN status='completed' THEN amount ELSE NULL END), 0) AS avg_payment_amount
      FROM payments
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      params.push(startDate, endDate);
      sql += ` AND transaction_date BETWEEN $1 AND $2`;
    }
    
    const { rows } = await pool.query(sql, params);
    res.json(rows[0]);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Thanh toán theo phương thức
 * GET /api/payments/by-method
 */
async function getPaymentsByMethod(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    let sql = `
      SELECT 
        payment_method,
        COUNT(*) AS transaction_count,
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 0) AS total_amount,
        COALESCE(AVG(CASE WHEN status='completed' THEN amount ELSE NULL END), 0) AS avg_amount
      FROM payments
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      params.push(startDate, endDate);
      sql += ` AND transaction_date BETWEEN $1 AND $2`;
    }
    
    sql += ` GROUP BY payment_method ORDER BY total_amount DESC`;
    
    const { rows } = await pool.query(sql, params);
    res.json(rows);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Xuất phiếu thanh toán (Invoice)
 * GET /api/payments/:id/invoice
 */
async function getPaymentInvoice(req, res) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT 
        p.id AS payment_id,
        p.transaction_code,
        p.amount,
        p.payment_method,
        p.transaction_date,
        p.paid_at,
        b.booking_code,
        b.check_in,
        b.check_out,
        b.total_amount AS booking_total,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        r.resort_name,
        r.location,
        r.address,
        rt.name AS room_type,
        rt.price_per_night,
        COALESCE(d.code, 'Không có') AS discount_code,
        COALESCE(d.description, '') AS discount_description
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON p.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN discounts d ON p.discount_id = d.id
      WHERE p.id = $1 AND p.status='completed'`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy phiếu thanh toán." });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

module.exports = {
  createPayment,
  getMyPayments,
  getPaymentById,
  getAllPayments,
  refundPayment,
  getPaymentStats,
  getPaymentsByMethod,
  getPaymentInvoice
};

