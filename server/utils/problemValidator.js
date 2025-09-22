const NO_OPTION_TYPES = new Set(['essay', 'writing', 'subjective', 'descriptive']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requiresOptions(type) {
  if (!type) return true;
  return !NO_OPTION_TYPES.has(String(type).toLowerCase());
}

function hasValidOptions(problem) {
  if (!Array.isArray(problem.options)) return false;
  if (problem.options.length < 2) return false;
  return problem.options.every((option) => isNonEmptyString(option));
}

function hasValidAnswer(problem) {
  if (!isNonEmptyString(problem.answer)) return false;
  if (!Array.isArray(problem.options) || problem.options.length === 0) return false;

  const tokens = String(problem.answer)
    .replace(/[\[\]{}]/g, '')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length === 0) return false;

  const numbers = [];
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) return false;
    const idx = parseInt(token, 10);
    if (Number.isNaN(idx) || idx < 1 || idx > problem.options.length) return false;
    numbers.push(idx);
  }
  return new Set(numbers).size === numbers.length;
}

function isValid(problem) {
  if (!problem || typeof problem !== 'object') return false;
  if (!isNonEmptyString(problem.type)) return false;
  if (!isNonEmptyString(problem.question)) return false;

  if (requiresOptions(problem.type)) {
    if (!hasValidOptions(problem)) return false;
    if (!hasValidAnswer(problem)) return false;
  }

  return true;
}

module.exports = {
  isValid
};