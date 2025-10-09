const express = require('express');
const router = express.Router();

const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
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
    const result = await problemSetService.generateCsatSet({
      documentId,
      counts,
      orderDifficulty,
      insertionDifficulty,
      orderMode,
      userId: req.user.id
    });

    await updateUsage(req.user.id, result.count);

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
    if (rawMessage.includes('ai generator unavailable')) {
      friendly = 'AI 생성기가 준비되지 않았어요. OpenAI API 키를 설정한 뒤 다시 시도해 주세요.';
    } else if (rawMessage.includes('failed to prepare enough problems')) {
      friendly = '요청한 유형의 문제를 모두 만들지 못했어요. 문제 수를 줄이거나 다른 유형을 선택해 주세요.';
    }
    res.status(statusCode).json({ message: friendly });
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

    const problems = await problemLibraryService.listProblems({
      documentId,
      limit,
      includeGeneratedOnly,
      types,
      difficulties
    });

    const summary = await problemLibraryService.summarizeProblems({
      documentId,
      includeGeneratedOnly,
      difficulties
    });

    res.json({
      count: problems.length,
      total: problems.length,
      problems,
      summary,
      documentId,
      includeGeneratedOnly
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
    const feedbackResult = await submitProblemFeedback({
      userId: req.user.id,
      problemId,
      action: req.body?.action,
      reason: req.body?.reason
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
    res.json(stats);
  } catch (error) {
    console.error('[problems/stats] error:', error);
    const statusCode = Number.isInteger(error?.status) ? error.status : 500;
    res.status(statusCode).json({ message: error?.message || '학습 통계를 불러오지 못했습니다.' });
  }
});

module.exports = router;
