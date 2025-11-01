const Contact = require('../models/contact');
const mailer = require('../utils/mailer');

exports.createContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email và message là bắt buộc' });
    }
    const row = await Contact.create({ name, email, phone, subject, message });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const rows = await Contact.findAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContactById = async (req, res) => {
  try {
    const row = await Contact.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Contact not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.replyContact = async (req, res) => {
  try {
    const { reply } = req.body;
    if (typeof reply !== 'string' || reply.trim() === '') {
      return res.status(400).json({ error: 'reply là bắt buộc' });
    }
    const row = await Contact.reply(req.params.id, reply);
    if (!row) return res.status(404).json({ error: 'Contact not found' });

    if (row.email) {
      try {
        await mailer.sendReplyEmail(row.email, `Re: ${row.subject || 'Contact'}`, reply);
      } catch (mailErr) {
        console.warn('Mailer error:', mailErr.message);
      }
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status là bắt buộc' });
    const row = await Contact.updateStatus(req.params.id, status);
    if (!row) return res.status(404).json({ error: 'Contact not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};