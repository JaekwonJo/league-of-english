const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  listProblemReports,
  updateProblemReportStatus
} = require('../services/problemFeedbackService');
const { setProblemActive } = require('../services/problemLibraryService');
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
      singleValue('SELECT COUNT(*) AS value FROM problems WHERE COALESCE(is_active, 1) = 1')
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
    const {
      status = 'pending',
      type = 'all',
      documentId = 'all',
      reporter,
      search,
      sort = 'recent',
      from,
      to,
      limit = 50
    } = req.query || {};
    const result = await listProblemReports({
      status,
      type,
      documentId,
      reporter,
      search,
      sort,
      from,
      to,
      limit
    });
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

router.post('/problems/:id/deactivate', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { reason, feedbackId } = req.body || {};
    const problem = await setProblemActive({
      problemId: req.params.id,
      isActive: false,
      userId: req.user.id,
      reason
    });

    let report = null;
    if (feedbackId) {
      try {
        report = await updateProblemReportStatus({
          feedbackId,
          status: 'resolved',
          resolutionNote: reason || '문항을 숨김 처리했어요.',
          resolvedBy: req.user.id
        });
      } catch (reportError) {
        console.warn('[admin] failed to auto-resolve feedback after deactivation:', reportError?.message || reportError);
      }
    }

    res.json({ success: true, problem, report });
  } catch (error) {
    console.error('[admin] deactivate problem error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '문항을 숨기지 못했어요.' });
  }
});

router.post('/problems/:id/restore', verifyToken, requireAdmin, async (req, res) => {
  try {
    const problem = await setProblemActive({
      problemId: req.params.id,
      isActive: true,
      userId: req.user.id,
      reason: null
    });
    res.json({ success: true, problem });
  } catch (error) {
    console.error('[admin] restore problem error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '숨긴 문항을 다시 복구하지 못했어요.' });
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
