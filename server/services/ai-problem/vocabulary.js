'use strict';

const {
  CIRCLED_DIGITS,
  normalizeQuestionKey,
  normalizeWhitespace,
  stripTags,
  countSentences,
  containsHangul,
  ensureSourceLabel,
  labelToIndex,
  countWords
} = require('./shared');
const { rebuildUnderlinesFromOptions } = require('./underlined');

const UNDERLINE_PATTERN = /<u>([\s\S]*?)<\/u>/gi;
const DEFAULT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?';
const MULTI_INCORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것을 모두 고르시오.';
const SINGLE_CORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 올바른 것은?';
const MULTI_CORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 올바른 것을 모두 고르시오.';
const QUESTION_VARIANTS = [
  DEFAULT_QUESTION,
  '다음 글의 밑줄 친 부분 중 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
  '다음 글의 밑줄 친 부분 중, 문맥상 어색한 표현은?',
  MULTI_INCORRECT_QUESTION,
  SINGLE_CORRECT_QUESTION,
  MULTI_CORRECT_QUESTION
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

const MIN_EXPLANATION_LENGTH = 64; // encourage richer Korean rationale
// Dynamic strictness via env flag (production can enable 3-sentence minimum)
const STRICT_VOCAB = String(process.env.LOE_STRICT_VOCAB || (process.env.NODE_ENV === 'production' ? '1' : '')).trim() === '1';
const MIN_EXPLANATION_SENTENCES = STRICT_VOCAB ? 3 : 1;

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

function parseAnswerIndices(payload) {
  const answerCandidates = [];
  ['correctAnswers', 'answers', 'answer', 'correctAnswer', 'answerIndices'].forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const num = Number.parseInt(item, 10);
        if (Number.isInteger(num)) answerCandidates.push(num);
      });
    } else {
      String(value)
        .split(/[\s,]+/)
        .filter(Boolean)
        .forEach((token) => {
          const num = Number.parseInt(token, 10);
          if (Number.isInteger(num)) answerCandidates.push(num);
        });
    }
  });
  return [...new Set(answerCandidates.filter((num) => Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length))].sort((a, b) => a - b);
}

function normalizeVocabularyPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('vocabulary payload missing');
  }

  // 1. Source of Truth: Original Passage (for validation)
  const originalPassageRaw = context.passage ? String(context.passage) : '';
  if (!originalPassageRaw) {
    throw new Error('Vocabulary generation requires original passage context');
  }
  const { normalizeForPassage } = require('./shared');
  const normalizedOriginal = normalizeForPassage(originalPassageRaw);
  const originalLower = normalizedOriginal.toLowerCase();

  // 2. AI's Passage (contains <u> tags and modified words)
  let aiPassage = String(payload.passage || payload.text || '').trim();
  if (!aiPassage) throw new Error('Vocabulary passage missing from AI');
  
  // Clean up AI passage
  aiPassage = stripJsonFences(aiPassage);
  
  // 3. Extract Options from AI Passage
  const aiSegments = collectUnderlinedSegments(aiPassage);
  if (aiSegments.length !== CIRCLED_DIGITS.length) {
    throw new Error(`AI passage has wrong number of underlines (${aiSegments.length})`);
  }

  const uniqueAnswers = parseAnswerIndices(payload);
  const answerMode = context.answerMode === 'correct' ? 'correct' : 'incorrect';
  
  // 4. Validation: Check if the "Incorrect" answer is actually different from Original
  // (Only for 'incorrect' mode, which is the standard type)
  if (answerMode === 'incorrect' && uniqueAnswers.length > 0) {
      const ansIdx = uniqueAnswers[0] - 1;
      const answerWord = aiSegments[ansIdx].text;
      
      // Strict Check: If the "Changed Word" exists verbatim in the original text, 
      // it means AI probably didn't change it (or changed it to another word that also exists).
      // We want to ensure it's a NEW word (Antonym).
      // Checking if it exists *anywhere* is a bit too strict, but safe.
      // Better: check if it exists at the *approximate position*.
      // But for now, simple exclusion is safer to force variety.
      
      if (originalLower.includes(answerWord.toLowerCase())) {
          // It might be a common word "is", "not".
          // But for content words, it implies failure to paraphrase.
          // Let's allow it ONLY if the surrounding context is different? No.
          // Throw error to force retry.
          throw new Error(`AI failed to generate a distinct incorrect word. The word "${answerWord}" appears in the original text.`);
      }
  }

  const normalizedOptions = aiSegments.map((seg, i) => {
    return `${CIRCLED_DIGITS[i]} <u>${seg.text}</u>`;
  });

  const explanation = String(payload.explanation || '').trim();
  if (!containsHangul(explanation)) {
    throw new Error('vocabulary explanation must be Korean');
  }

  const optionReasonsInput = normaliseOptionReasons(payload.optionReasons || payload.distractorReasons || payload.distractors || []);
  const answerSet = new Set(uniqueAnswers);
  const optionStatuses = [];
  const optionReasons = {};

  normalizedOptions.forEach((_, idx) => {
    const marker = CIRCLED_DIGITS[idx];
    const isAnswer = answerSet.has(idx + 1);
    const status = answerMode === 'incorrect'
      ? (isAnswer ? 'incorrect' : 'correct')
      : (isAnswer ? 'correct' : 'incorrect');
    optionStatuses.push(status);
    const baseReason = optionReasonsInput[marker];
    if (baseReason) {
      optionReasons[marker] = baseReason;
    } else {
      optionReasons[marker] = status === 'incorrect'
        ? `${marker}번 표현은 문맥과 맞지 않아 교정이 필요합니다.`
        : `${marker}번 표현은 문맥에 자연스럽습니다.`;
    }
  });

  const correction = normaliseCorrection(payload.correction || payload.corrections);
  const docTitle = context.docTitle;
  const documentCode = context.documentCode;
  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, {
    docTitle,
    documentCode
  });

  const rawQuestion = (context.questionText || String(payload.question || '')).replace(/\[\d+\]\s*$/, '').trim();
  const questionKey = normalizeQuestionKey(rawQuestion || DEFAULT_QUESTION);
  const question = QUESTION_VARIANTS.find((variant) => normalizeQuestionKey(variant) === questionKey) || DEFAULT_QUESTION;

  const answerValue = uniqueAnswers.join(',');

  const metadata = {
    documentTitle: docTitle,
    generator: 'openai',
    answerMode,
    answerIndices: uniqueAnswers,
    optionStatuses,
    optionReasons,
    correction,
    difficulty: payload.difficulty || payload.level || 'csat-advanced'
  };

  return {
    id: payload.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'vocabulary',
    question,
    mainText: aiPassage,
    passage: aiPassage,
    options: normalizedOptions,
    answer: answerValue,
    correctAnswer: answerValue,
    explanation,
    sourceLabel,
    difficulty: metadata.difficulty,
    metadata
  };
}

module.exports = {
  VOCAB_USAGE_BASE_QUESTION: DEFAULT_QUESTION,
  VOCAB_USAGE_MULTI_INCORRECT_QUESTION: MULTI_INCORRECT_QUESTION,
  VOCAB_USAGE_SINGLE_CORRECT_QUESTION: SINGLE_CORRECT_QUESTION,
  VOCAB_USAGE_MULTI_CORRECT_QUESTION: MULTI_CORRECT_QUESTION,
  VOCAB_USAGE_QUESTION_VARIANTS: QUESTION_VARIANTS,
  VOCAB_USAGE_JSON_BLUEPRINT: VOCAB_JSON_BLUEPRINT,
  VOCAB_MIN_EXPLANATION_LENGTH: MIN_EXPLANATION_LENGTH,
  VOCAB_MIN_EXPLANATION_SENTENCES: MIN_EXPLANATION_SENTENCES,
  normalizeVocabularyPayload
};
