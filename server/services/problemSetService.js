const aiService = require('./aiProblemService');
const OrderGenerator = require('../utils/orderProblemGenerator');
const InsertionGenerator = require('../utils/insertionProblemGenerator2');
const { normalizeAll } = require('../utils/csatProblemNormalizer');
const { buildFallbackProblems } = require('../utils/fallbackProblemFactory');
const { ensureSourceLabel } = require('./ai-problem/shared');

const STEP_SIZE = 1;
const MAX_TOTAL = 10;
const SUPPORTED_TYPES = new Set([
  'blank',
  'order',
  'insertion',
  'grammar',
  'vocabulary',
  'title',
  'theme',
  'summary',
  'implicit'
]);

const AI_GENERATOR_MAP = {
  blank: 'generateBlank',
  grammar: 'generateGrammar',
  vocabulary: 'generateVocab',
  title: 'generateTitle',
  theme: 'generateTheme',
  summary: 'generateSummary',
  implicit: 'generateImplicit'
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

async function deliverFallbackProblems({
  type,
  count,
  documentId,
  docTitle,
  documentCode,
  reasonTag = 'fallback',
  appendProblems,
  pushProgress,
  registerFailure,
  context
}) {
  const normalizedCount = Math.max(1, Number(count) || 1);
  const fallbackList = await buildFallbackProblems({
    type,
    count: normalizedCount,
    docTitle,
    documentCode,
    reasonTag,
    passages: context?.passages,
    context
  });
  if (!fallbackList.length) {
    return 0;
  }

  let persisted = [];
  try {
    persisted = await aiService.saveProblems(documentId, type, fallbackList, {
      docTitle,
      documentCode,
      contextSnapshot: context
    });
  } catch (error) {
    console.warn('[problemSet] failed to persist fallback problems:', error?.message || error);
  }

  const usable = Array.isArray(persisted) && persisted.length ? persisted : fallbackList;
  const added = typeof appendProblems === 'function' ? appendProblems(usable) : usable.length;

  if (typeof pushProgress === 'function') {
    pushProgress('fallback_generated', type, {
      delivered: added,
      requested: normalizedCount,
      reason: reasonTag
    });
  }
  if (typeof registerFailure === 'function' && added) {
    registerFailure(type, reasonTag);
  }

  return added;
}


async function handleAiBackedType({
  type,
  amount,
  documentId,
  docTitle,
  documentCode,
  userId,
  usedProblemIds,
  pushProgress,
  appendProblems,
  registerFailure,
  openaiAvailable,
  context
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

  let remaining = amount - delivered;
  if (remaining <= 0) {
    return delivered;
  }

  const fallbackArgs = {
    type,
    documentId,
    docTitle,
    documentCode,
    appendProblems,
    pushProgress,
    registerFailure,
    context
  };

  if (!openaiAvailable) {
    return delivered + await deliverFallbackProblems({
      ...fallbackArgs,
      count: remaining,
      reasonTag: 'openai_unavailable'
    });
  }

  const generatorName = AI_GENERATOR_MAP[type];
  if (!generatorName || typeof aiService[generatorName] !== 'function') {
    return delivered + await deliverFallbackProblems({
      ...fallbackArgs,
      count: remaining,
      reasonTag: 'generator_missing'
    });
  }

  try {
    const generatedBatch = await aiService[generatorName](documentId, remaining);
    const savedBatch = await aiService.saveProblems(documentId, type, generatedBatch, {
      docTitle,
      documentCode
    });
    const usable = Array.isArray(savedBatch) && savedBatch.length ? savedBatch : generatedBatch;
    const added = appendProblems(usable);
    delivered += added;
    pushProgress('ai_generated', type, {
      delivered: added,
      requested: remaining
    });

    remaining = amount - delivered;
    if (remaining > 0) {
      delivered += await deliverFallbackProblems({
        ...fallbackArgs,
        count: remaining,
        reasonTag: 'partial_generation'
      });
    }
    return delivered;
  } catch (error) {
    const message = String(error?.message || 'unknown error');
    pushProgress('ai_failed', type, {
      delivered: 0,
      requested: remaining,
      reason: message
    });
    if (typeof registerFailure === 'function') {
      registerFailure(type, message);
    }
    return delivered + await deliverFallbackProblems({
      ...fallbackArgs,
      count: remaining,
      reasonTag: 'ai_generation_error'
    });
  }
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
  orderDifficulty,
  documentCode,
  docTitle,
  registerFailure
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

  let remaining = amount - delivered;
  if (remaining > 0) {
    const generated = buildOrderProblems(context, remaining, { orderDifficulty });
    const added = appendProblems(generated);
    delivered += added;
    pushProgress('static_generated', type, {
      delivered: Array.isArray(generated) ? generated.length : added,
      requested: remaining
    });
  }

  remaining = amount - delivered;
  if (remaining > 0) {
    delivered += await deliverFallbackProblems({
      type,
      count: remaining,
      documentId,
      docTitle: docTitle,
      documentCode,
      appendProblems,
      pushProgress,
      registerFailure,
      reasonTag: 'order_fallback',
      context
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
  insertionDifficulty,
  documentCode,
  docTitle,
  registerFailure
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

  let remaining = amount - delivered;
  if (remaining > 0) {
    const generated = buildInsertionProblems(context, remaining, { insertionDifficulty });
    const added = appendProblems(generated);
    delivered += added;
    pushProgress('static_generated', type, {
      delivered: Array.isArray(generated) ? generated.length : added,
      requested: remaining
    });
  }

  remaining = amount - delivered;
  if (remaining > 0) {
    delivered += await deliverFallbackProblems({
      type,
      count: remaining,
      documentId,
      docTitle,
      documentCode,
      appendProblems,
      pushProgress,
      registerFailure,
      reasonTag: 'insertion_fallback',
      context
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
  const totalRequested = requestedTypes.reduce((sum, type) => sum + (normalizedCounts[type] || 0), 0);

  if (!requestedTypes.length) {
    throw createProblemError('문항 유형과 개수를 선택해 주세요.', 400);
  }

  if (totalRequested > MAX_TOTAL) {
    throw createProblemError(`한 번에 최대 ${MAX_TOTAL}문제까지만 요청할 수 있어요.`, 400);
  }

  for (const type of requestedTypes) {
    if (!SUPPORTED_TYPES.has(type)) {
      throw createProblemError(`Unsupported problem type: ${type}`, 400);
    }
  }

  const context = await aiService.getPassages(documentId);
  const documentCode =
    context?.document?.code ||
    context?.document?.slug ||
    context?.document?.external_id ||
    context?.document?.reference ||
    null;
  const docTitle =
    context?.document?.title ||
    documentCode ||
    context?.document?.name ||
    null;

  const openaiAvailable = Boolean(aiService.getOpenAI());

  const aggregated = [];
  const usedProblemIds = new Set();
  const progressLog = [];
  const failures = [];
  const failureMessages = new Map();

  const pushProgress = (stage, type, details = {}) => {
    progressLog.push({
      stage,
      type,
      timestamp: new Date().toISOString(),
      ...details
    });
  };

  const registerFailure = (failureType, reason) => {
    if (!failureType || !reason) return;
    if (!failureMessages.has(failureType)) {
      failureMessages.set(failureType, reason);
    }
  };

  const appendProblems = (list) => {
    let added = 0;
    if (!Array.isArray(list)) return added;

    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const identifier = entry.id || entry.originalId || entry.problemId || null;
      const key = identifier !== null && identifier !== undefined ? String(identifier) : null;
      if (key) {
        if (usedProblemIds.has(key)) continue;
        usedProblemIds.add(key);
      }

      const sequence = aggregated.length + added + 1;
      const sourceContextTitle = docTitle || entry.metadata?.documentTitle || entry.sourceLabel || documentCode;
      const appliedLabel = ensureSourceLabel(entry.sourceLabel, {
        docTitle: sourceContextTitle,
        documentCode,
        sequence
      });

      const metadata = { ...(entry.metadata || {}), generator: entry.metadata?.generator || 'openai' };
      metadata.sourceLabel = metadata.sourceLabel || appliedLabel;
      metadata.sequenceNo = sequence;
      if (!metadata.documentTitle && sourceContextTitle) {
        metadata.documentTitle = sourceContextTitle;
      }

      const normalized = {
        ...entry,
        sourceLabel: appliedLabel,
        metadata
      };

      aggregated.push(normalized);
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
        appendProblems,
        documentCode,
        registerFailure,
        openaiAvailable,
        context
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
        orderDifficulty,
        documentCode,
        docTitle,
        registerFailure
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
        insertionDifficulty,
        documentCode,
        docTitle,
        registerFailure
      });
    }

    if (delivered < amount) {
      failures.push({
        type,
        delivered,
        requested: amount,
        reason: failureMessages.get(type) || 'partial_generation'
      });
    }

    pushProgress('type_complete', type, {
      delivered,
      requested: amount,
      status: delivered < amount ? 'partial' : 'complete'
    });
  }

  if (!aggregated.length) {
    const fallbackType = requestedTypes[0] || 'summary';
    await deliverFallbackProblems({
      type: fallbackType,
      count: 1,
      documentId,
      docTitle,
      documentCode,
      appendProblems,
      pushProgress,
      registerFailure,
      reasonTag: 'final_rescue',
      context
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

  const exposureWhitelist = new Set(['blank', 'grammar', 'vocabulary', 'title', 'theme', 'summary', 'implicit']);
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
