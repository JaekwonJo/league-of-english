const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

async function ensureTable() {
  try {
    await database.run(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        admin_reply TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  } catch (error) {
    console.error('[inquiries] ensure table failed:', error);
  }
}

ensureTable();

router.post('/', verifyToken, async (req, res) => {
  const { subject, message } = req.body || {};
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });

  try {
    const { id } = await database.run(
      'INSERT INTO inquiries (user_id, subject, message) VALUES (?, ?, ?)',
      [req.user.id, subject, message]
    );
    const row = await database.get('SELECT * FROM inquiries WHERE id = ?', [id]);
    res.status(201).json(row);
  } catch (error) {
    console.error('[inquiries] create error:', error);
    res.status(500).json({ message: 'Failed to submit inquiry.' });
  }
});

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error('[inquiries] mine error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries.' });
  }
});

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('[inquiries] list error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries.' });
  }
});

router.post('/:id/reply', verifyToken, requireAdmin, async (req, res) => {
  const { reply, status = 'answered' } = req.body || {};
  if (!reply) return res.status(400).json({ message: 'Reply is required.' });
  try {
    await database.run(
      'UPDATE inquiries SET admin_reply = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [reply, status, req.params.id]
    );
    const row = await database.get('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ message: 'Inquiry not found.' });
    res.json(row);
  } catch (error) {
    console.error('[inquiries] reply error:', error);
    res.status(500).json({ message: 'Failed to reply to inquiry.' });
  }
});

module.exports = router;