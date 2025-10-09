const express = require('express');
const router = express.Router();

const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
const aiService = require('../services/aiProblemService');
const database = require('../models/database');
const { normalizeAll } = require('../utils/csatProblemNormalizer');
const studyService = require('../services/studyService');
const { createProblemsPdf } = require('../utils/pdfExporter');
const problemSetService = require('../services/problemSetService');

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

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

    const normalizedTypes = Array.isArray(types)
      ? types.map((type) => String(type || '').trim()).filter((type) => type.length)
      : [];
    const normalizedCounts = problemSetService.normalizeExportCounts(counts);
    const totalFromCounts = Object.values(normalizedCounts).reduce((sum, value) => sum + value, 0);
    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 0, 0), EXPORT_MAX_TOTAL);
    const finalLimit = totalFromCounts > 0 ? Math.min(totalFromCounts, EXPORT_MAX_TOTAL) : Math.min(Math.max(numericLimit, 0), EXPORT_MAX_TOTAL);

    if (!finalLimit || finalLimit < 5) {
      return res.status(400).json({ message: '내보낼 문제 수를 5문제 이상 선택해 주세요.' });
    }

    const aggregated = [];
    const seenIds = new Set();

    if (totalFromCounts > 0) {
      for (const [type, count] of Object.entries(normalizedCounts)) {
        if (count <= 0) continue;
        const fetched = await aiService.listProblemsForExport({
          documentId,
          types: [type],
          limit: count,
          includeGeneratedOnly: false
        });
        fetched.forEach((problem) => {
          if (problem && problem.id && !seenIds.has(problem.id)) {
            aggregated.push(problem);
            seenIds.add(problem.id);
          }
        });
      }
    } else {
      const fetched = await aiService.listProblemsForExport({
        documentId,
        types: normalizedTypes,
        limit: finalLimit,
        includeGeneratedOnly: false
      });
      fetched.forEach((problem) => {
        if (problem && problem.id && !seenIds.has(problem.id)) {
          aggregated.push(problem);
          seenIds.add(problem.id);
        }
      });
    }

    if (!aggregated.length) {
      return res.status(404).json({ message: 'PDF로 내보낼 저장된 문제가 아직 부족해요.' });
    }

    const problems = aggregated.slice(0, finalLimit);

    const problemIds = problems
      .map((problem) => Number(problem.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    try {
      await aiService.recordExportHistory({
        userId: req.user.id,
        documentId,
        types: normalizedTypes.length ? normalizedTypes : Object.keys(normalizedCounts),
        counts: normalizedCounts,
        problemIds,
        total: problems.length,
        includeSolutions
      });
    } catch (historyError) {
      console.warn('[problems/export/pdf] history log skipped:', historyError?.message || historyError);
    }

    const filename = `loe-problems-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = createProblemsPdf(problems, {
      title: title || 'League of English 문제 세트',
      subtitle: subtitle || (documentId ? `문서 ID ${documentId}` : null),
      includeSolutions
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
    if (!res.headersSent) {
      res.status(500).json({ message: '문제 PDF를 생성하지 못했어요. 잠시 후 다시 시도해 주세요.' });
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
    const rawTypes = req.query.types;
    let types = [];
    if (Array.isArray(rawTypes)) {
      types = rawTypes.map((type) => String(type || '').trim()).filter((type) => type.length);
    } else if (typeof rawTypes === 'string' && rawTypes.trim()) {
      types = rawTypes.split(',').map((type) => type.trim()).filter((type) => type.length);
    }

    const rawDifficulties = req.query.difficulties;
    let difficulties = [];
    if (Array.isArray(rawDifficulties)) {
      difficulties = rawDifficulties.map((item) => String(item || '').trim().toLowerCase()).filter((item) => item.length);
    } else if (typeof rawDifficulties === 'string' && rawDifficulties.trim()) {
      difficulties = rawDifficulties
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length);
    }

    const problems = await aiService.listProblemsForExport({
      documentId,
      types,
      difficulties,
      limit,
      includeGeneratedOnly,
      randomize: false
    });

    const normalized = normalizeAll(problems);

    let summaryQuery = 'SELECT type, COUNT(*) AS total FROM problems WHERE 1=1';
    const summaryParams = [];
    if (documentId) {
      summaryQuery += ' AND document_id = ?';
      summaryParams.push(documentId);
    }
    if (includeGeneratedOnly) {
      summaryQuery += ' AND is_ai_generated = 1';
    }
    if (difficulties.length) {
      const placeholders = difficulties.map(() => '?').join(',');
      summaryQuery += ` AND LOWER(difficulty) IN (${placeholders})`;
      summaryParams.push(...difficulties);
    }
    summaryQuery += ' GROUP BY type';

    const summaryRows = await database.all(summaryQuery, summaryParams);

    const summary = summaryRows.reduce((acc, row) => {
      acc[row.type] = Number(row.total) || 0;
      return acc;
    }, {});

    res.json({
      count: normalized.length,
      total: normalized.length,
      problems: normalized,
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
    const updated = await aiService.saveProblemNote(problemId, req.user.id, note);
    const normalized = normalizeAll([updated]);
    res.json({ problem: normalized[0] || null });
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

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const rows = await database.all(
      'SELECT h.*, u.name AS user_name, u.username AS user_username, d.title AS document_title ' +
        'FROM problem_export_history h ' +
        'LEFT JOIN users u ON u.id = h.user_id ' +
        'LEFT JOIN documents d ON d.id = h.document_id ' +
        'ORDER BY datetime(h.created_at) DESC, h.id DESC LIMIT ?',
      [limit]
    );

    const history = rows.map((row) => ({
      id: row.id,
      user: {
        id: row.user_id,
        name: row.user_name || row.user_username || '관리자'
      },
      documentId: row.document_id,
      documentTitle: row.document_title || null,
      total: Number(row.total) || 0,
      includeSolutions: row.include_solutions === 1 || row.include_solutions === '1',
      problemIds: safeJsonParse(row.problem_ids, []),
      types: safeJsonParse(row.types, []),
      counts: safeJsonParse(row.counts, {}),
      createdAt: row.created_at
    }));

    res.json({ history });
  } catch (error) {
    console.error('[problems/export/history] error:', error);
    res.status(500).json({ message: 'PDF 내보내기 내역을 불러오지 못했어요.' });
  }
});

router.get('/problems/review-queue', verifyToken, async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit, 10) || 0, 0) || 20;
    const queue = await aiService.listReviewQueueForUser(req.user.id, { limit });
    const normalized = normalizeAll(queue.problems || []);
    res.json({
      total: queue.total,
      count: normalized.length,
      problems: normalized
    });
  } catch (error) {
    console.error('[problems/review-queue] error:', error);
    res.status(500).json({ message: '복습 대기열을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.post('/problems/review-session', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 0, 0) || 5, 20);
    const queue = await aiService.listReviewQueueForUser(req.user.id, { limit: limit * 4 });
    const selected = (queue.problems || []).slice(0, limit);
    if (!selected.length) {
      return res.status(404).json({ message: '복습할 오답 문제가 없어요. 새로운 문제를 풀어볼까요?' });
    }

    const normalized = normalizeAll(selected);
    const exposureIds = selected
      .map((problem) => Number(problem.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (exposureIds.length) {
      await aiService.markExposures(req.user.id, exposureIds);
    }

    res.json({
      total: queue.total,
      count: normalized.length,
      problems: normalized
    });
  } catch (error) {
    console.error('[problems/review-session] error:', error);
    res.status(500).json({ message: '복습 세트를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.get('/problems/stats', verifyToken, async (req, res) => {
  try {
    const stats = await studyService.getUserStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('[problems/stats] error:', error);
    res.status(500).json({ message: '학습 통계를 불러오지 못했습니다.' });
  }
});

module.exports = router;
