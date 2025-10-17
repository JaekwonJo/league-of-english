'use strict';

const {
  CIRCLED_DIGITS,
  normalizeQuestionKey,
  normalizeWhitespace,
  stripTags,
  countSentences,
  containsHangul,
  ensureSourceLabel,
  labelToIndex
} = require('./shared');

const UNDERLINE_PATTERN = /<u>([\s\S]*?)<\/u>/gi;
const DEFAULT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?';
const QUESTION_VARIANTS = [
  DEFAULT_QUESTION,
  '다음 글의 밑줄 친 부분 중 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
  '다음 글의 밑줄 친 부분 중, 문맥상 어색한 표현은?'
];
const QUESTION_KEY_SET = new Set(QUESTION_VARIANTS.map((item) => normalizeQuestionKey(item)));

const VOCAB_JSON_BLUEPRINT = `{
  "type": "vocabulary",
  "question": "${DEFAULT_QUESTION}",
  "passage": "... <u>표현</u> ...",
  "options": [
    "① <u>표현</u>",
    "② <u>표현</u>",
    "③ <u>표현</u>",
    "④ <u>표현</u>",
    "⑤ <u>표현</u>"
  ],
  "correctAnswer": 3,
  "explanation": "한국어 해설 (정답 근거 + 오답 타당성)",
  "sourceLabel": "출처│2024년 3월 고2 모의고사 어휘 no1",
  "correction": {
    "replacement": "대체 표현",
    "reason": "왜 자연스러운지 한국어로 설명"
  },
  "optionReasons": [
    { "label": "③", "reason": "③번이 문맥상 어색한 이유" },
    { "label": "①", "reason": "①번이 자연스러운 이유" }
  ]
}`;

const MIN_EXPLANATION_LENGTH = 32;
const MIN_EXPLANATION_SENTENCES = 1;

function collectUnderlinedSegments(text = '') {
  const matches = [];
  let match;
  while ((match = UNDERLINE_PATTERN.exec(text)) !== null) {
    const value = normalizeWhitespace(match[1] || '').trim();
    if (value) {
      matches.push({ raw: match[0], text: value });
    }
  }
  return matches;
}

function normaliseOptionText(option, index) {
  if (typeof option === 'string') return option.trim();
  if (option && typeof option === 'object') {
    return String(option.text || option.value || option.option || '').trim();
  }
  return String(option || '').trim();
}

function normaliseOptionReasons(entries = []) {
  const reasons = {};
  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const label = String(entry.label || entry.option || entry.choice || '').trim();
    const mappedLabel = label.replace(/[^①-⑤]/g, '') || label;
    const reason = String(entry.reason || entry.explanation || entry.comment || '').trim();
    if (!mappedLabel || !reason) return;
    reasons[mappedLabel] = reason;
  });
  return reasons;
}

function normaliseCorrection(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') {
    const replacement = payload.trim();
    return replacement ? { replacement } : null;
  }
  if (Array.isArray(payload)) {
    return normaliseCorrection(payload[0]);
  }
  if (typeof payload === 'object') {
    const replacement = String(payload.replacement || payload.correct || payload.value || '').trim();
    const reason = String(payload.reason || payload.explanation || '').trim();
    if (!replacement && !reason) return null;
    return {
      replacement: replacement || undefined,
      reason: reason || undefined
    };
  }
  return null;
}

function ensureSingleAnswer(answerValue) {
  if (Array.isArray(answerValue)) {
    return Number.parseInt(answerValue[0], 10);
  }
  return Number.parseInt(answerValue, 10);
}

function normalizeVocabularyPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('vocabulary payload missing');
  }

  const docTitle = context.docTitle;
  const documentCode = context.documentCode;
  const registerFailure = (msg) => {
    if (Array.isArray(context.failureReasons) && !context.failureReasons.includes(msg)) {
      context.failureReasons.push(msg);
    }
    return msg;
  };
  const raise = (msg) => {
    throw new Error(registerFailure(msg));
  };

  const rawQuestion = String(payload.question || '').replace(/\[\d+\]\s*$/, '').trim();
  const questionKey = normalizeQuestionKey(rawQuestion || DEFAULT_QUESTION);
  if (!QUESTION_KEY_SET.has(questionKey)) {
    raise('unexpected vocabulary question');
  }
  const question = QUESTION_VARIANTS.find((variant) => normalizeQuestionKey(variant) === questionKey) || DEFAULT_QUESTION;

  const originalPassageRaw = context.passage
    ? String(context.passage)
    : String(payload.originalPassage || payload.sourcePassage || payload.text || '').trim();
  let passage = String(payload.passage || payload.text || payload.mainText || originalPassageRaw || '').trim();
  if (!passage) {
    raise('vocabulary passage missing');
  }

  const segments = collectUnderlinedSegments(passage);
  if (segments.length !== CIRCLED_DIGITS.length) {
    raise('vocabulary passage must include exactly five underlined expressions');
  }

  const optionsInput = Array.isArray(payload.options) ? payload.options : [];
  if (optionsInput.length !== CIRCLED_DIGITS.length) {
    raise('vocabulary options must contain exactly five items');
  }

  const normalizedOptions = optionsInput.map((option, index) => {
    const text = normaliseOptionText(option, index);
    if (!text) {
      raise(`vocabulary option ${index + 1} missing text`);
    }
    const stripped = text
      .replace(new RegExp(`^[${CIRCLED_DIGITS.join('')}0-9A-Za-z()\.\-\s]*`), '')
      .trim();
    const snippet = normalizeWhitespace(stripTags(text));
    if (!snippet) {
      raise(`vocabulary option ${index + 1} missing snippet`);
    }
    const expected = segments[index] ? segments[index].text : null;
    if (expected && normalizeWhitespace(stripTags(text)).replace(/^[①-⑤]\s*/, '').trim().toLowerCase() !== expected.toLowerCase()) {
      raise(`vocabulary option ${index + 1} does not match passage segment`);
    }
    return `${CIRCLED_DIGITS[index]} <u>${expected}</u>`;
  });

  const answerIndex = ensureSingleAnswer(payload.correctAnswer ?? payload.answer);
  if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > CIRCLED_DIGITS.length) {
    raise('vocabulary correctAnswer out of range');
  }

  const explanation = String(payload.explanation || '').trim();
  if (!containsHangul(explanation)) {
    raise('vocabulary explanation must be Korean');
  }
  if (explanation.length < MIN_EXPLANATION_LENGTH || countSentences(explanation) < MIN_EXPLANATION_SENTENCES) {
    raise('vocabulary explanation too short');
  }

  const optionReasons = normaliseOptionReasons(payload.optionReasons || payload.distractorReasons || payload.distractors || []);
  if (Object.keys(optionReasons).length < 1 || !optionReasons[CIRCLED_DIGITS[answerIndex - 1]]) {
    raise('vocabulary optionReasons must include the incorrect expression');
  }

  const correction = normaliseCorrection(payload.correction || payload.corrections);
  if (!correction || !correction.replacement) {
    raise('vocabulary correction replacement missing');
  }

  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, {
    docTitle,
    documentCode
  });

  const metadata = {
    documentTitle: docTitle,
    generator: 'openai',
    incorrectIndex: answerIndex,
    optionReasons,
    correction,
    difficulty: payload.difficulty || payload.level || 'csat-advanced'
  };
  if (payload.variantTag || payload.variant) {
    metadata.variantTag = payload.variantTag || payload.variant;
  }

  return {
    id: payload.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'vocabulary',
    question,
    mainText: passage,
    passage,
    options: normalizedOptions,
    answer: String(answerIndex),
    correctAnswer: String(answerIndex),
    explanation,
    sourceLabel,
    difficulty: metadata.difficulty,
    metadata
  };
}

module.exports = {
  VOCAB_USAGE_BASE_QUESTION: DEFAULT_QUESTION,
  VOCAB_USAGE_QUESTION_VARIANTS: QUESTION_VARIANTS,
  VOCAB_USAGE_JSON_BLUEPRINT: VOCAB_JSON_BLUEPRINT,
  VOCAB_MIN_EXPLANATION_LENGTH: MIN_EXPLANATION_LENGTH,
  VOCAB_MIN_EXPLANATION_SENTENCES: MIN_EXPLANATION_SENTENCES,
  normalizeVocabularyPayload
};
