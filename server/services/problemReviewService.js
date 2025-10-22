const aiService = require('./aiProblemService');
const { normalizeAll } = require('../utils/csatProblemNormalizer');

function clampReviewLimit(rawLimit, defaultValue, max) {
  const parsed = parseInt(rawLimit, 10);
  const safe = Number.isNaN(parsed) ? defaultValue : parsed;
  return Math.min(Math.max(safe, 1), max);
}

async function getReviewQueueForUser(userId, options = {}) {
  const { limit = 20 } = options;
  const queue = await aiService.listReviewQueueForUser(userId, { limit });
  const normalized = normalizeAll(queue?.problems || []);
  return {
    total: queue?.total || 0,
    count: normalized.length,
    problems: normalized
  };
}

async function startReviewSession(userId, options = {}) {
  const limit = clampReviewLimit(options.limit, 5, 20);
  const queue = await aiService.listReviewQueueForUser(userId, { limit: limit * 4 });
  const selected = Array.isArray(queue?.problems) ? queue.problems.slice(0, limit) : [];

  if (!selected.length) {
    const error = new Error('복습할 오답 문제가 없어요. 새로운 문제를 풀어볼까요?');
    error.status = 404;
    throw error;
  }

  const normalized = normalizeAll(selected);
  const exposureIds = selected
    .map((problem) => Number(problem.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (exposureIds.length) {
    await aiService.markExposures(userId, exposureIds);
  }

  return {
    total: queue?.total || 0,
    count: normalized.length,
    problems: normalized
  };
}

module.exports = {
  clampReviewLimit,
  getReviewQueueForUser,
  startReviewSession
};
