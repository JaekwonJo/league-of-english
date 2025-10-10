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

const UNDERLINE_PATTERN = /<u>([^<]+)<\/u>/gi;
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/;

const VOCAB_BASE_QUESTION = '밑줄 친 단어와 의미가 가장 가까운 것을 고르시오.';
const VOCAB_QUESTION_VARIANTS = [
  VOCAB_BASE_QUESTION,
  '밑줄 친 표현과 의미가 가장 가까운 것은?',
  '밑줄 단어의 의미로 가장 적절한 것을 고르시오.'
];

const VOCAB_JSON_BLUEPRINT = `{
  "type": "vocabulary",
  "question": "${VOCAB_BASE_QUESTION}",
  "passage": "...<u>highlight</u>...",
  "targetWord": "highlight",
  "targetLemma": "highlight",
  "targetMeaning": "(명사) 핵심, 강조",
  "options": [
    "① emphasis",
    "② climax",
    "③ summary",
    "④ digression",
    "⑤ insight"
  ],
  "correctAnswer": 1,
  "explanation": "한국어로 최소 세 문장 정답 근거와 오답 타당성 설명",
  "sourceLabel": "출처│기관 시험명 연도 회차 문항 (pXX)",
  "distractorReasons": [
    { "label": "②", "reason": "climax는 가장 절정의 순간이라 의미가 달라요." },
    { "label": "④", "reason": "digression은 벗어남이라는 뜻이라 어울리지 않아요." }
  ],
  "lexicalNote": {
    "partOfSpeech": "noun",
    "nuance": "중요한 부분을 강조할 때 쓰는 표현",
    "example": "This paragraph is the highlight of the report."
  },
  "difficulty": "중상",
  "variantTag": "V-220"
}`;

const VOCAB_MIN_EXPLANATION_LENGTH = 140;
const VOCAB_MIN_EXPLANATION_SENTENCES = 3;
const VOCAB_MIN_OPTION_WORDS = 1;
const VOCAB_MAX_OPTION_WORDS = 4;

const questionKeySet = new Set(
  VOCAB_QUESTION_VARIANTS.map((variant) => normalizeQuestionKey(variant))
);

function extractUnderlinedSegments(text = '') {
  const matches = [];
  let match;
  while ((match = UNDERLINE_PATTERN.exec(text)) !== null) {
    const segment = String(match[1] || '').trim();
    if (segment.length) {
      matches.push(segment);
    }
  }
  return matches;
}

function findSentenceContaining(rawText = '', keyword = '') {
  if (!rawText || !keyword) return null;
  const normalizedKeyword = keyword.trim().toLowerCase();
  return rawText
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .find((sentence) => sentence.toLowerCase().includes(normalizedKeyword))
    || null;
}

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

  let passage = String(payload.passage || payload.text || payload.mainText || originalPassageRaw || '').trim();
  if (!passage) {
    raise('vocabulary passage missing');
  }

  const underlinedSegments = extractUnderlinedSegments(passage);
  if (!underlinedSegments.length) {
    raise('vocabulary passage must include an underlined target word');
  }

  const targetWord = String(payload.targetWord || underlinedSegments[0] || '').trim();
  if (!targetWord) {
    raise('vocabulary target word missing');
  }

  const targetLemma = String(payload.targetLemma || payload.baseLemma || '').trim() || null;
  const targetMeaning = String(payload.targetMeaning || payload.koreanMeaning || '').trim() || null;
  const targetNuance = String(payload.targetNuance || payload.lexicalNuance || '').trim() || null;
  const targetPartOfSpeech = String(
    payload.lexicalNote?.partOfSpeech || payload.partOfSpeech || payload.targetPartOfSpeech || ''
  ).trim() || null;
  const targetExample = String(
    payload.lexicalNote?.example || payload.exampleSentence || payload.targetExample || ''
  ).trim() || null;

  const normalizedPassage = normalizeWhitespace(stripTags(passage));
  const normalizedOriginal = originalPassageRaw
    ? normalizeWhitespace(stripTags(originalPassageRaw))
    : '';
  if (normalizedOriginal && normalizedPassage.length + 40 < normalizedOriginal.length) {
    raise('vocabulary passage truncated');
  }

  const wordSentence = findSentenceContaining(normalizedPassage, underlinedSegments[0]);

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
    if (wordCount < VOCAB_MIN_OPTION_WORDS || wordCount > VOCAB_MAX_OPTION_WORDS) {
      raise(`vocabulary option ${index + 1} must be ${VOCAB_MIN_OPTION_WORDS}-${VOCAB_MAX_OPTION_WORDS} words`);
    }

    if (!/^[A-Za-z]/.test(body)) {
      raise(`vocabulary option ${index + 1} must start with an English letter`);
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
    difficulty: payload.difficulty || payload.level || 'csat-advanced',
    variantTag: payload.variantTag || payload.variant || undefined,
    distractorReasons,
    lexicalNote: {
      targetWord,
      lemma: targetLemma || undefined,
      meaning: targetMeaning || undefined,
      nuance: targetNuance || undefined,
      partOfSpeech: targetPartOfSpeech || undefined,
      example: targetExample || undefined,
      targetSentence: wordSentence || undefined
    }
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
  VOCAB_MIN_OPTION_WORDS,
  VOCAB_MAX_OPTION_WORDS,
  normalizeVocabularyPayload
};
