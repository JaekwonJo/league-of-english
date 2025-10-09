const EXPOSURE_MIN_INCORRECT_RETRY_MINUTES = 20;
const EXPOSURE_BASE_RETRY_PROBABILITY = 0.45;
const EXPOSURE_RETRY_BONUS_PER_MISS = 0.12;
const EXPOSURE_FETCH_MULTIPLIER = 4;
const MAX_RETRY_PROBABILITY = 0.92;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

const defaultRandom = () => Math.random();
const defaultNow = () => Date.now();

function toTimestamp(value) {
  if (!value) return Number.NaN;
  const str = String(value).replace(/\s$/, '');
  const parsed = Date.parse(str);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function getIncorrectCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(numeric));
}

function computeRetryProbability(incorrectCount = 1) {
  const normalized = getIncorrectCount(incorrectCount);
  const probability = EXPOSURE_BASE_RETRY_PROBABILITY
    + (normalized - 1) * EXPOSURE_RETRY_BONUS_PER_MISS;
  return Math.min(MAX_RETRY_PROBABILITY, probability);
}

function decideExposure(exposure, options = {}) {
  if (!exposure || typeof exposure !== 'object') {
    return 'allow';
  }

  const randomFn = typeof options.random === 'function' ? options.random : defaultRandom;
  const nowFn = typeof options.now === 'function' ? options.now : defaultNow;
  const normalizedResult = exposure.lastResult ? String(exposure.lastResult).toLowerCase() : '';

  if (normalizedResult === 'pending' || normalizedResult === 'correct') {
    return 'skip';
  }

  if (normalizedResult === 'incorrect') {
    const incorrectCount = getIncorrectCount(exposure.incorrectCount);
    const lastAnsweredAt = toTimestamp(exposure.lastAnsweredAt);

    if (Number.isFinite(lastAnsweredAt)) {
      const elapsed = nowFn() - lastAnsweredAt;
      if (elapsed < EXPOSURE_MIN_INCORRECT_RETRY_MINUTES * MILLISECONDS_PER_MINUTE) {
        return 'skip';
      }
    }

    const probability = computeRetryProbability(incorrectCount);
    return randomFn() <= probability ? 'allow' : 'defer';
  }

  if (!normalizedResult) {
    return 'allow';
  }

  return 'skip';
}

function calculateFetchCount(requested, multiplier = EXPOSURE_FETCH_MULTIPLIER) {
  const count = Number(requested) || 0;
  if (count <= 0) {
    return 0;
  }
  const scaled = count * multiplier;
  return Math.max(Math.ceil(scaled), count);
}

module.exports = {
  EXPOSURE_MIN_INCORRECT_RETRY_MINUTES,
  EXPOSURE_BASE_RETRY_PROBABILITY,
  EXPOSURE_RETRY_BONUS_PER_MISS,
  EXPOSURE_FETCH_MULTIPLIER,
  computeRetryProbability,
  decideExposure,
  calculateFetchCount
};
