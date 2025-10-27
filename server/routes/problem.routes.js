const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
const { getUsageToday, addUsage } = require('../services/usageService');
const problemSetService = require('../services/problemSetService');
const problemExportService = require('../services/problemExportService');
const problemLibraryService = require('../services/problemLibraryService');
const problemReviewService = require('../services/problemReviewService');
const {
  submitFeedback: submitProblemFeedback,
  getFeedbackSummary: getProblemFeedbackSummary
} = require('../services/problemFeedbackService');
const { getUserStats } = require('../services/problemStatsService');
const studyService = require('../services/studyService');

router.post('/generate/csat-set', verifyToken, checkDailyLimit, async (req, res) => {
  const {
    documentId,
    counts = {},
    orderDifficulty = 'advanced',
    insertionDifficulty = 'advanced',
    orderMode = 'random'
  } = req.body || {};

  if (!documentId) {
    return res.status(400).json({ message: 'documentId is required.' });
  }

  try {
    // Per-type(문제풀이) 일일 제한: 무료 회원은 30문항/일
    // 관리자/프리미엄/프로는 무제한
    const db = require('../models/database');
    const me = await db.get('SELECT membership, role FROM users WHERE id = ?', [req.user.id]);
    const isUnlimited = me && (me.role === 'admin' || me.membership === 'premium' || me.membership === 'pro');
    if (!isUnlimited) {
      const requestedTotal = Object.values(counts || {}).reduce((s, v) => s + (parseInt(v, 10) || 0), 0) || 30;
      const usedProblemsToday = await getUsageToday(req.user.id, 'problems');
      if ((usedProblemsToday + requestedTotal) > 30) {
        const remaining = Math.max(0, 30 - usedProblemsToday);
        return res.status(429).json({
          message: `오늘 문제풀이 제한(30문항)을 초과했어요. 남은 수: ${remaining}문항. 내일 다시 시도하거나 업그레이드해 주세요.`
        });
      }
    }
    const result = await problemSetService.generateCsatSet({
      documentId,
      counts,
      orderDifficulty,
      insertionDifficulty,
      orderMode,
      userId: req.user.id
    });

    await updateUsage(req.user.id, result.count);
    try { await addUsage(req.user.id, 'problems', result.count); } catch (e) { /* ignore */ }

    res.json({
      ...result,
      limit: req.dailyLimit
    });
  } catch (error) {
    console.error('[generate/csat-set] error:', error);
    const extractedStatus = Number.isInteger(error?.statusCode)
      ? error.statusCode
      : Number.isInteger(error?.status) ? error.status : 500;
    const statusCode = extractedStatus >= 400 ? extractedStatus : 500;
    const rawMessage = String(error?.message || '').toLowerCase();
    let friendly = '문제를 생성하는 중 알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
    if (statusCode === 401) {
      friendly = '로그인이 필요합니다. 오른쪽 상단에서 로그인 후 다시 시도해 주세요.';
    } else if (statusCode === 403) {
      friendly = '권한이 부족합니다. 관리자/선생님 전용 기능이거나 토큰이 유효하지 않습니다.';
    } else if (statusCode === 404) {
      friendly = '요청한 문서 또는 사용자 정보를 찾지 못했습니다. 페이지 새로고침 후 다시 시도해 주세요.';
    } else if (statusCode === 429) {
      friendly = '오늘의 문제 생성 한도를 모두 사용했어요. 내일 다시 시도하거나 프리미엄으로 업그레이드해 주세요.';
    } else if (rawMessage.includes('ai generator unavailable')) {
      friendly = 'AI 생성기가 준비되지 않았어요. OpenAI API 키 설정 후 다시 시도해 주세요.';
    } else if (rawMessage.includes('failed to prepare enough problems')) {
      friendly = '요청한 유형의 문제를 모두 만들지 못했어요. 문제 수를 줄이거나 다른 유형을 선택해 주세요.';
    }

    const payload = { message: friendly };
    if (String(process.env.LOE_DEBUG || '').trim() === '1') {
      payload.debug = { statusCode, error: String(error?.message || error) };
    }
    res.status(statusCode).json(payload);
  }
});

router.post('/problems/submit', verifyToken, async (req, res) => {
  try {
    const { results } = req.body || {};
    const outcome = await studyService.recordStudySession(req.user.id, results);
    res.json(outcome);
  } catch (error) {
    console.error('[problems/submit] error:', error);
    res.status(500).json({ message: '학습 결과를 저장하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.post('/problems/export/pdf', verifyToken, async (req, res) => {
  try {
    if (!req.user || !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: '관리자 또는 선생님 계정만 PDF 내보내기를 사용할 수 있어요.' });
    }

    const {
      documentId = null,
      types = [],
      counts = {},
      limit = 20,
      includeSolutions = true,
      title,
      subtitle
    } = req.body || {};

    const exportBundle = await problemExportService.gatherProblems({
      documentId,
      types,
      counts,
      limit,
      includeSolutions,
      includeGeneratedOnly: false
    });

    await problemExportService.recordExportHistory({
      userId: req.user.id,
      documentId: exportBundle.documentId,
      types: exportBundle.normalizedTypes.length
        ? exportBundle.normalizedTypes
        : Object.keys(exportBundle.normalizedCounts),
      counts: exportBundle.normalizedCounts,
      problemIds: exportBundle.problemIds,
      total: exportBundle.total,
      includeSolutions
    });

    const filename = `loe-problems-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = problemExportService.buildPdfStream(exportBundle.problems, {
      title,
      subtitle,
      includeSolutions,
      documentId: exportBundle.documentId
    });

    doc.pipe(res);
    doc.on('error', (streamError) => {
      console.error('[problems/export/pdf] stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ message: 'PDF 전송 중 오류가 발생했어요.' });
      } else {
        res.end();
      }
    });
    doc.end();
  } catch (error) {
    console.error('[problems/export/pdf] error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    if (!res.headersSent) {
      res.status(statusCode).json({
        message: error?.message || '문제 PDF를 생성하지 못했어요. 잠시 후 다시 시도해 주세요.'
      });
    }
  }
});

router.get('/problems/library', verifyToken, async (req, res) => {
  try {
    if (!req.user || !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: '관리자 또는 선생님 계정만 문제 라이브러리에 접근할 수 있어요.' });
    }

    const documentId = req.query.documentId ? Number(req.query.documentId) : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 0) || 40, 200);
    const includeGeneratedOnly = req.query.aiOnly === undefined ? true : req.query.aiOnly !== 'false';
    const types = problemLibraryService.normalizeListParam(req.query.types);
    const difficulties = problemLibraryService
      .normalizeListParam(req.query.difficulties)
      .map((item) => item.toLowerCase());
    const includeInactive = req.query.includeInactive === 'true';

    const problems = await problemLibraryService.listProblems({
      documentId,
      limit,
      includeGeneratedOnly,
      types,
      difficulties,
      includeInactive
    });

    const summary = await problemLibraryService.summarizeProblems({
      documentId,
      includeGeneratedOnly,
      difficulties,
      includeInactive
    });

    res.json({
      count: problems.length,
      total: problems.length,
      problems,
      summary,
      documentId,
      includeGeneratedOnly,
      includeInactive
    });
  } catch (error) {
    console.error('[problems/library] error:', error);
    res.status(500).json({ message: '문제 라이브러리를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.put('/problems/:id/note', verifyToken, async (req, res) => {
  try {
    if (!req.user || !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: '관리자 또는 선생님 계정만 문항 메모를 수정할 수 있어요.' });
    }

    const problemId = Number(req.params.id);
    const note = typeof req.body?.note === 'string' ? req.body.note : '';
    const problem = await problemLibraryService.saveProblemNote({
      problemId,
      userId: req.user.id,
      note
    });

    res.json({ problem });
  } catch (error) {
    console.error('[problems/:id/note] error:', error);
    res.status(500).json({ message: '문항 메모를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.get('/problems/export/history', verifyToken, async (req, res) => {
  try {
    if (!req.user || !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: '관리자 또는 선생님 계정만 내보내기 기록을 볼 수 있어요.' });
    }

    const history = await problemExportService.listExportHistory(req.query.limit);
    res.json({ history });
  } catch (error) {
    console.error('[problems/export/history] error:', error);
    res.status(500).json({ message: 'PDF 내보내기 내역을 불러오지 못했어요.' });
  }
});

router.get('/problems/review-queue', verifyToken, async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit, 10) || 0, 0) || 20;
    const queue = await problemReviewService.getReviewQueueForUser(req.user.id, { limit });
    res.json(queue);
  } catch (error) {
    console.error('[problems/review-queue] error:', error);
    res.status(500).json({ message: '복습 대기열을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.post('/problems/review-session', verifyToken, async (req, res) => {
  try {
    const result = await problemReviewService.startReviewSession(req.user.id, {
      limit: req.body?.limit
    });
    res.json(result);
  } catch (error) {
    console.error('[problems/review-session] error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({
      message: error?.message || '복습 세트를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.'
    });
  }
});

router.post('/problems/:id/feedback', verifyToken, async (req, res) => {
  const problemId = Number(req.params.id);
  try {
    const fingerprintSource = [
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown',
      req.user?.id || 'anonymous'
    ].join('|');
    const clientFingerprint = crypto.createHash('sha256').update(fingerprintSource).digest('hex');

    const feedbackResult = await submitProblemFeedback({
      userId: req.user.id,
      problemId,
      action: req.body?.action,
      reason: req.body?.reason,
      clientFingerprint,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || ''
    });

    const summary = await getProblemFeedbackSummary(problemId, req.user.id);

    res.json({
      ...feedbackResult,
      summary
    });
  } catch (error) {
    console.error('[problems/:id/feedback] error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '문항 피드백을 저장하지 못했어요.' });
  }
});

router.get('/problems/:id/feedback/summary', verifyToken, async (req, res) => {
  try {
    const summary = await getProblemFeedbackSummary(Number(req.params.id), req.user.id);
    res.json(summary);
  } catch (error) {
    console.error('[problems/:id/feedback/summary] error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '문항 피드백을 불러오지 못했어요.' });
  }
});

router.get('/problems/stats', verifyToken, async (req, res) => {
  try {
    const stats = await getUserStats(req.user.id);
    return res.json(stats);
  } catch (error) {
    console.error('[problems/stats] error:', error);
    // 안전 폴백: UI가 깨지지 않도록 기본 구조 반환
    return res.json({
      totalProblems: 0,
      totalCorrect: 0,
      accuracy: 0,
      totalSessions: 0,
      weeklySessions: 0,
      perType: []
    });
  }
});

module.exports = router;
