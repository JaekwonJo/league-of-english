const aiService = require('./aiProblemService');
const OrderGenerator = require('../utils/orderProblemGenerator');
const InsertionGenerator = require('../utils/insertionProblemGenerator2');
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
  'implicit',
  'irrelevant'
]);

const SUPPORTED_TYPES = new Set([
  'blank',
  'order',
  'insertion',
  'grammar',
  'vocabulary',
  'title',
  'theme',
  'summary',
  'implicit',
  'irrelevant'
]);

const AI_GENERATOR_MAP = {
  blank: 'generateBlank',
  grammar: 'generateGrammar',
  vocabulary: 'generateVocab',
  title: 'generateTitle',
  theme: 'generateTheme',
  summary: 'generateSummary',
  implicit: 'generateImplicit',
  irrelevant: 'generateIrrelevant'
};

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

function normalizeExportCounts(rawCounts = {}, step = 5, maxTotal = 100) {
  const counts = {};
  let total = 0;
  Object.entries(rawCounts || {}).forEach(([type, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const snapped = Math.max(0, Math.floor(numeric / step) * step);
    if (snapped > 0) {
      const clamped = Math.min(snapped, maxTotal);
      counts[type] = clamped;
      total += clamped;
    }
  });

  if (total > maxTotal) {
    const keys = Object.keys(counts);
    let overflow = total - maxTotal;
    while (overflow > 0 && keys.length) {
      for (const key of keys) {
        if (overflow <= 0) break;
        if (counts[key] >= step) {
          counts[key] -= step;
          overflow -= step;
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

function buildOrderProblems(context, count, options = {}) {
  if (count <= 0) return [];
  return OrderGenerator.generateOrderProblems(
    context.passages,
    count,
    options,
    context.document,
    context.parsedContent
  ) || [];
}

function buildInsertionProblems(context, count, options = {}) {
  if (count <= 0) return [];
  return InsertionGenerator.generateInsertionProblems(
    context.passages,
    count,
    options,
    context.document,
    context.parsedContent
  ) || [];
}

function createProblemError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function handleAiBackedType({
  type,
  amount,
  documentId,
  docTitle,
  userId,
  usedProblemIds,
  pushProgress,
  appendProblems
}) {
  let delivered = 0;
  const cache = await aiService.fetchCached(documentId, type, amount, {
    excludeIds: Array.from(usedProblemIds),
    userId
  });
  delivered += appendProblems(cache);
  pushProgress('cache_fetch', type, {
    delivered: Array.isArray(cache) ? cache.length : 0,
    requested: amount
  });

  const remaining = amount - delivered;
  if (remaining <= 0) {
    return delivered;
  }

  const generatorName = AI_GENERATOR_MAP[type];
  if (!generatorName || typeof aiService[generatorName] !== 'function') {
    pushProgress('ai_generated', type, { delivered: 0, requested: remaining, skipped: true });
    return delivered;
  }

  const generatedBatch = await aiService[generatorName](documentId, remaining);
  const savedBatch = await aiService.saveProblems(documentId, type, generatedBatch, { docTitle });
  const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
  delivered += appendProblems(usable);
  pushProgress('ai_generated', type, {
    delivered: Array.isArray(usable) ? usable.length : 0,
    requested: remaining
  });
  return delivered;
}

async function handleOrderType({
  type,
  amount,
  documentId,
  userId,
  usedProblemIds,
  pushProgress,
  appendProblems,
  context,
  orderDifficulty
}) {
  let delivered = 0;
  const cache = await aiService.fetchCached(documentId, type, amount, {
    excludeIds: Array.from(usedProblemIds),
    userId
  });
  const cachedCount = Array.isArray(cache) ? cache.length : 0;
  if (cachedCount) {
    pushProgress('cache_fetch', type, { delivered: cachedCount, requested: amount });
  }
  delivered += appendProblems(cache);

  const remaining = amount - delivered;
  if (remaining > 0) {
    const generated = buildOrderProblems(context, remaining, { orderDifficulty });
    delivered += appendProblems(generated);
    pushProgress('static_generated', type, {
      delivered: Array.isArray(generated) ? generated.length : 0,
      requested: remaining
    });
  }
  return delivered;
}

async function handleInsertionType({
  type,
  amount,
  documentId,
  userId,
  usedProblemIds,
  pushProgress,
  appendProblems,
  context,
  insertionDifficulty
}) {
  let delivered = 0;
  const cache = await aiService.fetchCached(documentId, type, amount, {
    excludeIds: Array.from(usedProblemIds),
    userId
  });
  const cachedCount = Array.isArray(cache) ? cache.length : 0;
  if (cachedCount) {
    pushProgress('cache_fetch', type, { delivered: cachedCount, requested: amount });
  }
  delivered += appendProblems(cache);

  const remaining = amount - delivered;
  if (remaining > 0) {
    const generated = buildInsertionProblems(context, remaining, { insertionDifficulty });
    delivered += appendProblems(generated);
    pushProgress('static_generated', type, {
      delivered: Array.isArray(generated) ? generated.length : 0,
      requested: remaining
    });
  }
  return delivered;
}

async function generateCsatSet({
  documentId,
  counts = {},
  orderDifficulty = 'advanced',
  insertionDifficulty = 'advanced',
  orderMode = 'random',
  userId
}) {
  const normalizedCounts = normalizeTypeCounts(counts);
  const requestedTypes = Object.keys(normalizedCounts).filter((type) => normalizedCounts[type] > 0);

  if (!requestedTypes.length) {
    throw createProblemError('No problem counts requested.', 400);
  }

  for (const type of requestedTypes) {
    if (!SUPPORTED_TYPES.has(type)) {
      throw createProblemError(`Unsupported problem type: ${type}`, 400);
    }
  }

  const needsOpenAI = requestedTypes.some((type) => OPENAI_REQUIRED_TYPES.has(type));
  if (needsOpenAI && !aiService.getOpenAI()) {
    throw createProblemError('AI generator unavailable', 503);
  }

  const context = await aiService.getPassages(documentId);
  const docTitle = context?.document?.title || context?.document?.name || null;

  const aggregated = [];
  const usedProblemIds = new Set();
  const progressLog = [];
  const failures = [];

  const pushProgress = (stage, type, details = {}) => {
    progressLog.push({
      stage,
      type,
      timestamp: new Date().toISOString(),
      ...details
    });
  };

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
    let delivered = 0;
    pushProgress('type_start', type, { requested: amount });

    if (AI_GENERATOR_MAP[type]) {
      delivered = await handleAiBackedType({
        type,
        amount,
        documentId,
        docTitle,
        userId,
        usedProblemIds,
        pushProgress,
        appendProblems
      });
    } else if (type === 'order') {
      delivered = await handleOrderType({
        type,
        amount,
        documentId,
        userId,
        usedProblemIds,
        pushProgress,
        appendProblems,
        context,
        orderDifficulty
      });
    } else if (type === 'insertion') {
      delivered = await handleInsertionType({
        type,
        amount,
        documentId,
        userId,
        usedProblemIds,
        pushProgress,
        appendProblems,
        context,
        insertionDifficulty
      });
    }

    if (delivered < amount) {
      failures.push({
        type,
        delivered,
        requested: amount,
        reason: 'partial_generation'
      });
    }

    pushProgress('type_complete', type, {
      delivered,
      requested: amount,
      status: delivered < amount ? 'partial' : 'complete'
    });
  }

  if (!aggregated.length) {
    throw createProblemError('Failed to prepare enough problems', 503);
  }

  const normalizedProblems = normalizeAll(aggregated);
  let finalProblems = normalizedProblems;
  if (orderMode === 'random') {
    finalProblems = [...normalizedProblems];
    for (let i = finalProblems.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalProblems[i], finalProblems[j]] = [finalProblems[j], finalProblems[i]];
    }
  }

  pushProgress('all_complete', 'all', { delivered: finalProblems.length });

  const exposureWhitelist = new Set(['blank', 'grammar', 'vocabulary', 'title', 'theme', 'summary', 'implicit', 'irrelevant']);
  const exposureIds = [...new Set(finalProblems
    .filter((problem) => problem && exposureWhitelist.has(problem.type))
    .map((problem) => Number(problem.id))
    .filter((id) => Number.isInteger(id) && id > 0))];

  if (exposureIds.length && Number.isInteger(userId) && userId > 0) {
    await aiService.markExposures(userId, exposureIds);
  }

  return {
    problems: finalProblems,
    count: finalProblems.length,
    progressLog,
    failures
  };
}

module.exports = {
  normalizeTypeCounts,
  normalizeExportCounts,
  generateCsatSet
};
