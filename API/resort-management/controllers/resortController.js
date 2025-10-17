// controllers/resortController.js
const pool = require('../db');

async function getAllResorts(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        resort_name,
        room_type_id,                      -- thêm trường này
        (SELECT name FROM room_types WHERE id = rooms.room_type_id) AS type,
        status,
        category,
        location,
        address,
        created_at,
        updated_at
      FROM rooms
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getResortById(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        resort_name,
        room_type_id,                      -- thêm trường này
        (SELECT name FROM room_types WHERE id = rooms.room_type_id) AS type,
        status,
        category,
        location,
        address,
        created_at,
        updated_at
      FROM rooms
      WHERE id = $1
    `, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy resort' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createResort(req, res) {
  const { resort_name, room_type_id, status, category, location, address } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO rooms(
        resort_name, room_type_id, status, category, location, address
      ) VALUES($1,$2,$3,$4,$5,$6)
      RETURNING
        id,
        resort_name,
        room_type_id,                      -- thêm trường này
        (SELECT name FROM room_types WHERE id = rooms.room_type_id) AS type,
        status,
        category,
        location,
        address,
        created_at,
        updated_at
    `, [resort_name, room_type_id, status, category, location, address]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateResort(req, res) {
  const { id } = req.params;
  const { resort_name, room_type_id, status, category, location, address } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE rooms SET
        resort_name=$1,
        room_type_id=$2,                  -- thêm trường này
        status=$3,
        category=$4,
        location=$5,
        address=$6,
        updated_at=NOW()
      WHERE id=$7
      RETURNING
        id,
        resort_name,
        room_type_id,                      -- thêm trường này
        (SELECT name FROM room_types WHERE id = rooms.room_type_id) AS type,
        status,
        category,
        location,
        address,
        created_at,
        updated_at
    `, [resort_name, room_type_id, status, category, location, address, id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy resort' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteResort(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM rooms WHERE id=$1', [id]);
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllResorts,
  getResortById,
  createResort,
  updateResort,
  deleteResort
};
