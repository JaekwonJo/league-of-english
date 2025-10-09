const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  listProblemReports,
  updateProblemReportStatus
} = require('../services/problemFeedbackService');
const notifications = require('../services/notificationService');

async function singleValue(query, params = []) {
  const row = await database.get(query, params);
  return row ? Object.values(row)[0] : 0;
}

router.get('/summary', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [userCount, documentCount, problemCount] = await Promise.all([
      singleValue('SELECT COUNT(*) AS value FROM users'),
      singleValue('SELECT COUNT(*) AS value FROM documents'),
      singleValue('SELECT COUNT(*) AS value FROM problems')
    ]);

    res.json({
      users: userCount,
      documents: documentCount,
      problems: problemCount
    });
  } catch (error) {
    console.error('[admin] summary error:', error);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

router.get('/documents/categories', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rows = await database.all('SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category ASC');
    const categories = rows.map((row) => row.category).filter(Boolean);
    res.json({ categories });
  } catch (error) {
    console.error('[admin] categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

router.get('/health', verifyToken, requireAdmin, (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.get('/problem-feedback', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', limit = 50 } = req.query || {};
    const result = await listProblemReports({ status, limit });
    res.json(result);
  } catch (error) {
    console.error('[admin] problem-feedback list error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '문항 신고 목록을 불러오지 못했어요.' });
  }
});

router.patch('/problem-feedback/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, resolutionNote } = req.body || {};
    const result = await updateProblemReportStatus({
      feedbackId: req.params.id,
      status,
      resolutionNote,
      resolvedBy: req.user.id
    });
    res.json({ success: true, report: result });
  } catch (error) {
    console.error('[admin] problem-feedback update error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '신고 상태를 업데이트하지 못했어요.' });
  }
});

router.get('/notifications', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', limit = 20 } = req.query || {};
    const items = await notifications.list({ status, limit });
    res.json({ notifications: items });
  } catch (error) {
    console.error('[admin] notifications list error:', error);
    res.status(500).json({ message: '알림 목록을 불러오지 못했어요.' });
  }
});

router.patch('/notifications/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    await notifications.updateStatus(req.params.id, status);
    res.json({ success: true });
  } catch (error) {
    console.error('[admin] notification update error:', error);
    res.status(400).json({ message: error?.message || '알림 상태를 변경하지 못했어요.' });
  }
});

module.exports = router;
