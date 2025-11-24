// controllers/bookingsController.js
const pool = require('../db');

/**
 * Tạo đặt phòng mới
 */
async function createBooking(req, res) {
  const { userId } = req.user;
  const { roomId, checkIn, checkOut, pricePerNight } = req.body;

  if (!userId || !roomId || !checkIn || !checkOut || !pricePerNight) {
    return res.status(400).json({ error: "Thiếu thông tin đặt phòng." });
  }

  try {
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
 * Lấy lịch sử đặt phòng của khách (ĐÃ FIX LỖI THIẾU TÊN RESORT)
 */
async function getMyBookings(req, res) {
  const { userId } = req.user;

  try {
    const sql = `
      SELECT 
        b.id,
        b.booking_code,
        b.check_in as check_in,   -- Đổi tên cho khớp frontend
        b.check_out as check_out, -- Đổi tên cho khớp frontend
        b.total_amount,
        b.status,
        b.created_at,
        -- SỬA: Lấy tên từ bảng resorts
        res.name AS resort_name,
        rd.images_url
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      -- THÊM: Join bảng resorts để lấy tên
      JOIN resorts res ON r.resort_id = res.id
      LEFT JOIN room_details rd ON r.id = rd.room_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC;
    `;
    
    const { rows } = await pool.query(sql, [userId]);

    // Xử lý ảnh
    const processed = rows.map(item => {
        let imgs = [];
        const raw = item.images_url;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) imgs = parsed;
                else if (typeof parsed === 'string') imgs = [parsed];
            } catch (e) {
                if (typeof raw === 'string') {
                    let cleaned = raw.replace(/[{}"\\[\]]/g, '');
                    if (cleaned.includes(',')) imgs = cleaned.split(',').map(x => x.trim());
                    else if (cleaned.trim() !== '') imgs = [cleaned.trim()];
                }
            }
        }
        item.images_url = imgs.filter(i => i && i.trim() !== '');
        return item;
    });

    res.status(200).json(processed);

  } catch (error) {
    console.error("❌ Lỗi khi lấy lịch sử đặt phòng:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
}

/**
 * Hủy đặt phòng (ĐÃ FIX LOGIC 24H)
 */
async function cancelBooking(req, res) {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    // 1. Kiểm tra booking
    const checkSql = `SELECT id, user_id, status, created_at, room_id FROM bookings WHERE id = $1`;
    const checkResult = await pool.query(checkSql, [id]);

    if (checkResult.rowCount === 0) return res.status(404).json({ error: "Không tìm thấy đặt phòng." });
    
    const booking = checkResult.rows[0];

    // 2. Validate quyền và trạng thái
    if (booking.user_id !== userId) return res.status(403).json({ error: "Bạn không có quyền." });
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        return res.status(400).json({ error: "Không thể hủy đơn này." });
    }

    // 3. Validate 24h
    const createdTime = new Date(booking.created_at).getTime();
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - createdTime) / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
        return res.status(400).json({ error: "Đã quá 24h kể từ lúc đặt. Không thể hủy." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 4. Cập nhật Booking
        const updateSql = `
            UPDATE bookings SET status = 'cancelled', updated_at = NOW() 
            WHERE id = $1 RETURNING id, status
        `;
        const { rows } = await client.query(updateSql, [id]);

        // 5. Cập nhật Room (trả về available)
        await client.query(`UPDATE rooms SET status = 'available' WHERE id = $1`, [booking.room_id]);

        await client.query('COMMIT');
        res.status(200).json({ message: "Hủy thành công!", booking: rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

  } catch (error) {
    console.error("❌ Lỗi hủy:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
}

/**
 * Lấy chi tiết một booking (ĐÃ FIX LỖI `r.resort_name`)
 */
async function getBookingById(req, res) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT 
        b.id,
        b.booking_code,
        b.check_in as check_in,
        b.check_out as check_out,
        b.total_amount,
        b.status,
        b.nightly_rate,
        u.full_name,
        u.email,
        u.phone,
        -- SỬA: Lấy tên từ bảng resorts (res), không phải rooms (r)
        res.name AS resort_name,
        r.location,
        rd.images_url,
        rd.description
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      -- THÊM: Join bảng resorts
      JOIN resorts res ON r.resort_id = res.id
      LEFT JOIN room_details rd ON r.id = rd.room_id
      WHERE b.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy booking" });
    }

    // Xử lý ảnh tránh lỗi frontend
    const booking = rows[0];
    let imgs = [];
    if (booking.images_url) {
        try {
            const parsed = JSON.parse(booking.images_url);
            if (Array.isArray(parsed)) imgs = parsed;
            else if (typeof parsed === 'string') imgs = [parsed];
        } catch (e) {
             if (typeof booking.images_url === 'string') {
                let cleaned = booking.images_url.replace(/[{}"\\[\]]/g, '');
                if (cleaned.includes(',')) imgs = cleaned.split(',');
                else if (cleaned.trim()) imgs = [cleaned.trim()];
             }
        }
    }
    booking.images_url = imgs.filter(i => i && i.trim() !== '');

    res.json(booking);

  } catch (error) {
    console.error("❌ Lỗi booking detail:", error);
    res.status(500).json({ error: "Lỗi server: " + error.message });
  }
}

/**
 * Lấy tất cả bookings (Admin) - (ĐÃ FIX LỖI THIẾU TÊN RESORT)
 */
async function getAllBookings(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        b.id,
        b.booking_code,
        b.check_in as check_in,
        b.check_out as check_out,
        b.total_amount,
        b.status,
        b.created_at,
        COALESCE(u.full_name, u.username, 'Khách ẩn danh') AS customer_name,
        COALESCE(u.phone, '---') AS customer_phone,
        -- SỬA: Lấy tên từ bảng resorts
        COALESCE(res.name, 'Resort đã xóa') AS resort_name,
        COALESCE(r.location, '') AS location
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN rooms r ON b.room_id = r.id
      -- THÊM: Join bảng resorts
      LEFT JOIN resorts res ON r.resort_id = res.id
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
    console.error("❌ Lỗi admin list:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}

/**
 * Cập nhật trạng thái booking (Admin) - Thủ công (Không cần Trigger)
 */
async function updateBookingStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!['confirmed', 'cancelled', 'checked_in', 'checked_out'].includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update Booking
    const bookingRes = await client.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING room_id, status`,
      [status, id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Không tìm thấy booking" });
    }

    const roomId = bookingRes.rows[0].room_id;

    // 2. Update Room (Sync Status)
    let newRoomStatus = null;
    if (status === 'confirmed') newRoomStatus = 'reserved';
    else if (status === 'cancelled' || status === 'checked_out') newRoomStatus = 'available';
    else if (status === 'checked_in') newRoomStatus = 'occupied';

    if (newRoomStatus) {
        await client.query(`UPDATE rooms SET status = $1 WHERE id = $2`, [newRoomStatus, roomId]);
        console.log(`👉 Đã cập nhật phòng ${roomId} sang ${newRoomStatus}`);
    }

    await client.query('COMMIT');
    res.json({ message: "Cập nhật thành công", booking: bookingRes.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Lỗi cập nhật:", error);
    res.status(500).json({ error: "Lỗi server" });
  } finally {
    client.release();
  }
}

// Các hàm phụ giữ nguyên
async function getTotalBookings(req, res) {
  try {
    const r = await pool.query('SELECT COUNT(*) AS total FROM bookings');
    res.json({ total: Number(r.rows[0].total) });
  } catch (e) { res.status(500).json({ error: "Lỗi server" }); }
}

async function filterBookings(req, res) {
  try {
    const { month, year } = req.query;
    let q = "SELECT COUNT(*) AS total FROM bookings WHERE 1=1";
    const p = [];
    if (month && year) { q += " AND EXTRACT(MONTH FROM check_in)=$1 AND EXTRACT(YEAR FROM check_in)=$2"; p.push(month, year); }
    const r = await pool.query(q, p);
    res.json({ total: Number(r.rows[0].total) });
  } catch (e) { res.status(500).json({ error: "Lỗi server" }); }
}

async function getTopBookedRooms(req, res) {
  try {
    const { limit = 5 } = req.query;
    const r = await pool.query(`
        SELECT r.id, r.category, r.location, COUNT(b.id) as count 
        FROM rooms r LEFT JOIN bookings b ON b.room_id = r.id AND b.status='confirmed' 
        GROUP BY r.id, r.category, r.location ORDER BY count DESC LIMIT $1`, [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: "Lỗi server" }); }
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