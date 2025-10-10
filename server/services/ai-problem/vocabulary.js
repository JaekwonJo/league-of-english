'use strict';

const {
  CIRCLED_DIGITS,
  normalizeQuestionKey,
  normalizeWhitespace,
  stripTags,
  countSentences,
  countWords,
  containsHangul,
  ensureSourceLabel
} = require('./shared');

const VOCAB_BASE_QUESTION = '다음 글의 내용과 가장 거리가 먼 것은?';
const VOCAB_QUESTION_VARIANTS = [
  VOCAB_BASE_QUESTION,
  '다음 글의 내용과 맞지 않는 것은?',
  '다음 글의 내용과 일치하지 않는 것은?'
];

const VOCAB_JSON_BLUEPRINT = `{
  "type": "vocabulary",
  "question": "${VOCAB_BASE_QUESTION}",
  "passage": "...본문 전문...",
  "options": [
    "① 진술 1",
    "② 진술 2",
    "③ 진술 3",
    "④ 진술 4",
    "⑤ 진술 5"
  ],
  "correctAnswer": 4,
  "explanation": "한국어로 최소 세 문장 정답 근거와 오답 타당성 설명",
  "sourceLabel": "출처│기관 시험명 연도 회차 문항 (pXX)",
  "distractorReasons": [
    { "label": "①", "reason": "본문과 일치" },
    { "label": "②", "reason": "본문과 일치" }
  ],
  "vocabFocus": "usage",
  "difficulty": "중상",
  "variantTag": "V-110"
}`;

const VOCAB_MIN_EXPLANATION_LENGTH = 140;
const VOCAB_MIN_EXPLANATION_SENTENCES = 3;

const questionKeySet = new Set(
  VOCAB_QUESTION_VARIANTS.map((variant) => normalizeQuestionKey(variant))
);

function normalizeVocabularyPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('vocabulary payload missing');
  }

  const failureReasons = Array.isArray(context?.failureReasons) ? context.failureReasons : null;
  const registerFailure = (msg) => {
    const message = String(msg || 'vocabulary validation error');
    if (failureReasons && !failureReasons.includes(message)) {
      failureReasons.push(message);
    }
    return message;
  };
  const raise = (msg) => {
    throw new Error(registerFailure(msg));
  };

  const docTitle = context.docTitle;
  const question = String(payload.question || '').trim() || VOCAB_BASE_QUESTION;
  const questionKey = normalizeQuestionKey(question);
  if (!questionKeySet.has(questionKey)) {
    raise(`unexpected vocabulary question: ${question}`);
  }

  const originalPassageRaw = context.passage
    ? String(context.passage)
    : String(payload.originalPassage || payload.sourcePassage || '').trim();

  const passage = String(payload.passage || payload.text || payload.mainText || originalPassageRaw || '').trim();
  if (!passage) {
    raise('vocabulary passage missing');
  }

  const rawOptions = Array.isArray(payload.options) ? payload.options : [];
  if (rawOptions.length !== CIRCLED_DIGITS.length) {
    raise('vocabulary options must contain exactly five entries');
  }

  const optionBodies = new Set();
  const normalizedOptions = rawOptions.map((option, index) => {
    let text;
    if (typeof option === 'string') {
      text = option.trim();
    } else if (option && typeof option === 'object') {
      text = String(option.text || option.value || option.option || '').trim();
    } else {
      text = String(option || '').trim();
    }

    if (!text) {
      raise(`vocabulary option ${index + 1} missing text`);
    }

    const stripLeading = (value) => value
      .replace(new RegExp(`^[${CIRCLED_DIGITS.join('')}]+\s*`), '')
      .replace(/^[0-9]+[.)\-]?\s*/, '')
      .replace(/^[A-Ea-e][.)\-]?\s*/, '')
      .trim();

    let body = stripLeading(text);
    if (!body) {
      raise(`vocabulary option ${index + 1} missing body after cleanup`);
    }

    const wordCount = countWords(body);
    if (wordCount < 2 || wordCount > 14) {
      raise(`vocabulary option ${index + 1} must be 2-14 words`);
    }

    if (/^[A-Z]/.test(body) && !/^[A-Z]['a-z]/.test(body)) {
      body = body.charAt(0).toLowerCase() + body.slice(1);
    }

    const normalizedKey = body.toLowerCase();
    if (optionBodies.has(normalizedKey)) {
      raise(`vocabulary option ${index + 1} duplicates another option`);
    }
    optionBodies.add(normalizedKey);

    return `${CIRCLED_DIGITS[index]} ${body}`;
  });

  const answerValue = payload.correctAnswer ?? payload.answer;
  const answerIndex = Number.parseInt(Array.isArray(answerValue) ? answerValue[0] : answerValue, 10);
  if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > CIRCLED_DIGITS.length) {
    raise('vocabulary correctAnswer out of range');
  }

  const explanation = String(payload.explanation || '').trim();
  if (!containsHangul(explanation)) {
    raise('vocabulary explanation must be Korean');
  }
  if (explanation.length < VOCAB_MIN_EXPLANATION_LENGTH || countSentences(explanation) < VOCAB_MIN_EXPLANATION_SENTENCES) {
    raise('vocabulary explanation too short');
  }

  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, {
    docTitle,
    documentCode: context.documentCode
  });

  const normalizedOriginal = originalPassageRaw ? normalizeWhitespace(stripTags(originalPassageRaw)) : '';
  if (normalizedOriginal) {
    const normalizedCurrent = normalizeWhitespace(stripTags(passage));
    if (normalizedCurrent.length + 40 < normalizedOriginal.length) {
      raise('vocabulary passage truncated');
    }
  }

  const distractorReasonsRaw = Array.isArray(payload.distractorReasons)
    ? payload.distractorReasons
    : Array.isArray(payload.distractors)
      ? payload.distractors
      : [];
  const distractorReasons = {};
  distractorReasonsRaw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const rawLabel = String(entry.label || entry.option || entry.choice || '').trim();
    if (!rawLabel) return;
    const normalizedLabel = rawLabel.replace(/[^①-⑤]/g, '') || rawLabel;
    if (!normalizedLabel) return;
    const reason = String(entry.reason || entry.explanation || '').trim();
    if (!reason) return;
    distractorReasons[normalizedLabel] = reason;
  });

  const metadata = {
    documentTitle: docTitle,
    generator: 'openai',
    vocabFocus: payload.vocabFocus || payload.focus || undefined,
    difficulty: payload.difficulty || payload.level || 'csat-advanced',
    variantTag: payload.variantTag || payload.variant || undefined,
    distractorReasons
  };

  return {
    id: payload.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'vocabulary',
    question: VOCAB_BASE_QUESTION,
    mainText: passage,
    passage,
    originalPassage: originalPassageRaw ? normalizeWhitespace(originalPassageRaw) : undefined,
    options: normalizedOptions,
    answer: String(answerIndex),
    correctAnswer: String(answerIndex),
    explanation,
    sourceLabel,
    difficulty: 'csat-advanced',
    metadata
  };
}

module.exports = {
  VOCAB_BASE_QUESTION,
  VOCAB_JSON_BLUEPRINT,
  VOCAB_MIN_EXPLANATION_LENGTH,
  VOCAB_MIN_EXPLANATION_SENTENCES,
  normalizeVocabularyPayload
};
