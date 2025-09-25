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
  'irrelevant'
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

  try {
    const aggregated = [];
    const context = await aiService.getPassages(documentId);

    for (const type of requestedTypes) {
      const amount = normalizedCounts[type];
      if (!amount) continue;
      let generated = [];

      switch (type) {
        case 'blank':
          generated = await aiService.generateBlank(documentId, amount);
          break;
        case 'grammar':
          generated = await aiService.generateGrammar(documentId, amount);
          await aiService.saveProblems(documentId, 'grammar', generated);
          break;
        case 'vocabulary':
          generated = await aiService.generateVocab(documentId, amount);
          break;
        case 'title':
          generated = await aiService.generateTitle(documentId, amount);
          break;
        case 'theme':
          generated = await aiService.generateTheme(documentId, amount);
          break;
        case 'summary':
          generated = await aiService.generateSummary(documentId, amount);
          await aiService.saveProblems(documentId, 'summary', generated);
          break;
        case 'order':
          generated = buildOrderProblems(context, amount, { orderDifficulty });
          break;
        case 'insertion':
          generated = buildInsertionProblems(context, amount, { insertionDifficulty });
          break;
        case 'irrelevant':
          generated = generateIrrelevantProblems(
            context.passages,
            amount,
            context.document,
            context.parsedContent || {}
          );
          break;
        default:
          generated = [];
      }

      if (!Array.isArray(generated) || !generated.length) {
        throw new Error(`Failed to generate problems for type: ${type}`);
      }

      aggregated.push(...generated);
    }

    const normalizedProblems = normalizeAll(aggregated);
    if (!normalizedProblems.length) {
      return res.status(503).json({ message: 'Failed to build a valid problem set.' });
    }

    await updateUsage(req.user.id, normalizedProblems.length);
    res.json({
      problems: normalizedProblems,
      count: normalizedProblems.length,
      limit: req.dailyLimit
    });
  } catch (error) {
    console.error('[generate/csat-set] error:', error);
    res.status(500).json({ message: 'CSAT set generation failed.' });
  }
});

module.exports = router;