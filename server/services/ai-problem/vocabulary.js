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

  const rawQuestion = (context.questionText || String(payload.question || '')).replace(/\[\d+\]\s*$/, '').trim();
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
  // Enforce concise underlined spans to avoid full-sentence underlines (strict mode)
  if (STRICT_VOCAB) {
    const MAX_WORDS = 3; // KSAT 스타일: 핵심 단어/구 중심
    segments.forEach((seg, idx) => {
      const wc = countWords(seg.text || '');
      if (wc < 1 || wc > MAX_WORDS) {
        raise(`vocabulary underlined segment ${idx + 1} has invalid length (${wc} words)`);
      }
    });
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
    const snippet = normalizeWhitespace(stripTags(text));
    if (!snippet) {
      raise(`vocabulary option ${index + 1} missing snippet`);
    }
    const expected = segments[index] ? segments[index].text : null;
    if (expected && snippet.replace(/^[①-⑤]\s*/, '').trim().toLowerCase() !== expected.toLowerCase()) {
      raise(`vocabulary option ${index + 1} does not match passage segment`);
    }
    return `${CIRCLED_DIGITS[index]} <u>${expected}</u>`;
  });

  const answerMode = context.answerMode === 'correct' ? 'correct' : 'incorrect';
  const targetIncorrect = Number.isInteger(context.targetIncorrectCount) ? context.targetIncorrectCount : null;
  const targetCorrect = Number.isInteger(context.targetCorrectCount) ? context.targetCorrectCount : null;

  const uniqueAnswers = parseAnswerIndices(payload);
  const expectedCount = answerMode === 'correct'
    ? (targetCorrect !== null ? targetCorrect : 1)
    : (targetIncorrect !== null ? targetIncorrect : 1);
  if (uniqueAnswers.length !== expectedCount) {
    raise('vocabulary answer count mismatch');
  }

  const explanation = String(payload.explanation || '').trim();
  if (!containsHangul(explanation)) {
    raise('vocabulary explanation must be Korean');
  }
  if (explanation.length < MIN_EXPLANATION_LENGTH || countSentences(explanation) < MIN_EXPLANATION_SENTENCES) {
    raise('vocabulary explanation too short');
  }

  const optionReasonsInput = normaliseOptionReasons(payload.optionReasons || payload.distractorReasons || payload.distractors || []);
  if (STRICT_VOCAB) {
    const providedReasonMarkers = Object.keys(optionReasonsInput || {});
    if (providedReasonMarkers.length < 3) {
      raise('vocabulary optionReasons must include at least three entries (정답 포함)');
    }
  }
  const answerSet = new Set(uniqueAnswers);
  const optionStatuses = [];
  const optionReasons = {};

  normalizedOptions.forEach((optionText, idx) => {
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

  const firstAnswerMarker = CIRCLED_DIGITS[uniqueAnswers[0] - 1];
  if (!optionReasons[firstAnswerMarker]) {
    raise('vocabulary optionReasons must include selected 표현');
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
    answerMode,
    answerIndices: uniqueAnswers,
    optionStatuses,
    optionReasons,
    correction,
    difficulty: payload.difficulty || payload.level || 'csat-advanced'
  };
  if (payload.variantTag || payload.variant) {
    metadata.variantTag = payload.variantTag || payload.variant;
  }

  const answerValue = uniqueAnswers.join(',');

  // Ensure circled digits ①-⑤ appear exactly once before each underlined expression.
  // Guard for idempotency: if markers already exist correctly, skip rebuild.
  try {
    const underlineMatches = String(passage).match(/<u[\s\S]*?<\/u>/gi) || [];
    let markersOk = underlineMatches.length === 5;
    if (markersOk) {
      let cursor = 0;
      const passageStr = String(passage);
      for (const m of underlineMatches) {
        const idx = passageStr.indexOf(m, cursor);
        if (idx === -1) { markersOk = false; break; }
        const prevChar = idx > 0 ? passageStr.charAt(idx - 1) : '';
        if (!['\u2460','\u2461','\u2462','\u2463','\u2464'].includes(prevChar)) {
          markersOk = false;
          break;
        }
        cursor = idx + m.length;
      }
    }
    if (!markersOk) {
      const rebuilt = rebuildUnderlinesFromOptions(passage, normalizedOptions, []);
      if (rebuilt && rebuilt.mainText) {
        passage = rebuilt.mainText;
      }
    }
  } catch (e) {
    // best-effort; keep original passage if rebuild fails
  }

  return {
    id: payload.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'vocabulary',
    question,
    mainText: passage,
    passage,
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
