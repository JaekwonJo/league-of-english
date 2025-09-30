const express = require('express');
const router = express.Router();

const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
const aiService = require('../services/aiProblemService');
const OrderGenerator = require('../utils/orderProblemGenerator');
const InsertionGenerator = require('../utils/insertionProblemGenerator2');
const { generateIrrelevantProblems } = require('../utils/irrelevantSentenceGenerator');
const { normalizeAll } = require('../utils/csatProblemNormalizer');

const STEP_SIZE = 5;
const MAX_TOTAL = 20;
const OPENAI_REQUIRED_TYPES = new Set([
  'blank',
  'grammar',
  'vocabulary',
  'title',
  'theme',
  'summary',
  'implicit'
]);

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
          const generated = generateIrrelevantProblems(
            context.passages,
            amount,
            context.document,
            context.parsedContent || {}
          );
          addedForType += appendProblems(generated);
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

    const exposureWhitelist = new Set(['blank', 'grammar', 'vocabulary', 'title', 'theme', 'summary', 'implicit']);
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

module.exports = router;
