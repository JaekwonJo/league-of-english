'use strict';

const {
  CIRCLED_DIGITS,
  clipText,
  countSentences,
  countWords,
  ensureSourceLabel,
  containsHangul,
  normalizeQuestionKey,
  labelToIndex
} = require('./shared');

const TITLE_QUESTION = '다음 글의 제목으로 가장 적절한 것은?';
const TITLE_OPTION_MIN_WORDS = 6;
const TITLE_OPTION_MAX_WORDS = 12;
const TITLE_MIN_EXPLANATION_LENGTH = 70;
const TITLE_MIN_EXPLANATION_SENTENCES = 2;
const TITLE_ALLOWED_PATTERN = /^[A-Za-z][A-Za-z\s.,'"()/:;&-]*$/;

function sanitizeTitleOptionText(raw) {
  if (raw === null || raw === undefined) {
    throw new Error('title option missing text');
  }
  let text = String(raw)
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();

  text = text
    .replace(/^(①|②|③|④|⑤)/, '')
    .replace(/^([0-9]+|[A-Ea-e])[.)\-:]?\s+/, '')
    .replace(/^(Option|Choice|Title)\s+[A-E1-5][:.)\-]?\s*/i, '')
    .replace(/^(\(?(?:1|2|3|4|5|A|B|C|D|E)\)?)[.)\-:]?\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    throw new Error('title option missing text');
  }
  if (!/^[A-Za-z]/.test(text)) {
    throw new Error('title option must start with a letter');
  }
  if (!TITLE_ALLOWED_PATTERN.test(text)) {
    throw new Error('title option contains invalid characters');
  }
  if (/\d/.test(text)) {
    throw new Error('title option must not contain numerals');
  }
  if (/[!?]$/.test(text)) {
    throw new Error('title option must not end with ! or ?');
  }

  const wordCount = countWords(text);
  if (wordCount < TITLE_OPTION_MIN_WORDS || wordCount > TITLE_OPTION_MAX_WORDS) {
    throw new Error(`title option must be ${TITLE_OPTION_MIN_WORDS}-${TITLE_OPTION_MAX_WORDS} words`);
  }

  return text.replace(/\s{2,}/g, ' ').trim();
}

function normalizeTitleOptions(rawOptions = []) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    throw new Error('title options missing');
  }

  const size = CIRCLED_DIGITS.length;
  const formatted = new Array(size).fill(null);
  const bareTexts = new Array(size).fill(null);
  const defects = {};
  const available = new Set(Array.from({ length: size }, (_, index) => index));

  rawOptions.forEach((entry, rawIndex) => {
    let label;
    let optionText;
    let defect;

    if (typeof entry === 'string') {
      optionText = entry;
    } else if (entry && typeof entry === 'object') {
      label = entry.label || entry.symbol || entry.id || entry.choice || entry.option;
      optionText = entry.text || entry.value || entry.title || entry.option || entry.phrase;
      defect = entry.defect || entry.tag || entry.flaw || entry.error || entry.fallacy;
    } else {
      throw new Error('title options contain invalid entry');
    }

    if (optionText === null || optionText === undefined) {
      throw new Error('title option missing text');
    }

    let index = labelToIndex(label, undefined);
    if (index === undefined || !available.has(index)) {
      index = available.size ? Math.min(...available) : rawIndex % size;
    }
    if (!available.has(index)) {
      throw new Error('duplicate title option labels detected');
    }
    available.delete(index);

    const sanitized = sanitizeTitleOptionText(optionText);
    formatted[index] = `${CIRCLED_DIGITS[index]} ${sanitized}`;
    bareTexts[index] = sanitized;
    if (defect) {
      defects[CIRCLED_DIGITS[index]] = String(defect).trim();
    }
  });

  if (formatted.some((value) => !value)) {
    throw new Error('title options must contain 5 entries');
  }

  const uniquenessCheck = new Set(
    bareTexts.map((text) => text.toLowerCase())
  );
  if (uniquenessCheck.size !== bareTexts.length) {
    throw new Error('title options must be unique');
  }

  return {
    formatted,
    bareTexts,
    defects
  };
}

function normalizeTitleExplanation(raw) {
  const explanation = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!explanation) {
    throw new Error('title explanation missing');
  }
  if (!containsHangul(explanation)) {
    throw new Error('title explanation must be Korean');
  }
  if (explanation.length < TITLE_MIN_EXPLANATION_LENGTH) {
    throw new Error('title explanation too short');
  }
  if (countSentences(explanation) < TITLE_MIN_EXPLANATION_SENTENCES) {
    throw new Error('title explanation must contain at least two sentences');
  }
  return explanation;
}

function collectOptionTags(rawTags, fallback = {}) {
  const tags = {};
  const digits = CIRCLED_DIGITS;

  const assignTag = (digit, value) => {
    if (!value) return;
    const trimmed = String(value).trim();
    if (!trimmed) return;
    tags[digit] = trimmed;
  };

  if (Array.isArray(rawTags)) {
    rawTags.forEach((value, index) => {
      if (index < digits.length) {
        assignTag(digits[index], value);
      }
    });
  } else if (rawTags && typeof rawTags === 'object') {
    digits.forEach((digit, index) => {
      const fallbacks = [digit, String(index + 1), String.fromCharCode(65 + index), `${index + 1}.`, `${digit} `];
      for (const key of fallbacks) {
        if (Object.prototype.hasOwnProperty.call(rawTags, key)) {
          assignTag(digit, rawTags[key]);
          break;
        }
      }
    });
  }

  digits.forEach((digit) => {
    if (!tags[digit] && fallback[digit]) {
      assignTag(digit, fallback[digit]);
    }
  });

  return Object.keys(tags).length ? tags : null;
}

function buildTitlePrompt({ passage, manualExcerpt, docTitle, variantTag, failureReason }) {
  const manualBlock = manualExcerpt ? `Title manual excerpt (Korean):\n${manualExcerpt}\n\n` : '';
  const variantLine = variantTag ? `Variant tag: ${variantTag}` : '';
  const failureLine = failureReason ? `Previous attempt failed because: ${failureReason}. Fix the issue without violating any rules.` : '';

  return [
    'You are a deterministic K-CSAT English title item writer. Follow the contract exactly.',
    manualBlock,
    variantLine,
    failureLine,
    `Document title: ${docTitle || 'Untitled source'}`,
    `Passage (preserve sentences, do not summarise):\n${clipText(passage, 1500)}`,
    '',
    'Return strict JSON only (no Markdown, no prose) with this schema:',
    '{',
    `  "type": "title",`,
    `  "question": "${TITLE_QUESTION}",`,
    '  "options": ["Title option 1", "Title option 2", "Title option 3", "Title option 4", "Title option 5"],',
    '  "correctAnswer": 3,',
    '  "explanation": "한국어 2~3문장",',
    '  "sourceLabel": "출처│기관 연도 회차 문항 (pXX)",',
    '  "titlePattern": "Thesis vs Contrast",',
    '  "distractorTags": ["narrow", "broad", "detail", "counter-claim", "scope-error"],',
    '  "keywords": ["keyword1", "keyword2"]',
    '}',
    '',
    'Rules:',
    '- Provide exactly five English title options, each 6-12 words, no numbering or circled digits.',
    '- Avoid numerals, exclamation marks, or question marks in the titles. Tone must be academic and neutral.',
    '- Each distractorTags entry must describe a distinct flaw (e.g., narrow, broad, detail, counter-claim, scope error, metaphor-literal, role-swap, definition, clickbait).',
    '- The explanation must be written in Korean (minimum two sentences, ≥70 characters) and mention why the correct option fits as well as at least one distractor defect.',
    "- sourceLabel must begin with '출처│'.",
    '- Respond with JSON only.'
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeTitlePayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('title payload missing');
  }

  const rawQuestion = String(payload.question || '').trim();
  if (normalizeQuestionKey(rawQuestion) !== normalizeQuestionKey(TITLE_QUESTION)) {
    throw new Error('unexpected title question');
  }

  const { formatted, bareTexts, defects } = normalizeTitleOptions(payload.options || []);

  const answerIndex = labelToIndex(
    payload.correctAnswer ?? payload.answer ?? payload.correct,
    null
  );
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= CIRCLED_DIGITS.length) {
    throw new Error('invalid title correctAnswer');
  }

  const explanation = normalizeTitleExplanation(payload.explanation || payload.rationale || payload.analysis);
  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, { docTitle: context.docTitle });

  const metadata = {
    documentTitle: context.docTitle,
    generator: 'openai',
    difficulty: 'advanced'
  };

  if (context.variantTag) {
    metadata.variantTag = context.variantTag;
  }
  if (payload.titlePattern) {
    const pattern = String(payload.titlePattern).trim();
    if (pattern) metadata.titlePattern = pattern;
  }
  if (Array.isArray(payload.keywords)) {
    const keywords = payload.keywords
      .map((kw) => String(kw).trim())
      .filter((kw) => kw.length > 0);
    if (keywords.length) metadata.keywords = keywords;
  }
  const optionDefects = collectOptionTags(payload.distractorTags || payload.optionTags || payload.optionDefects, defects);
  if (optionDefects) {
    metadata.optionDefects = optionDefects;
  }
  const summary = String(payload.summary || payload.correctSummary || '').trim();
  if (summary) {
    metadata.summary = summary;
  }

  const passage = String(context.passage || payload.text || payload.passage || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!passage) {
    throw new Error('title passage missing');
  }

  const correctAnswer = String(answerIndex + 1);

  const problem = {
    id: payload.id || `title_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'title',
    question: TITLE_QUESTION,
    options: formatted,
    answer: correctAnswer,
    correctAnswer,
    explanation,
    sourceLabel,
    difficulty: 'advanced',
    mainText: passage,
    text: passage,
    metadata
  };

  problem.metadata.optionBareTexts = bareTexts;

  return problem;
}

function validateTitleProblem(problem) {
  const issues = [];
  if (!problem || typeof problem !== 'object') {
    return { valid: false, issues: ['invalid_object'] };
  }

  if (normalizeQuestionKey(problem.question || '') !== normalizeQuestionKey(TITLE_QUESTION)) {
    issues.push('question_mismatch');
  }

  const options = Array.isArray(problem.options) ? problem.options : [];
  if (options.length !== CIRCLED_DIGITS.length) {
    issues.push('option_count');
  } else {
    options.forEach((option, index) => {
      const text = String(option || '');
      if (!text.startsWith(CIRCLED_DIGITS[index])) {
        issues.push(`option_${index + 1}_marker`);
        return;
      }
      const bare = text.slice(CIRCLED_DIGITS[index].length).trim();
      try {
        sanitizeTitleOptionText(bare);
      } catch (error) {
        issues.push(`option_${index + 1}_${error.message}`);
      }
    });
  }

  const explanation = String(problem.explanation || '').trim();
  if (!explanation) {
    issues.push('explanation_missing');
  } else {
    if (!containsHangul(explanation)) {
      issues.push('explanation_language');
    }
    if (explanation.length < TITLE_MIN_EXPLANATION_LENGTH) {
      issues.push('explanation_short');
    }
    if (countSentences(explanation) < TITLE_MIN_EXPLANATION_SENTENCES) {
      issues.push('explanation_sentences');
    }
  }

  const source = String(problem.sourceLabel || '').trim();
  if (!source.startsWith('출처│')) {
    issues.push('source_prefix');
  }

  return { valid: issues.length === 0, issues };
}

module.exports = {
  TITLE_QUESTION,
  TITLE_OPTION_MIN_WORDS,
  TITLE_OPTION_MAX_WORDS,
  TITLE_MIN_EXPLANATION_LENGTH,
  TITLE_MIN_EXPLANATION_SENTENCES,
  buildTitlePrompt,
  normalizeTitlePayload,
  validateTitleProblem
};
