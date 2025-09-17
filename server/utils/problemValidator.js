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
  if (!/^\d+$/.test(problem.answer.trim())) return false;
  const idx = parseInt(problem.answer.trim(), 10);
  return idx >= 1 && idx <= problem.options.length;
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