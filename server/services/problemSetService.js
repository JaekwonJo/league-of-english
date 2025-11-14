const aiService = require('./aiProblemService');
const OrderGenerator = require('../utils/orderProblemGenerator');
let InsertionGenerator;
try { InsertionGenerator = require('../utils/insertionProblemGenerator2'); }
catch { InsertionGenerator = require('../utils/insertionProblemGenerator3'); }
const { normalizeAll } = require('../utils/csatProblemNormalizer');
const { buildFallbackProblems } = require('../utils/fallbackProblemFactory');
const { ensureSourceLabel } = require('./ai-problem/shared');

// Time budget (ms) for AI-backed generation before falling back
const AI_TIME_BUDGET_MS = Number(process.env.LOE_AIGEN_BUDGET_MS || 12000);
const ENFORCE_AI_ONLY = /^(1|true|yes)$/i.test(String(process.env.LOE_ENFORCE_AI_ONLY || ''));

function withTimeout(promise, timeoutMs, onTimeout) {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('ai_generation_time_budget_exceeded');
      err.code = 'TIME_BUDGET_EXCEEDED';
      if (typeof onTimeout === 'function') {
        try { onTimeout(); } catch {}
      }
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise
  ]);
}

const STEP_SIZE = 1;
const NON_AI_TYPES = new Set(['order', 'insertion']);
const MAX_NON_AI_PER_TYPE = 10;
const MAX_AI_TOTAL = Number.parseInt(process.env.LOE_AI_TYPE_TOTAL_LIMIT, 10) || 5;
const MAX_TOTAL = (MAX_NON_AI_PER_TYPE * NON_AI_TYPES.size) + MAX_AI_TOTAL;
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
    const normalizedType = String(type || '').trim();
    if (!SUPPORTED_TYPES.has(normalizedType)) return;
    const snapped = snapToStep(value);
    if (snapped <= 0) return;

    const isNonAi = NON_AI_TYPES.has(normalizedType);
    const perTypeLimit = isNonAi ? MAX_NON_AI_PER_TYPE : Math.min(MAX_AI_TOTAL, MAX_TOTAL);
    const clamped = Math.min(snapped, perTypeLimit);
    if (clamped > 0) {
      counts[normalizedType] = clamped;
      total += clamped;
    }
  });

  const aiTypes = Object.keys(counts).filter((key) => AI_GENERATOR_MAP[key]);
  let aiTotal = aiTypes.reduce((sum, key) => sum + counts[key], 0);
  if (aiTotal > MAX_AI_TOTAL) {
    let overflow = aiTotal - MAX_AI_TOTAL;
    while (overflow > 0 && aiTypes.length) {
      let reduced = false;
      for (const type of aiTypes) {
        if (overflow <= 0) break;
        const previous = counts[type] || 0;
        if (previous <= 0) continue;
        const next = Math.max(0, previous - STEP_SIZE);
        const delta = previous - next;
        if (delta <= 0) continue;
        counts[type] = next;
        overflow -= delta;
        total -= delta;
        reduced = true;
      }
      if (!reduced) break;
    }
    aiTypes.forEach((type) => {
      if (!counts[type] || counts[type] <= 0) {
        delete counts[type];
      }
    });
  }

  if (total > MAX_TOTAL) {
    let overflow = total - MAX_TOTAL;
    const orderedTypes = Object.keys(counts).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
    while (overflow > 0 && orderedTypes.length) {
      let trimmed = false;
      for (const type of orderedTypes) {
        if (overflow <= 0) break;
        const previous = counts[type] || 0;
        if (previous <= 0) continue;
        const next = Math.max(0, previous - STEP_SIZE);
        const delta = previous - next;
        if (delta <= 0) continue;
        counts[type] = next;
        overflow -= delta;
        total -= delta;
        trimmed = true;
      }
      if (!trimmed) break;
    }
  }

  Object.keys(counts).forEach((type) => {
    if (counts[type] <= 0) {
      delete counts[type];
    }
  });

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
    userId,
    passages: context.passages
  });
  delivered += appendProblems(cache);
  pushProgress('cache_fetch', type, {
    delivered: Array.isArray(cache) ? cache.length : 0,
    requested: amount
  });

  // Try golden-set (pre-authored) problems if available (skip when AI-only enforced)
  if (!ENFORCE_AI_ONLY) {
    try {
      if (delivered < amount) {
        const { getGoldenProblems } = require('./goldenSetService');
        const golden = getGoldenProblems(context?.document, type, amount - delivered, { passages: context.passages });
        if (Array.isArray(golden) && golden.length) {
          const added = appendProblems(golden.map((p, idx) => ({
            ...p,
            id: p.id || `${type}_golden_${Date.now()}_${idx}`,
            metadata: { ...(p.metadata || {}), generator: p.metadata?.generator || 'golden' }
          })));
          delivered += added;
          pushProgress('golden_loaded', type, { delivered: added, requested: amount });
        }
      }
    } catch (e) {
      // non-fatal
      pushProgress('golden_error', type, { message: String(e?.message || e) });
    }
  }

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
    if (ENFORCE_AI_ONLY) {
      throw createProblemError('AI-only mode: OpenAI unavailable', 503);
    }
    return delivered + await deliverFallbackProblems({
      ...fallbackArgs,
      count: remaining,
      reasonTag: 'openai_unavailable'
    });
  }

  const generatorName = AI_GENERATOR_MAP[type];
  if (!generatorName || typeof aiService[generatorName] !== 'function') {
    if (ENFORCE_AI_ONLY) {
      throw createProblemError(`AI-only mode: generator missing for ${type}`, 500);
    }
    return delivered + await deliverFallbackProblems({
      ...fallbackArgs,
      count: remaining,
      reasonTag: 'generator_missing'
    });
  }

  try {
    let generatedBatch;
    // 모든 AI 생성기에 선택된 지문을 전달해, 반드시 해당 원문만 사용하도록 통일
    const genOptions = { passages: context.passages };
    generatedBatch = await withTimeout(
      aiService[generatorName](documentId, remaining, genOptions),
      AI_TIME_BUDGET_MS
    );
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
      if (ENFORCE_AI_ONLY) {
        throw createProblemError('AI-only mode: partial generation (insufficient AI output)', 502);
      }
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
    try {
      const generated = buildOrderProblems(context, remaining, { orderDifficulty });
      const added = appendProblems(generated);
      delivered += added;
      pushProgress('static_generated', type, {
        delivered: Array.isArray(generated) ? generated.length : added,
        requested: remaining
      });
    } catch (genError) {
      pushProgress('static_failed', type, { delivered: 0, requested: remaining, reason: String(genError?.message || genError) });
    }
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
    try {
      const generated = buildInsertionProblems(context, remaining, { insertionDifficulty });
      const added = appendProblems(generated);
      delivered += added;
      pushProgress('static_generated', type, {
        delivered: Array.isArray(generated) ? generated.length : added,
        requested: remaining
      });
    } catch (genError) {
      pushProgress('static_failed', type, { delivered: 0, requested: remaining, reason: String(genError?.message || genError) });
    }
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
  userId,
  passageNumbers = []
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

  const context = await aiService.getPassages(documentId, { passageNumbers });
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
    // Deduplicate by id and by content signature (question + mainText) to avoid duplicates from AI
    if (!appendProblems._sig) appendProblems._sig = new Set();

    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const identifier = entry.id || entry.originalId || entry.problemId || null;
      const key = identifier !== null && identifier !== undefined ? String(identifier) : null;
      if (key && usedProblemIds.has(key)) continue;
      const q = (entry.question || '').trim();
      const m = (entry.mainText || entry.passage || '').trim();
      const sig = `${q}|${m}`.replace(/\s+/g, ' ').toLowerCase();
      if (appendProblems._sig.has(sig)) continue;

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
      if (key) usedProblemIds.add(key);
      appendProblems._sig.add(sig);
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
    const fallbackType = requestedTypes[0] || 'order';
    await deliverFallbackProblems({
      type: fallbackType,
      count: Math.max(1, totalRequested || 3),
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
    // As a last resort, return in-memory fallback without touching DB to avoid 500
    const rescueType = requestedTypes[0] || 'order';
    const rescueList = await buildFallbackProblems({
      type: rescueType,
      count: Math.max(1, totalRequested || 3),
      docTitle,
      documentCode,
      reasonTag: 'in_memory_rescue'
    });
    aggregated.push(...rescueList);
    pushProgress('in_memory_rescue', rescueType, { delivered: rescueList.length, requested: totalRequested || rescueList.length });
  }

  let normalizedProblems = normalizeAll(aggregated);
  if (!Array.isArray(normalizedProblems) || normalizedProblems.length === 0) {
    const rescueType = requestedTypes[0] || 'order';
    const rescueList = await buildFallbackProblems({
      type: rescueType,
      count: Math.max(1, totalRequested || 3),
      docTitle,
      documentCode,
      reasonTag: 'normalize_rescue'
    });
    normalizedProblems = normalizeAll(rescueList);
    pushProgress('normalize_rescue', rescueType, { delivered: normalizedProblems.length, requested: totalRequested || rescueList.length });
  }

  if (!Array.isArray(normalizedProblems) || normalizedProblems.length === 0) {
    return {
      problems: [],
      count: 0,
      progressLog,
      failures: [{ type: 'all', delivered: 0, requested: totalRequested, reason: 'normalize_failed' }]
    };
  }

  // Always randomize final sequence to avoid memorization patterns
  let finalProblems = [...normalizedProblems];
  for (let i = finalProblems.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [finalProblems[i], finalProblems[j]] = [finalProblems[j], finalProblems[i]];
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
