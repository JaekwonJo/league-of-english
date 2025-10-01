const express = require('express');
const router = express.Router();

const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
const aiService = require('../services/aiProblemService');
const database = require('../models/database');
const OrderGenerator = require('../utils/orderProblemGenerator');
const InsertionGenerator = require('../utils/insertionProblemGenerator2');
const { normalizeAll } = require('../utils/csatProblemNormalizer');
const studyService = require('../services/studyService');
const { createProblemsPdf } = require('../utils/pdfExporter');

const STEP_SIZE = 5;
const MAX_TOTAL = 20;
const OPENAI_REQUIRED_TYPES = new Set([
  'blank',
  'grammar',
  'vocabulary',
  'title',
  'theme',
  'summary',
  'implicit',
  'irrelevant'
]);

const EXPORT_STEP = 5;
const EXPORT_MAX_TOTAL = 100;

function snapToStep(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.floor(numeric / STEP_SIZE) * STEP_SIZE);
}

function normalizeTypeCounts(rawCounts = {}) {
  const counts = {};
  let total = 0;
  Object.entries(rawCounts).forEach(([type, value]) => {
    const snapped = snapToStep(value);
    if (snapped > 0) {
      const clamped = Math.min(snapped, MAX_TOTAL);
      counts[type] = clamped;
      total += clamped;
    }
  });

  if (total > MAX_TOTAL) {
    const types = Object.keys(counts);
    let overflow = total - MAX_TOTAL;
    while (overflow > 0 && types.length) {
      for (const type of types) {
        if (overflow <= 0) break;
        if (counts[type] >= STEP_SIZE) {
          counts[type] -= STEP_SIZE;
          overflow -= STEP_SIZE;
        }
      }
      if (types.every((type) => counts[type] === 0)) break;
    }
    Object.keys(counts).forEach((type) => {
      if (counts[type] <= 0) delete counts[type];
    });
  }

  return counts;
}

function normalizeExportCounts(rawCounts = {}) {
  const counts = {};
  let total = 0;
  Object.entries(rawCounts || {}).forEach(([type, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const snapped = Math.max(0, Math.floor(numeric / EXPORT_STEP) * EXPORT_STEP);
    if (snapped > 0) {
      const clamped = Math.min(snapped, EXPORT_MAX_TOTAL);
      counts[type] = clamped;
      total += clamped;
    }
  });

  if (total > EXPORT_MAX_TOTAL) {
    const keys = Object.keys(counts);
    let overflow = total - EXPORT_MAX_TOTAL;
    while (overflow > 0 && keys.length) {
      for (const key of keys) {
        if (overflow <= 0) break;
        if (counts[key] >= EXPORT_STEP) {
          counts[key] -= EXPORT_STEP;
          overflow -= EXPORT_STEP;
        }
      }
      if (keys.every((key) => counts[key] <= 0)) break;
    }
    Object.keys(counts).forEach((key) => {
      if (counts[key] <= 0) {
        delete counts[key];
      }
    });
  }

  return counts;
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function buildOrderProblems(context, count, options = {}) {
  if (count <= 0) return [];
  return (
    OrderGenerator.generateOrderProblems(
      context.passages,
      count,
      options,
      context.document,
      context.parsedContent
    ) || []
  );
}

function buildInsertionProblems(context, count, options = {}) {
  if (count <= 0) return [];
  return (
    InsertionGenerator.generateInsertionProblems(
      context.passages,
      count,
      options,
      context.document,
      context.parsedContent
    ) || []
  );
}

const SUPPORTED_TYPES = new Set([
  'blank',
  'order',
  'insertion',
  'grammar',
  'vocabulary',
  'title',
  'theme',
  'summary',
  'irrelevant',
  'implicit'
]);

router.post('/generate/csat-set', verifyToken, checkDailyLimit, async (req, res) => {
  const {
    documentId,
    counts = {},
    orderDifficulty = 'advanced',
    insertionDifficulty = 'advanced'
  } = req.body || {};

  if (!documentId) {
    return res.status(400).json({ message: 'documentId is required.' });
  }

  const normalizedCounts = normalizeTypeCounts(counts);
  const requestedTypes = Object.keys(normalizedCounts).filter((type) => normalizedCounts[type] > 0);

  if (!requestedTypes.length) {
    return res.status(400).json({ message: 'No problem counts requested.' });
  }

  for (const type of requestedTypes) {
    if (!SUPPORTED_TYPES.has(type)) {
      return res.status(400).json({ message: `Unsupported problem type: ${type}` });
    }
  }

  const needsOpenAI = requestedTypes.some((type) => OPENAI_REQUIRED_TYPES.has(type));
  if (needsOpenAI && !aiService.getOpenAI()) {
    return res.status(503).json({
      message: 'AI 생성기가 준비되지 않았어요. OpenAI API 키를 설정하거나 해당 유형을 제외하고 다시 시도해 주세요.'
    });
  }

  try {
    const aggregated = [];
    const usedProblemIds = new Set();
    const context = await aiService.getPassages(documentId);
    const docTitle = context?.document?.title || context?.document?.name || null;

    const appendProblems = (list) => {
      let added = 0;
      if (!Array.isArray(list)) return added;
      for (const problem of list) {
        if (!problem || typeof problem !== 'object') continue;
        const identifier = problem.id || problem.originalId || problem.problemId || null;
        const key = identifier !== null && identifier !== undefined ? String(identifier) : null;
        if (key) {
          if (usedProblemIds.has(key)) continue;
          usedProblemIds.add(key);
        }
        aggregated.push(problem);
        added += 1;
      }
      return added;
    };

    for (const type of requestedTypes) {
      const amount = normalizedCounts[type];
      if (!amount) continue;
      let addedForType = 0;

      switch (type) {
        case 'blank': {
          const cached = await aiService.fetchCached(documentId, 'blank', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateBlank(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'blank', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'grammar': {
          const cached = await aiService.fetchCached(documentId, 'grammar', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateGrammar(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'grammar', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'vocabulary': {
          const cached = await aiService.fetchCached(documentId, 'vocabulary', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateVocab(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'vocabulary', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'title': {
          const cached = await aiService.fetchCached(documentId, 'title', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateTitle(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'title', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'theme': {
          const cached = await aiService.fetchCached(documentId, 'theme', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateTheme(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'theme', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'summary': {
          const cached = await aiService.fetchCached(documentId, 'summary', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateSummary(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'summary', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'implicit': {
          const cached = await aiService.fetchCached(documentId, 'implicit', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateImplicit(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'implicit', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        case 'order': {
          const generated = buildOrderProblems(context, amount, { orderDifficulty });
          addedForType += appendProblems(generated);
          break;
        }
        case 'insertion': {
          const generated = buildInsertionProblems(context, amount, { insertionDifficulty });
          addedForType += appendProblems(generated);
          break;
        }
        case 'irrelevant': {
          const cached = await aiService.fetchCached(documentId, 'irrelevant', amount, {
            excludeIds: Array.from(usedProblemIds),
            userId: req.user.id
          });
          addedForType += appendProblems(cached);
          let remaining = amount - addedForType;

          if (remaining > 0) {
            const generatedBatch = await aiService.generateIrrelevant(documentId, remaining);
            const savedBatch = await aiService.saveProblems(documentId, 'irrelevant', generatedBatch, { docTitle });
            const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
            addedForType += appendProblems(usable);
          }

          break;
        }
        default:
          break;
      }

      if (addedForType < amount) {
        throw new Error(`Failed to prepare enough problems for type: ${type}`);
      }
    }

    const normalizedProblems = normalizeAll(aggregated);
    if (!normalizedProblems.length) {
      return res.status(503).json({ message: 'Failed to build a valid problem set.' });
    }

    const exposureWhitelist = new Set(['blank', 'grammar', 'vocabulary', 'title', 'theme', 'summary', 'implicit', 'irrelevant']);
    const exposureIds = [...new Set(normalizedProblems
      .filter((problem) => problem && exposureWhitelist.has(problem.type))
      .map((problem) => Number(problem.id))
      .filter((id) => Number.isInteger(id) && id > 0))];

    if (exposureIds.length) {
      await aiService.markExposures(req.user.id, exposureIds);
    }

    await updateUsage(req.user.id, normalizedProblems.length);
    res.json({
      problems: normalizedProblems,
      count: normalizedProblems.length,
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
    const normalizedCounts = normalizeExportCounts(counts);
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
