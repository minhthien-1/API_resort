const db = require('../db');

// Lấy danh sách phòng
exports.getAllRooms = async (req, res) => {
  try {
    const { resort_id, location, room_type } = req.query;
    let sql = `
      SELECT 
        r.id, 
        r.resort_id,
        res.name as resort_name,
        r.room_type_id,
        rt.name AS room_type, 
        rt.price_per_night as default_price,
        COALESCE(rd.price_per_night, rt.price_per_night) AS actual_price,
        rd.description, 
        rd.features, 
        rd.images_url, 
        r.status, 
        r.category, 
        r.location, 
        r.address, 
        rd.num_bed,
        r.created_at,
        r.updated_at
      FROM rooms r 
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN resorts res ON r.resort_id = res.id
      LEFT JOIN room_details rd ON rd.room_id = r.id 
      WHERE 1=1
    `;
    const params = [];

    if (resort_id) {
      params.push(resort_id);
      sql += ` AND r.resort_id = $${params.length}`;
    }
    if (location) {
      params.push(`%${location}%`);
      sql += ` AND LOWER(r.location) LIKE LOWER($${params.length})`;
    }
    if (room_type) {
      params.push(room_type);
      sql += ` AND rt.name = $${params.length}`;
    }

    sql += ` ORDER BY r.created_at DESC`;
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error getAllRooms:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
};

// Lấy chi tiết phòng
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        r.id, 
        r.resort_id,
        res.name as resort_name,
        r.room_type_id,
        rt.name AS room_type, 
        rt.price_per_night as default_price,
        COALESCE(rd.price_per_night, rt.price_per_night) AS actual_price,
        rd.description, 
        rd.features, 
        rd.images_url, 
        r.status, 
        r.category, 
        r.location, 
        r.address, 
        rd.num_bed,
        r.created_at,
        r.updated_at
      FROM rooms r 
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN resorts res ON r.resort_id = res.id
      LEFT JOIN room_details rd ON rd.room_id = r.id 
      WHERE r.id = $1
    `;
    const result = await db.query(sql, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phòng' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error getRoomById:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
};

// Tạo phòng mới
exports.createRoom = async (req, res) => {
  const client = await db.connect();
  try {
    const { resort_id, room_type_id, location, address, status, description, num_bed, price_per_night } = req.body;

    if (!resort_id || !room_type_id || !location) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: resort_id, room_type_id, location' });
    }

    await client.query('BEGIN');

    // Tạo phòng
    const roomResult = await client.query(
      `INSERT INTO rooms (resort_id, room_type_id, location, address, status, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
      [resort_id, room_type_id, location, address || '', status || 'available', 'standard']
    );
    const roomId = roomResult.rows[0].id;

    // Tạo room_details (lưu giá custom)
    await client.query(
      `INSERT INTO room_details (room_id, description, features, images_url, num_bed, price_per_night, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [roomId, description || '', [], [], num_bed || '', parseFloat(price_per_night) || 0]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Tạo phòng thành công', room_id: roomId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error createRoom:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  } finally {
    client.release();
  }
};

// Cập nhật phòng
exports.updateRoom = async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { resort_id, room_type_id, location, address, status, description, num_bed, price_per_night } = req.body;

    await client.query('BEGIN');

    // Cập nhật bảng rooms
    const updateResult = await client.query(
      `UPDATE rooms SET 
        resort_id = $1, 
        room_type_id = $2, 
        location = $3, 
        address = $4, 
        status = $5,
        updated_at = NOW()
       WHERE id = $6 RETURNING id`,
      [resort_id, room_type_id, location, address || '', status || 'available', id]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy phòng' });
    }

    // Cập nhật room_details (lưu giá custom)
    const existingDetail = await client.query(
      'SELECT id FROM room_details WHERE room_id = $1',
      [id]
    );

    if (existingDetail.rows.length > 0) {
      await client.query(
        `UPDATE room_details SET 
          description = $1, 
          num_bed = $2, 
          price_per_night = $3,
          updated_at = NOW()
         WHERE room_id = $4`,
        [description || '', num_bed || '', parseFloat(price_per_night) || 0, id]
      );
    } else {
      await client.query(
        `INSERT INTO room_details (room_id, description, features, images_url, num_bed, price_per_night, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [id, description || '', [], [], num_bed || '', parseFloat(price_per_night) || 0]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Cập nhật phòng thành công' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updateRoom:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  } finally {
    client.release();
  }
};

// Xóa phòng
exports.deleteRoom = async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Kiểm tra xem phòng có booking không
    const bookingCheck = await client.query(
      'SELECT id FROM bookings WHERE room_id = $1 LIMIT 1',
      [id]
    );

    if (bookingCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Không thể xóa phòng này vì đã có khách đặt. Hãy chuyển trạng thái sang bảo trì.' 
      });
    }

    // Xóa room_details trước
    await client.query('DELETE FROM room_details WHERE room_id = $1', [id]);

    // Xóa phòng
    const deleteResult = await client.query(
      'DELETE FROM rooms WHERE id = $1 RETURNING id',
      [id]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy phòng để xóa' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Xóa phòng thành công' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleteRoom:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  } finally {
    client.release();
  }
};