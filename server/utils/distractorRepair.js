function toCleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function ensureOptions(problem) {
  const options = Array.isArray(problem.options) ? problem.options : [];
  const cleaned = [];
  for (const option of options) {
    const text = toCleanString(option);
    if (!text) continue;
    if (!cleaned.includes(text)) cleaned.push(text);
  }
  return cleaned;
}

function fillMissingOptions(options, target = 4) {
  const filled = [...options];
  for (let i = 0; filled.length < target; i += 1) {
    filled.push(`Option ${filled.length + 1}`);
  }
  return filled;
}

function pickAnswer(problem, options) {
  if (typeof problem.answer === 'string' && /^\d+$/.test(problem.answer.trim())) {
    const idx = parseInt(problem.answer.trim(), 10);
    if (idx >= 1 && idx <= options.length) return String(idx);
  }

  const textCandidates = [problem.correctText, problem.correctAnswer, problem.correctOption];
  for (const candidate of textCandidates) {
    const text = toCleanString(candidate);
    if (!text) continue;
    const idx = options.findIndex((option) => option.toLowerCase() === text.toLowerCase());
    if (idx !== -1) return String(idx + 1);
  }

  return options.length ? '1' : undefined;
}

function repairMCQ(problem) {
  if (!problem || typeof problem !== 'object') return problem;
  const clone = { ...problem };
  const options = ensureOptions(problem);
  const filled = fillMissingOptions(options, Math.max(2, options.length));
  clone.options = filled;
  clone.answer = pickAnswer(problem, filled);
  if (!clone.answer && filled.length) clone.answer = '1';
  if (problem.choices) clone.choices = [...filled];
  return clone;
}

module.exports = { repairMCQ };