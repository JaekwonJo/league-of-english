import { MAX_TOTAL_PROBLEMS, PROBLEM_STEP, TYPE_KEYS } from './constants';

export const sanitizeTypeCounts = (rawTypes = {}) => {
  const normalized = {};
  let total = 0;

  TYPE_KEYS.forEach((key) => {
    const rawValue = Number(rawTypes[key]) || 0;
    const snapped = Math.min(
      MAX_TOTAL_PROBLEMS,
      Math.max(0, Math.floor(rawValue / PROBLEM_STEP) * PROBLEM_STEP),
    );
    normalized[key] = snapped;
    total += snapped;
  });

  if (total > MAX_TOTAL_PROBLEMS) {
    let overflow = total - MAX_TOTAL_PROBLEMS;
    const orderedKeys = [...TYPE_KEYS].reverse();
    for (const key of orderedKeys) {
      while (normalized[key] > 0 && overflow > 0) {
        normalized[key] -= PROBLEM_STEP;
        overflow -= PROBLEM_STEP;
      }
      if (overflow <= 0) break;
    }
  }

  return normalized;
};

export const calculateTotalProblems = (typeCounts = {}) =>
  Object.values(typeCounts).reduce((sum, count) => sum + (count || 0), 0);

export const ensureOrderMode = (value) => (value === 'sequential' ? 'sequential' : 'random');
