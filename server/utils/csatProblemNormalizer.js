const DEFAULT_DIFFICULTY = 'basic';
const FALLBACK_QUESTION = 'Preparing question... please wait.';
const ZERO_BASED_KEYS = new Set(['correctanswer', 'correct_index', 'correctindex']);

function toCleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseAnswerTokens(value, optionCount, zeroBased = false) {
  if (value === null || value === undefined) return [];
  const normalized = Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' ? item.split(/[\\,\\s]+/) : [item]))
    : String(value).replace(/[\\[\\]{}]/g, '').split(/[\\,\\s]+/);
  const numbers = [];
  for (const token of normalized) {
    if (token === null || token === undefined) continue;
    const str = String(token).trim();
    if (!str || !/^-?\\d+$/.test(str)) continue;
    let num = parseInt(str, 10);
    if (Number.isNaN(num)) continue;
    if (zeroBased) num += 1;
    numbers.push(num);
  }
  return [...new Set(numbers)].filter((n) => n >= 1 && (!optionCount || n <= optionCount)).sort((a, b) => a - b);
}

function mapMultipleChoices(choices = []) {
  if (!Array.isArray(choices)) return [];
  return choices
    .map((choice) => {
      if (choice && typeof choice === 'object') {
        const symbol = toCleanString(choice.symbol || choice.label || '');
        const value = toCleanString(choice.value || choice.text || choice.order || '');
        if (!symbol && !value) return null;
        return `${symbol ? `${symbol} ` : ''}${value}`.trim();
      }
      return toCleanString(choice);
    })
    .filter((item) => item.length > 0);
}

function toOptionArray(value, fallbackChoices = []) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return mapMultipleChoices(fallbackChoices);
  }

  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => {
        if (item && typeof item === 'object') {
          if ('value' in item || 'text' in item) {
            return toCleanString(item.value || item.text || item.label || '');
          }
        }
        return toCleanString(item);
      })
      .filter((item) => item.length > 0);
    return mapped.length ? mapped : mapMultipleChoices(fallbackChoices);
  }

  if (typeof value === 'string') {
    const lines = value
      .split(/\r?\n/)
      .map((line) => toCleanString(line))
      .filter((line) => line.length > 0);
    if (lines.length > 1) return lines;
    const single = toCleanString(value);
    if (single) return [single];
  }

  const single = toCleanString(value);
  if (single) return [single];
  return mapMultipleChoices(fallbackChoices);
}

function resolveAnswer(problem, options) {
  const keys = [
    'answer',
    'correctAnswer',
    'correctAnswers',
    'answers',
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
  const optionCount = options.length;
  const token = typeof key === 'string' ? key.toLowerCase() : '';
  const zeroBased = ZERO_BASED_KEYS.has(token);

  if (value === null || value === undefined) return null;

  const looksLikeMulti = Array.isArray(value) || (typeof value === 'string' && /[,\s]/.test(String(value).replace(/[\[\]{}]/g, '')));
  if (looksLikeMulti) {
    const answers = parseAnswerTokens(value, optionCount, zeroBased);
    if (!answers.length) return null;
    if (answers.length === 1) return String(answers[0]);
    return answers.join(',');
  }

  if (typeof value === 'number') {
    const index = Math.trunc(value);
    if (zeroBased && index >= 0 && index < optionCount) return String(index + 1);
    if (!zeroBased && index >= 1 && index <= optionCount) return String(index);
    if (!zeroBased && index >= 0 && index < optionCount) return String(index + 1);
    return null;
  }

  const cleanOriginal = toCleanString(value);
  if (!cleanOriginal) return null;
  const clean = cleanOriginal.replace(/[\[\]{}]/g, '');

  if (/^\d+$/.test(clean)) {
    const index = parseInt(clean, 10);
    if (zeroBased) {
      if (index >= 0 && index < optionCount) return String(index + 1);
      return null;
    }
    if (index >= 1 && index <= optionCount) return String(index);
    if (index >= 0 && index < optionCount) return String(index + 1);
    return null;
  }

  const multiParsed = parseAnswerTokens(clean, optionCount, zeroBased);
  if (multiParsed.length) {
    if (multiParsed.length === 1) return String(multiParsed[0]);
    return multiParsed.join(',');
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
    const passthroughKeys = ['documentTitle', 'passageNumber', 'passageIndex', 'clusterId', 'summaryPattern', 'summaryPatterns', 'keywords', 'summaryKeywords', 'generator'];
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
  let question = toCleanString(problem.question || problem.prompt || '');
  if (!question) {
    if (type === 'order') question = '다음 문장들의 순서를 올바르게 배열한 것은?';
    else if (type === 'insertion') question = '빈칸에 들어갈 문장의 위치로 가장 적절한 것은?';
    else question = FALLBACK_QUESTION;
  }

  const fallbackChoices = Array.isArray(problem.multipleChoices) ? problem.multipleChoices : undefined;
  const options = toOptionArray(problem.options || problem.choices || problem.answers, fallbackChoices);
  const answer = options.length > 0 ? resolveAnswer(problem, options) : null;

  if (options.length > 0 && !answer && typeof problem.answer === 'undefined') return null;
  if (!question) return null;

  const normalized = {
    id: toCleanString(problem.id || problem._id || `generated_${Date.now()}_${index}`) || `generated_${Date.now()}_${index}`,
    type,
    question,
    options: options.length ? options : undefined,
    answer: options.length ? (answer || normaliseAnswerValue(problem.answer, options, 'answer')) : undefined,
    explanation: toCleanString(problem.explanation || problem.reason || ''),
    difficulty: toCleanString(problem.difficulty || DEFAULT_DIFFICULTY) || DEFAULT_DIFFICULTY,
    mainText: toCleanString(problem.mainText || problem.passage || problem.text || ''),
    metadata: buildMetadata(problem),
    isActive: problem.isActive === undefined ? true : Boolean(problem.isActive)
  };

  if (problem.deactivatedAt) {
    normalized.deactivatedAt = toCleanString(problem.deactivatedAt);
  }

  if (Object.prototype.hasOwnProperty.call(problem, 'note')) {
    const rawNote = typeof problem.note === 'string' ? problem.note.trim() : '';
    normalized.note = rawNote;
  }
  const source = toCleanString(problem.source || problem.documentTitle || (problem.metadata && problem.metadata.documentTitle) || '');

const sourceLabel = toCleanString(problem.sourceLabel || problem.source_label || '');
if (sourceLabel) normalized.sourceLabel = sourceLabel;

const problemNumberLabel = toCleanString(
  problem.problemNumber ||
  (problem.metadata && problem.metadata.problemNumber) ||
  (normalized.metadata && normalized.metadata.problemNumber) ||
  ''
);
if (problemNumberLabel) {
  normalized.metadata = normalized.metadata || {};
  if (!normalized.metadata.problemNumber) {
    normalized.metadata.problemNumber = problemNumberLabel;
  }
  if (normalized.sourceLabel && !normalized.sourceLabel.includes(problemNumberLabel)) {
    normalized.sourceLabel = `${normalized.sourceLabel} · ${problemNumberLabel}`;
  }
}

const summarySentence = toCleanString(problem.summarySentence || problem.summary_sentence || problem.summary);
if (summarySentence) normalized.summarySentence = summarySentence;

const summarySentenceKor = toCleanString(problem.summarySentenceKor || problem.summary_sentence_kor || '');
if (summarySentenceKor) normalized.summarySentenceKor = summarySentenceKor;

const summaryPattern = toCleanString(problem.summaryPattern || '');
if (summaryPattern) {
  normalized.metadata = normalized.metadata || {};
  if (!normalized.metadata.summaryPattern) normalized.metadata.summaryPattern = summaryPattern;
}

if (Array.isArray(problem.keywords)) {
  const keywords = problem.keywords.map((kw) => toCleanString(kw)).filter((kw) => kw.length > 0);
  if (keywords.length) {
    normalized.metadata = normalized.metadata || {};
    if (!normalized.metadata.keywords) normalized.metadata.keywords = keywords;
  }
}

  if (source) normalized.source = source;

  if (!normalized.options) delete normalized.options;
  if (!normalized.answer) delete normalized.answer;
  if (!normalized.mainText) delete normalized.mainText;
  if (!normalized.explanation) delete normalized.explanation;
  if (!normalized.metadata) delete normalized.metadata;

  if (problem.text) normalized.text = toCleanString(problem.text);
  if (Array.isArray(problem.multipleChoices)) {
    normalized.multipleChoices = problem.multipleChoices.map((choice) => ({
      number: choice.number || parseInt(choice.value || choice.text || choice.label || choice.symbol, 10) || undefined,
      symbol: toCleanString(choice.symbol || choice.label || ''),
      value: toCleanString(choice.value || choice.text || choice.order || ''),
    }));
    if (!normalized.options || normalized.options.length === 0) {
      const derived = normalized.multipleChoices.map((choice) => choice.value).filter((v) => v.length > 0);
      if (derived.length === normalized.multipleChoices.length) {
        normalized.options = derived;
        const fallbackAnswer = normaliseAnswerValue(problem.answer, normalized.options, 'answer');
        if (fallbackAnswer) normalized.answer = fallbackAnswer;
      }
    }
  }

  if (Array.isArray(problem.sentences)) {
    normalized.sentences = problem.sentences.map((item) => {
      if (item && typeof item === 'object') {
        return {
          label: toCleanString(item.label || item.symbol || ''),
          text: toCleanString(item.text || item.value || ''),
        };
      }
      return { label: '', text: toCleanString(item) };
    });
  }
  if (problem.givenSentence) normalized.givenSentence = toCleanString(problem.givenSentence);
  if (problem.correctOrder) normalized.correctOrder = toCleanString(problem.correctOrder);

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
