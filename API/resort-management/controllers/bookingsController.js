// controllers/bookingsController.js
const pool = require('../db');

/**
 * Tạo đặt phòng mới
 * POST /api/bookings
 * Body: { roomId, checkIn, checkOut, pricePerNight }
 */
async function createBooking(req, res) {
  const { userId } = req.user;
  const { roomId, checkIn, checkOut, pricePerNight } = req.body;

  if (!userId || !roomId || !checkIn || !checkOut || !pricePerNight) {
    return res.status(400).json({ error: "Thiếu thông tin đặt phòng." });
  }

  try {
    // Parse ngày từ format DD/MM/YYYY sang YYYY-MM-DD
    const parseDate = (str) => {
      const [day, month, year] = str.split('/');
      return `${year}-${month}-${day}`;
    };

    const startDate = new Date(parseDate(checkIn));
    const endDate = new Date(parseDate(checkOut));
    const timeDiff = endDate.getTime() - startDate.getTime();
    const nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    const totalAmount = nights * pricePerNight;

    const sql = `
      INSERT INTO bookings (user_id, room_id, check_in, check_out, nightly_rate, total_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, booking_code, total_amount;
    `;

    const params = [userId, roomId, parseDate(checkIn), parseDate(checkOut), pricePerNight, totalAmount];
    const { rows } = await pool.query(sql, params);

    res.status(201).json({
      message: "Đặt phòng thành công!",
      booking: rows[0]
    });

  } catch (error) {
    console.error("❌ Lỗi khi tạo booking:", error);
    res.status(500).json({ error: "Lỗi server khi tạo đơn đặt phòng." });
  }
}

/**
 * Lấy lịch sử đặt phòng của khách
 * GET /api/my-bookings
 */
async function getMyBookings(req, res) {
  const { userId } = req.user;

  try {
    const sql = `
      SELECT 
        b.id,
        b.booking_code,
        b.check_in,
        b.check_out,
        b.total_amount,
        b.status,
        r.resort_name,
        rd.images_url
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_details rd ON r.id = rd.room_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC;
    `;
    
    const { rows } = await pool.query(sql, [userId]);
    res.status(200).json(rows);

  } catch (error) {
    console.error("❌ Lỗi khi lấy lịch sử đặt phòng:", error);
    res.status(500).json({ error: "Lỗi server khi lấy lịch sử đặt phòng." });
  }
}

/**
 * Hủy đặt phòng
 * PUT /api/bookings/:id/cancel
 */
async function cancelBooking(req, res) {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const sql = `
      UPDATE bookings
      SET status = 'cancelled'
      WHERE id = $1 AND user_id = $2 AND (status = 'pending' OR status = 'confirmed')
      RETURNING id, status;
    `;

    const { rows, rowCount } = await pool.query(sql, [id, userId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy đặt phòng hoặc không thể hủy." });
    }

    res.status(200).json({
      message: "Hủy đặt phòng thành công!",
      booking: rows[0]
    });

  } catch (error) {
    console.error("❌ Lỗi khi hủy đặt phòng:", error);
    res.status(500).json({ error: "Lỗi server khi hủy đặt phòng." });
  }
}

/**
 * Lấy tổng số booking
 * GET /api/bookings/total
 */
async function getTotalBookings(req, res) {
  try {
    const r = await pool.query('SELECT COUNT(*) AS total FROM bookings');
    res.json({ total: Number(r.rows[0].total) });
  } catch (err) {
    console.error("❌ Lỗi khi lấy tổng booking:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Lọc tổng số booking theo tháng/năm
 * GET /api/bookings/filter?month=10&year=2025
 */
async function filterBookings(req, res) {
  try {
    const { month, year } = req.query;
    let query = "SELECT COUNT(*) AS total FROM bookings WHERE 1=1";
    const params = [];

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM check_in) = $1 AND EXTRACT(YEAR FROM check_in) = $2`;
      params.push(parseInt(month), parseInt(year));
    }

    const result = await pool.query(query, params);
    res.json({ total: Number(result.rows[0].total) });

  } catch (err) {
    console.error("❌ Lỗi:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Lấy danh sách phòng được đặt nhiều nhất
 * GET /api/rooms/top-booked?limit=5
 */
async function getTopBookedRooms(req, res) {
  try {
    const { limit = 5 } = req.query;

    const result = await pool.query(
      `SELECT r.id, r.category, r.location, COUNT(b.id) AS booking_count,
              COALESCE(SUM(b.total_amount), 0)::BIGINT AS total_revenue
       FROM rooms r LEFT JOIN bookings b ON b.room_id = r.id AND b.status = 'confirmed'
       GROUP BY r.id, r.category, r.location ORDER BY booking_count DESC LIMIT $1`,
      [limit]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Lỗi:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Lấy chi tiết một booking
 * GET /api/bookings/:id
 */
async function getBookingById(req, res) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT 
        b.id,
        b.booking_code,
        b.check_in,
        b.check_out,
        b.total_amount,
        b.status,
        b.nightly_rate,
        u.full_name,
        u.email,
        u.phone,
        r.resort_name,
        r.location,
        rd.images_url,
        rd.description
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_details rd ON r.id = rd.room_id
      WHERE b.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy booking" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Cập nhật trạng thái booking (Admin/Staff)
 * PUT /api/bookings/:id/status
 */
async function updateBookingStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ" });
  }

  try {
    const { rows, rowCount } = await pool.query(
      `UPDATE bookings 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, booking_code`,
      [status, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy booking" });
    }

    res.json({
      message: "Cập nhật trạng thái thành công",
      booking: rows[0]
    });

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Lấy tất cả bookings (Admin/Staff)
 * GET /api/admin/bookings
 */
async function getAllBookings(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        b.id,
        b.booking_code,
        b.check_in,
        b.check_out,
        b.total_amount,
        b.status,
        b.created_at,
        u.full_name,
        u.email,
        r.resort_name,
        r.location
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }
    
    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(sql, params);
    res.json(rows);

  } catch (error) {
    console.error("❌ Lỗi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  getTotalBookings,
  filterBookings,
  getTopBookedRooms,
  getBookingById,
  updateBookingStatus,
  getAllBookings
};

