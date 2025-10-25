﻿const express = require('express');
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

// --- User moderation ---
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { q = '', status = 'all', limit = 50 } = req.query || {};
    const like = `%${String(q).trim()}%`;
    const where = [];
    const params = [];
    if (q) {
      where.push('(username LIKE ? OR name LIKE ? OR email LIKE ?)');
      params.push(like, like, like);
    }
    if (status === 'active') where.push('COALESCE(is_active,1) = 1');
    if (status === 'inactive') where.push('COALESCE(is_active,1) = 0');
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await database.all(
      `SELECT id, username, name, email, role, membership, points, tier, is_active, status, created_at, last_login_at
         FROM users ${whereSql}
        ORDER BY created_at DESC
        LIMIT ?`,
      [...params, Math.min(parseInt(limit, 10) || 50, 200)]
    );
    res.json({ users: rows });
  } catch (error) {
    console.error('[admin] list users error:', error);
    res.status(500).json({ message: '사용자 목록을 불러오지 못했습니다.' });
  }
});

router.post('/users/:id/suspend', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await database.run('UPDATE users SET is_active = 0, status = ? WHERE id = ?', ['suspended', id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[admin] suspend user error:', error);
    res.status(500).json({ message: '계정을 정지하지 못했습니다.' });
  }
});

router.post('/users/:id/restore', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await database.run('UPDATE users SET is_active = 1, status = ? WHERE id = ?', ['active', id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[admin] restore user error:', error);
    res.status(500).json({ message: '계정을 복구하지 못했습니다.' });
  }
});

router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // Soft-delete: 비활성 + 상태 표시 (하드 삭제는 데이터 참조 때문에 권장하지 않음)
    await database.run('UPDATE users SET is_active = 0, status = ? WHERE id = ?', ['deleted', id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[admin] delete user error:', error);
    res.status(500).json({ message: '계정을 삭제하지 못했습니다.' });
  }
});
