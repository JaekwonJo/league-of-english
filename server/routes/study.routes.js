const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const examProblemService = require('../services/examProblemService');
const {
  saveSession,
  getActiveSession,
  clearSession
} = require('../services/studySessionService');

router.get('/exam-problems', verifyToken, async (req, res) => {
  try {
    const documentId = req.query.documentId;
    const orderMode = req.query.orderMode || 'random';
    if (!documentId) {
      return res.status(400).json({ message: 'documentId is required' });
    }
    const problems = await examProblemService.getUnsolvedProblems(documentId, req.user.id, 20, orderMode);
    res.json({ problems });
  } catch (error) {
    console.error('[study/exam-problems] error:', error);
    res.status(500).json({ message: '기출문제를 불러오지 못했어요.' });
  }
});

router.get('/session', verifyToken, async (req, res) => {
  try {
    const session = await getActiveSession({ userId: req.user.id });
    res.json({ session });
  } catch (error) {
    console.error('[study/session] fetch error:', error);
    res.status(500).json({ message: '저장된 학습 세션을 불러오지 못했어요.' });
  }
});

router.post('/session', verifyToken, async (req, res) => {
  try {
    const { payload } = req.body || {};
    const result = await saveSession({ userId: req.user.id, payload });
    res.json({ session: result });
  } catch (error) {
    console.error('[study/session] save error:', error);
    res.status(400).json({ message: error?.message || '학습 세션을 저장하지 못했어요.' });
  }
});

router.delete('/session', verifyToken, async (req, res) => {
  try {
    const reason = req.body?.reason ?? req.query?.reason ?? null;
    const result = await clearSession({ userId: req.user.id, reason });
    res.json(result);
  } catch (error) {
    console.error('[study/session] clear error:', error);
    res.status(400).json({ message: error?.message || '학습 세션을 정리하지 못했어요.' });
  }
});

module.exports = router;
