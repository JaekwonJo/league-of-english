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

const TOPIC_QUESTION = '다음 글의 주제로 가장 적절한 것은?';
const TOPIC_OPTION_MIN_WORDS = 6;
const TOPIC_OPTION_MAX_WORDS = 14;
const TOPIC_MIN_EXPLANATION_LENGTH = 75;
const TOPIC_MIN_EXPLANATION_SENTENCES = 2;
const TOPIC_ALLOWED_PATTERN = /^[A-Za-z][A-Za-z\s.,'"()/:;&-]*$/;

function sanitizeTopicOptionText(raw) {
  if (raw === null || raw === undefined) {
    throw new Error('topic option missing text');
  }
  let text = String(raw)
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();

  text = text
    .replace(/^(①|②|③|④|⑤)/, '')
    .replace(/^([0-9]+|[A-Ea-e])[.)\-:]?\s+/, '')
    .replace(/^(Option|Choice|Topic)\s+[A-E1-5][:.)\-]?\s*/i, '')
    .replace(/^(\(?(?:1|2|3|4|5|A|B|C|D|E)\)?)[.)\-:]?\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    throw new Error('topic option missing text');
  }
  if (!/^[A-Za-z]/.test(text)) {
    throw new Error('topic option must start with a letter');
  }
  if (!TOPIC_ALLOWED_PATTERN.test(text)) {
    throw new Error('topic option contains invalid characters');
  }
  if (/\d/.test(text)) {
    throw new Error('topic option must not contain numerals');
  }

  const wordCount = countWords(text);
  if (wordCount < TOPIC_OPTION_MIN_WORDS || wordCount > TOPIC_OPTION_MAX_WORDS) {
    throw new Error(`topic option must be ${TOPIC_OPTION_MIN_WORDS}-${TOPIC_OPTION_MAX_WORDS} words`);
  }

  return text.replace(/\s{2,}/g, ' ').trim();
}

function normalizeTopicOptions(rawOptions = []) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    throw new Error('topic options missing');
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
      optionText = entry.text || entry.value || entry.topic || entry.option || entry.phrase;
      defect = entry.defect || entry.tag || entry.flaw || entry.error || entry.fallacy;
    } else {
      throw new Error('topic options contain invalid entry');
    }

    if (optionText === null || optionText === undefined) {
      throw new Error('topic option missing text');
    }

    let index = labelToIndex(label, undefined);
    if (index === undefined || !available.has(index)) {
      index = available.size ? Math.min(...available) : rawIndex % size;
    }
    if (!available.has(index)) {
      throw new Error('duplicate topic option labels detected');
    }
    available.delete(index);

    const sanitized = sanitizeTopicOptionText(optionText);
    formatted[index] = `${CIRCLED_DIGITS[index]} ${sanitized}`;
    bareTexts[index] = sanitized;
    if (defect) {
      defects[CIRCLED_DIGITS[index]] = String(defect).trim();
    }
  });

  if (formatted.some((value) => !value)) {
    throw new Error('topic options must contain 5 entries');
  }

  const uniquenessCheck = new Set(
    bareTexts.map((text) => text.toLowerCase())
  );
  if (uniquenessCheck.size !== bareTexts.length) {
    throw new Error('topic options must be unique');
  }

  return {
    formatted,
    bareTexts,
    defects
  };
}

function normalizeTopicExplanation(raw) {
  const explanation = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!explanation) {
    throw new Error('topic explanation missing');
  }
  if (!containsHangul(explanation)) {
    throw new Error('topic explanation must be Korean');
  }
  if (explanation.length < TOPIC_MIN_EXPLANATION_LENGTH) {
    throw new Error('topic explanation too short');
  }
  if (countSentences(explanation) < TOPIC_MIN_EXPLANATION_SENTENCES) {
    throw new Error('topic explanation must contain at least two sentences');
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

function buildTopicPrompt({ passage, manualExcerpt, docTitle, variantTag, failureReason }) {
  const manualBlock = manualExcerpt ? `Topic manual excerpt (Korean):\n${manualExcerpt}\n\n` : '';
  const variantLine = variantTag ? `Variant tag: ${variantTag}` : '';
  const failureLine = failureReason ? `Previous attempt failed because: ${failureReason}. Fix the issue without breaking any rule.` : '';

  return [
    'You are a deterministic K-CSAT English topic item writer. Follow the contract exactly.',
    manualBlock,
    variantLine,
    failureLine,
    `Document title: ${docTitle || 'Untitled source'}`,
    `Passage (preserve sentences, do not summarise):\n${clipText(passage, 1500)}`,
    '',
    'Return strict JSON only (no Markdown) with this schema:',
    '{',
    `  "type": "theme",`,
    `  "question": "${TOPIC_QUESTION}",`,
    '  "options": ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"],',
    '  "correctAnswer": 3,',
    '  "explanation": "한국어 2~3문장",',
    '  "sourceLabel": "출처│기관 연도 회차 문항 (pXX)",',
    '  "topicType": "thesis|contrast|cause-effect|evaluation",',
    '  "distractorTags": ["narrow", "broad", "detail", "counter-claim", "scope-error"],',
    '  "keywords": ["keyword1", "keyword2"]',
    '}',
    '',
    'Rules:',
    '- Provide exactly five English options (sentences or noun phrases) 6-14 words long, no numbering.',
    '- Each distractorTags entry must describe the flaw for that choice (e.g., narrow, broad, detail, counter-claim, role-swap, metaphor-literal, scope error, half-truth).',
    '- Keep tone academic and neutral; avoid numerals, exclamation marks, or rhetorical questions.',
    '- Explanation must be in friendly, easy Korean (use emojis like 💡/✨) with at least two sentences (≥75 characters). Cite why the correct option fits and name at least one distractor defect.',
    "- sourceLabel must begin with '출처│'.",
    '- Respond with JSON only.'
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeTopicPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('topic payload missing');
  }

  const rawQuestion = String(payload.question || '').trim();
  if (normalizeQuestionKey(rawQuestion) !== normalizeQuestionKey(TOPIC_QUESTION)) {
    throw new Error('unexpected topic question');
  }

  const { formatted, bareTexts, defects } = normalizeTopicOptions(payload.options || []);

  const answerIndex = labelToIndex(
    payload.correctAnswer ?? payload.answer ?? payload.correct,
    null
  );
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= CIRCLED_DIGITS.length) {
    throw new Error('invalid topic correctAnswer');
  }

  const explanation = normalizeTopicExplanation(payload.explanation || payload.rationale || payload.analysis);
  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, { docTitle: context.docTitle });

  const metadata = {
    documentTitle: context.docTitle,
    generator: 'openai',
    difficulty: 'advanced'
  };
  if (context.variantTag) {
    metadata.variantTag = context.variantTag;
  }
  if (payload.topicType) {
    const type = String(payload.topicType).trim();
    if (type) metadata.topicType = type;
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

  // STRICT MODE: Force original passage
  const originalPassage = context.passage ? String(context.passage).replace(/\r\n/g, '\n').trim() : '';
  if (!originalPassage) {
    throw new Error('Topic generation requires original passage context');
  }

  const correctAnswer = String(answerIndex + 1);

  const problem = {
    id: payload.id || `theme_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'theme',
    question: TOPIC_QUESTION,
    options: formatted,
    answer: correctAnswer,
    correctAnswer,
    explanation,
    sourceLabel,
    difficulty: 'advanced',
    mainText: originalPassage, // STRICT
    text: originalPassage,     // STRICT
    metadata
  };

  problem.metadata.optionBareTexts = bareTexts;

  return problem;
}

function validateTopicProblem(problem) {
  const issues = [];
  if (!problem || typeof problem !== 'object') {
    return { valid: false, issues: ['invalid_object'] };
  }

  if (normalizeQuestionKey(problem.question || '') !== normalizeQuestionKey(TOPIC_QUESTION)) {
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
        sanitizeTopicOptionText(bare);
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
    if (explanation.length < TOPIC_MIN_EXPLANATION_LENGTH) {
      issues.push('explanation_short');
    }
    if (countSentences(explanation) < TOPIC_MIN_EXPLANATION_SENTENCES) {
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
  TOPIC_QUESTION,
  TOPIC_OPTION_MIN_WORDS,
  TOPIC_OPTION_MAX_WORDS,
  TOPIC_MIN_EXPLANATION_LENGTH,
  TOPIC_MIN_EXPLANATION_SENTENCES,
  buildTopicPrompt,
  normalizeTopicPayload,
  validateTopicProblem
};
