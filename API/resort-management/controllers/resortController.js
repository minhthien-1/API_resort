const db = require('../db');

// Lấy danh sách resort
exports.getAllResorts = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, created_at FROM resorts ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error getAllResorts:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
};

// Lấy chi tiết resort
exports.getResortById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Chuyển id thành số nguyên
    const resortId = parseInt(id, 10);
    if (isNaN(resortId)) {
      return res.status(400).json({ error: 'ID phải là số nguyên' });
    }
    
    const result = await db.query(
      'SELECT id, name, created_at FROM resorts WHERE id = $1',
      [resortId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy resort' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error getResortById:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
};

// Tạo resort mới
exports.createResort = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Tên resort là bắt buộc' });
    }

    const result = await db.query(
      `INSERT INTO resorts (name, created_at)
       VALUES ($1, NOW()) RETURNING id, name, created_at`,
      [name.trim()]
    );
    
    res.status(201).json({ message: 'Tạo resort thành công', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tên resort này đã tồn tại' });
    }
    console.error('❌ Error createResort:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
};

// Cập nhật resort
exports.updateResort = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Tên resort là bắt buộc' });
    }

    // Chuyển id thành số nguyên
    const resortId = parseInt(id, 10);
    if (isNaN(resortId)) {
      return res.status(400).json({ error: 'ID phải là số nguyên' });
    }

    const result = await db.query(
      `UPDATE resorts 
       SET name = $1
       WHERE id = $2 
       RETURNING id, name, created_at`,
      [name.trim(), resortId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy resort' });
    }

    res.json({ message: 'Cập nhật resort thành công', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tên resort này đã tồn tại' });
    }
    console.error('❌ Error updateResort:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
};

// Xóa resort
exports.deleteResort = async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;

    // Chuyển id thành số nguyên
    const resortId = parseInt(id, 10);
    if (isNaN(resortId)) {
      return res.status(400).json({ error: 'ID phải là số nguyên' });
    }

    await client.query('BEGIN');

    // Kiểm tra xem resort có phòng không
    const roomCheck = await client.query(
      'SELECT id FROM rooms WHERE resort_id = $1 LIMIT 1',
      [resortId]
    );

    if (roomCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Không thể xóa resort này vì còn có phòng. Hãy xóa tất cả phòng trước.' 
      });
    }

    // Xóa resort
    const deleteResult = await client.query(
      'DELETE FROM resorts WHERE id = $1 RETURNING id',
      [resortId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy resort để xóa' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Xóa resort thành công' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleteResort:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  } finally {
    client.release();
  }
};