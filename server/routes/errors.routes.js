const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken } = require('../middleware/auth');

// Minimal client error intake to avoid 405s in production
router.post('/report', async (req, res) => {
  try {
    const { path, message, stack, payload } = req.body || {};
    const userId = (req.user && req.user.id) || null;
    const safePayload = payload ? JSON.stringify(payload).slice(0, 4000) : null;
    const safeStack = stack ? String(stack).slice(0, 8000) : null;
    const safeMessage = message ? String(message).slice(0, 1000) : 'client_error';

    try {
      await database.run(
        `INSERT INTO client_error_reports (user_id, path, message, stack, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, String(path || ''), safeMessage, safeStack, safePayload]
      );
    } catch (e) {
      // If db write fails, just continue
      console.warn('[client-error] failed to save error:', e?.message || e);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[client-error] intake failed:', error);
    res.status(204).send();
  }
});

module.exports = router;

