const Notification = require('../models/notification');

exports.getNotifications = async (req, res) => {
  try {
    const { user_id } = req.query;
    const rows = await Notification.findAll(user_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const row = await Notification.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Notification not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { title, content, user_id, type } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title và content là bắt buộc' });
    }
    const row = await Notification.create({ title, content, user_id, type });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const row = await Notification.markRead(req.params.id);
    if (!row) return res.status(404).json({ error: 'Notification not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};