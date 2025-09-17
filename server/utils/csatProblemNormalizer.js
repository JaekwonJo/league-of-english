const DEFAULT_DIFFICULTY = 'basic';
const FALLBACK_QUESTION = 'Preparing question... please wait.';
const ZERO_BASED_KEYS = new Set(['correctanswer', 'correct_index', 'correctindex']);

function toCleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toOptionArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => toCleanString(item))
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value
      .split(/\r?\n/)
      .map((line) => toCleanString(line))
      .filter((line) => line.length > 0);
    if (trimmed.length > 1) return trimmed;
    return toCleanString(value) ? [toCleanString(value)] : [];
  }
  return [toCleanString(value)].filter((item) => item.length > 0);
}

function resolveAnswer(problem, options) {
  const keys = [
    'answer',
    'correctAnswer',
    'correct',
    'solution',
    'correctIndex',
    'correct_index',
    'correctOption',
    'correct_option'
  ];

  for (const key of keys) {
    if (key in problem) {
      const resolved = normaliseAnswerValue(problem[key], options, key);
      if (resolved) return resolved;
    }
  }

  const textKeys = ['correctText', 'correctAnswerText'];
  for (const key of textKeys) {
    if (key in problem) {
      const value = toCleanString(problem[key]);
      if (!value) continue;
      const index = options.findIndex((option) => option.toLowerCase() === value.toLowerCase());
      if (index !== -1) return String(index + 1);
    }
  }

  return null;
}

function normaliseAnswerValue(value, options, key) {
  const token = typeof key === 'string' ? key.toLowerCase() : '';
  const zeroBased = ZERO_BASED_KEYS.has(token);

  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    const index = Math.trunc(value);
    if (zeroBased && index >= 0 && index < options.length) return String(index + 1);
    if (index >= 1 && index <= options.length) return String(index);
    if (!zeroBased && index >= 0 && index < options.length) return String(index + 1);
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return normaliseAnswerValue(value[0], options, key);
  }

  const clean = toCleanString(value);
  if (!clean) return null;

  if (/^\d+$/.test(clean)) {
    const index = parseInt(clean, 10);
    if (zeroBased) {
      if (index >= 0 && index < options.length) return String(index + 1);
      return null;
    }
    if (index >= 1 && index <= options.length) return String(index);
    if (index >= 0 && index < options.length) return String(index + 1);
    return null;
  }

  const idx = options.findIndex((option) => option.toLowerCase() === clean.toLowerCase());
  if (idx !== -1) return String(idx + 1);

  return null;
}

function buildMetadata(problem) {
  const metadata = {};
  if (problem && typeof problem === 'object') {
    if (problem.metadata && typeof problem.metadata === 'object') {
      Object.assign(metadata, problem.metadata);
    }
    const passthroughKeys = ['documentTitle', 'passageNumber', 'clusterId'];
    for (const key of passthroughKeys) {
      if (key in problem && !(key in metadata)) {
        metadata[key] = problem[key];
      }
    }
  }
  return Object.keys(metadata).length ? metadata : undefined;
}

function normaliseProblem(problem, index) {
  if (!problem || typeof problem !== 'object') return null;

  const type = toCleanString(problem.type || problem.problemType || 'generic');
  const question = toCleanString(problem.question || problem.prompt || FALLBACK_QUESTION);
  const options = toOptionArray(problem.options || problem.choices || problem.answers);

  if (options.length === 0 && Array.isArray(problem.choices)) {
    options.push(...toOptionArray(problem.choices));
  }

  const answer = options.length > 0 ? resolveAnswer(problem, options) : null;

  if (options.length > 0 && !answer) return null;
  if (!question) return null;

  const normalized = {
    id: toCleanString(problem.id || problem._id || `generated_${Date.now()}_${index}`) || `generated_${Date.now()}_${index}`,
    type,
    question,
    options: options.length ? options : undefined,
    answer: options.length ? answer : undefined,
    explanation: toCleanString(problem.explanation || problem.reason || ''),
    difficulty: toCleanString(problem.difficulty || DEFAULT_DIFFICULTY) || DEFAULT_DIFFICULTY,
    mainText: toCleanString(problem.mainText || problem.passage || ''),
    metadata: buildMetadata(problem)
  };

  if (!normalized.options) delete normalized.options;
  if (!normalized.answer) delete normalized.answer;
  if (!normalized.mainText) delete normalized.mainText;
  if (!normalized.explanation) delete normalized.explanation;
  if (!normalized.metadata) delete normalized.metadata;

  if (problem.text) normalized.text = toCleanString(problem.text);
  if (problem.choices && normalized.options) normalized.choices = [...normalized.options];
  if (problem.sequence) normalized.sequence = problem.sequence;
  if (problem.id) normalized.originalId = problem.id;

  return normalized;
}

function normalizeAll(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((problem, index) => normaliseProblem(problem, index))
    .filter((problem) => problem !== null);
}

module.exports = {
  normalizeAll,
  normaliseProblem
};