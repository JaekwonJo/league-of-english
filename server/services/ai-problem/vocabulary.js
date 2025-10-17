'use strict';

const {
  CIRCLED_DIGITS,
  normalizeQuestionKey,
  normalizeWhitespace,
  stripTags,
  countSentences,
  containsHangul,
  ensureSourceLabel,
  convertStarsToUnderline,
  labelToIndex,
  escapeRegex
} = require('./shared');
const {
  normalizeUnderlinedOptions
} = require('./underlined');

const UNDERLINE_PATTERN = /<u[\s\S]*?<\/u>/gi;

const VOCAB_USAGE_BASE_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?';
const VOCAB_USAGE_MULTI_INCORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것을 모두 고르시오.';
const VOCAB_USAGE_DOUBLE_INCORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것을 2개 고르시오.';
const VOCAB_USAGE_TRIPLE_INCORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것을 3개 고르시오.';
const VOCAB_USAGE_CORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절한 것은?';

function stripUnderlineTags(value = '') {
  const match = String(value || '').match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
  if (match && match[1]) {
    return normalizeWhitespace(match[1]);
  }
  return normalizeWhitespace(stripTags(value || ''));
}

function extractPassageSegments(text = '') {
  const segments = [];
  const regex = /<u[\s\S]*?>([\s\S]*?)<\/u>/gi;
  let match;
  while ((match = regex.exec(String(text || ''))) !== null) {
    segments.push(match[0]);
  }
  return segments;
}

function expressionAppearsIn(original = '', segment = '') {
  if (!original || !segment) return false;
  const safe = escapeRegex(segment);
  const boundary = new RegExp(`(^|[^A-Za-z])${safe}([^A-Za-z]|$)`, 'i');
  if (boundary.test(original)) {
    return true;
  }
  return original.includes(segment);
}
const VOCAB_USAGE_QUESTION_VARIANTS = [
  VOCAB_USAGE_BASE_QUESTION,
  '다음 글의 밑줄 친 부분 중 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
  '다음 글의 밑줄 친 ①~⑤ 중 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
  '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?(2개)',
  '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하 지 않은 것은?',
  '다음 글의 밑줄 친 부분 중 문맥상 어색한 것을 고르시오.',
  '밑줄 친 ①~⑤ 중 문맥상 어색한 표현은?',
  '밑줄 친 ①~⑤ 흐름 상 가장 알맞지 않은 어휘는?',
  VOCAB_USAGE_MULTI_INCORRECT_QUESTION,
  VOCAB_USAGE_DOUBLE_INCORRECT_QUESTION,
  VOCAB_USAGE_TRIPLE_INCORRECT_QUESTION,
  VOCAB_USAGE_CORRECT_QUESTION,
  '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절한 것을 고르시오.'
];


const VOCAB_USAGE_JSON_BLUEPRINT = `{
  \"type\": \"vocabulary_usage\",
  \"question\": \"${VOCAB_USAGE_BASE_QUESTION}\",
  \"passage\": \"... <u>표현</u> ...\",
  \"options\": [
    \"① <u>표현</u>\",
    \"② <u>표현</u>\",
    \"③ <u>표현</u>\",
    \"④ <u>표현</u>\",
    \"⑤ <u>표현</u>\"
  ],
  \"correctAnswers\": [3],
  \"explanation\": \"한국어 해설 (최소 세 문장)\",
  \"sourceLabel\": \"출처│문서명 no1\",
  \"variantTag\": \"V-001\",
  \"corrections\": [
    { \"label\": \"③\", \"replacement\": \"올바른 표현\", \"reason\": \"세부 이유\" }
  ],
  \"optionReasons\": [
    { \"label\": \"③\", \"reason\": \"③번이 문맥상 어색한 이유\" },
    { \"label\": \"①\", \"reason\": \"①번이 적절한 이유\" }
  ]
}`;
const VOCAB_USAGE_QUESTION_KEY_TO_TEXT = new Map();
VOCAB_USAGE_QUESTION_VARIANTS.forEach((variant) => {
  VOCAB_USAGE_QUESTION_KEY_TO_TEXT.set(normalizeQuestionKey(variant), variant);
});
const VOCAB_USAGE_QUESTION_KEYS = new Set(VOCAB_USAGE_QUESTION_KEY_TO_TEXT.keys());

const VOCAB_MIN_EXPLANATION_LENGTH = 150;
const VOCAB_MIN_EXPLANATION_SENTENCES = 3;

function extractUnderlinedSegments(text = '') {
  const matches = String(text || '')
    .match(UNDERLINE_PATTERN) || [];
  return matches.map((segment) => stripTags(segment).trim()).filter(Boolean);
}

function normalizeVocabularyPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('vocabulary payload missing');
  }

  const failureReasons = Array.isArray(context?.failureReasons) ? context.failureReasons : null;
  const docTitle = context.docTitle;
  const documentCode = context.documentCode;

  const rawQuestion = String(payload.question || '').trim() || VOCAB_USAGE_BASE_QUESTION;
  const questionKey = normalizeQuestionKey(rawQuestion);
  if (!VOCAB_USAGE_QUESTION_KEYS.has(questionKey)) {
    throw new Error('unexpected vocabulary question');
  }
  let question = VOCAB_USAGE_QUESTION_KEY_TO_TEXT.get(questionKey) || VOCAB_USAGE_BASE_QUESTION;
  if (context.questionText) {
    const expectedKey = normalizeQuestionKey(context.questionText);
    if (expectedKey !== questionKey) {
      throw new Error('vocabulary question mismatch');
    }
    question = context.questionText;
  }

  const answerMode = context.answerMode === 'correct' ? 'correct' : 'incorrect';
  const totalSegments = CIRCLED_DIGITS.length;
  let targetIncorrectCount = Number.isInteger(context.targetIncorrectCount)
    ? context.targetIncorrectCount
    : answerMode === 'incorrect'
      ? 1
      : totalSegments - 1;
  let targetCorrectCount = Number.isInteger(context.targetCorrectCount)
    ? context.targetCorrectCount
    : answerMode === 'incorrect'
      ? totalSegments - targetIncorrectCount
      : 1;

  if (answerMode === 'correct') {
    targetIncorrectCount = totalSegments - targetCorrectCount;
  }

  if (targetIncorrectCount < 0 || targetCorrectCount < 0 || targetIncorrectCount + targetCorrectCount !== totalSegments) {
    throw new Error('vocabulary target counts invalid');
  }

  const originalPassageRaw = context.passage
    ? String(context.passage)
    : String(payload.originalPassage || payload.sourcePassage || payload.passageOriginal || '').trim();

  let mainText = String(payload.passage || payload.text || payload.mainText || originalPassageRaw || '').trim();
  mainText = convertStarsToUnderline(mainText);
  if (!mainText) {
    throw new Error('vocabulary passage missing');
  }

  const underlineCount = (mainText.match(UNDERLINE_PATTERN) || []).length;
  if (underlineCount !== totalSegments) {
    throw new Error('vocabulary passage must contain exactly five underlined segments');
  }

  const optionsInfo = normalizeUnderlinedOptions(payload.options || [], failureReasons);
  const optionSegments = optionsInfo.rawTexts.map((raw) => stripTags(raw || '').trim());
  if (optionSegments.some((segment) => !segment)) {
    throw new Error('vocabulary option segments missing');
  }

  const passageSegments = extractUnderlinedSegments(mainText);
  if (passageSegments.length !== totalSegments) {
    throw new Error('vocabulary passage segment mismatch');
  }

  const passageSegmentPlain = passageSegments.map((segment) => stripUnderlineTags(segment));
  const optionSegmentPlain = optionsInfo.rawTexts.map((segment) => stripUnderlineTags(segment));

  for (let i = 0; i < passageSegmentPlain.length; i += 1) {
    const passageNormalized = normalizeWhitespace(passageSegmentPlain[i] || '');
    const optionNormalized = normalizeWhitespace(optionSegmentPlain[i] || '');
    if (passageNormalized.toLowerCase() !== optionNormalized.toLowerCase()) {
      throw new Error('vocabulary option underline mismatch');
    }
  }

  const normalizedOriginalPlain = originalPassageRaw
    ? normalizeWhitespace(stripTags(convertStarsToUnderline(originalPassageRaw))).toLowerCase()
    : '';

  const answerCandidates = [];
  const answerKeys = ['correctAnswers', 'answers', 'answer', 'correctAnswer'];
  answerKeys.forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        const num = parseInt(entry, 10);
        if (Number.isInteger(num)) {
          answerCandidates.push(num);
        }
      });
    } else {
      String(value)
        .split(/[\s,]+/)
        .filter(Boolean)
        .forEach((token) => {
          const num = parseInt(token, 10);
          if (Number.isInteger(num)) {
            answerCandidates.push(num);
          }
        });
    }
  });

  optionsInfo.statuses.forEach((status, index) => {
    if (status === 'incorrect') {
      answerCandidates.push(index + 1);
    }
  });

  let selectedIndices = Array.from(new Set(answerCandidates.filter((idx) => Number.isInteger(idx) && idx >= 1 && idx <= totalSegments)));
  const expectedAnswerCount = answerMode === 'incorrect' ? targetIncorrectCount : targetCorrectCount;

  if (selectedIndices.length !== expectedAnswerCount) {
    const statusDerived = optionsInfo.statuses
      .map((status, index) => {
        const idx = index + 1;
        if (answerMode === 'incorrect') {
          return status === 'incorrect' ? idx : null;
        }
        return status === 'correct' ? idx : null;
      })
      .filter((idx) => Number.isInteger(idx));
    if (statusDerived.length === expectedAnswerCount) {
      selectedIndices = statusDerived;
    }
  }

  if (selectedIndices.length !== expectedAnswerCount) {
    throw new Error('vocabulary answer count mismatch');
  }

  const allIndices = Array.from({ length: totalSegments }, (_, index) => index + 1);
  const selectedSet = new Set(selectedIndices);
  const correctIndicesSet = answerMode === 'correct'
    ? new Set(selectedIndices)
    : new Set(allIndices.filter((idx) => !selectedSet.has(idx)));
  const incorrectIndicesSet = answerMode === 'incorrect'
    ? new Set(selectedIndices)
    : new Set(allIndices.filter((idx) => !selectedSet.has(idx)));

  if (incorrectIndicesSet.size !== targetIncorrectCount || correctIndicesSet.size !== targetCorrectCount) {
    throw new Error('vocabulary selection mismatch');
  }

  const statuses = allIndices.map((idx) => (incorrectIndicesSet.has(idx) ? 'incorrect' : 'correct'));

  const reasonMap = { ...optionsInfo.reasons };
  const tagMap = { ...optionsInfo.tags };
  const reasonCandidates = [
    payload.optionReasons,
    payload.optionRationales,
    payload.optionComments,
    payload.distractorReasons,
    payload.distractors
  ];
  reasonCandidates.forEach((collection) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const idx = labelToIndex(entry.label || entry.id || entry.option || entry.choice || entry.index, null);
      if (idx === null || idx < 0 || idx >= totalSegments) return;
      const marker = CIRCLED_DIGITS[idx];
      const reasonText = entry.reason || entry.rationale || entry.comment || entry.explanation;
      if (reasonText) {
        reasonMap[marker] = String(reasonText).trim();
      }
      const tagText = entry.tag || entry.errorType || entry.category;
      if (tagText && !tagMap[marker]) {
        tagMap[marker] = String(tagText).trim();
      }
      if (!statuses[idx]) {
        const status = entry.status || entry.correctness || entry.role;
        if (status) {
          statuses[idx] = status === 'correct' ? 'correct' : status === 'incorrect' ? 'incorrect' : statuses[idx];
        }
      }
    });
  });

  const explanation = String(payload.explanation || '').trim();
  if (!containsHangul(explanation)) {
    throw new Error('vocabulary explanation must be Korean');
  }
  if (explanation.length < VOCAB_MIN_EXPLANATION_LENGTH || countSentences(explanation) < VOCAB_MIN_EXPLANATION_SENTENCES) {
    throw new Error('vocabulary explanation too short');
  }

  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, {
    docTitle,
    documentCode
  });

  if (normalizedOriginalPlain && context.enforceOriginalComparison !== false) {
    const mutatedIndices = [];
    passageSegmentPlain.forEach((segmentValue, idx) => {
      const normalizedSegment = normalizeWhitespace(segmentValue || '').toLowerCase();
      if (!normalizedSegment) {
        return;
      }
      const appearsInOriginal = expressionAppearsIn(normalizedOriginalPlain, normalizedSegment);
      if (incorrectIndicesSet.has(idx + 1)) {
        if (appearsInOriginal) {
          throw new Error('vocabulary incorrect segment unchanged');
        }
        mutatedIndices.push(idx + 1);
      } else if (!appearsInOriginal) {
        throw new Error('vocabulary correct segment altered');
      }
    });
    if (mutatedIndices.length !== incorrectIndicesSet.size) {
      throw new Error('vocabulary mutated segment mismatch');
    }
  }

  function normaliseCorrectionEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      const replacement = entry.trim();
      return replacement ? { replacement } : null;
    }
    if (typeof entry === 'object') {
      const replacement = String(entry.replacement || entry.correct || entry.value || entry.text || '').trim();
      const reason = String(entry.reason || entry.explanation || entry.why || '').trim();
      const note = String(entry.note || entry.detail || entry.comment || '').trim();
      const result = {};
      if (replacement) result.replacement = replacement;
      if (reason) result.reason = reason;
      if (note) result.note = note;
      return Object.keys(result).length ? result : null;
    }
    return null;
  }

  const correctionEntries = [];
  if (Array.isArray(payload.corrections)) {
    payload.corrections.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const idx = labelToIndex(entry.label || entry.id || entry.option || entry.choice || entry.index, null);
      if (idx === null || idx < 0 || idx >= totalSegments) return;
      const normalized = normaliseCorrectionEntry(entry);
      if (normalized) {
        correctionEntries.push({ index: idx + 1, ...normalized });
      }
    });
  }

  const singleCorrection = normaliseCorrectionEntry(payload.correction || payload.correctUsage || payload.replacement || payload.fix);
  if (singleCorrection) {
    const targetIndex = Array.from(incorrectIndicesSet)[0] || Array.from(correctIndicesSet)[0];
    if (targetIndex) {
      correctionEntries.push({ index: targetIndex, ...singleCorrection });
    }
  }

  const correctionMap = new Map();
  correctionEntries.forEach((entry) => {
    if (!entry || !Number.isInteger(entry.index)) return;
    correctionMap.set(entry.index, entry);
  });

  const incorrectIndices = Array.from(incorrectIndicesSet).sort((a, b) => a - b);
  const correctIndices = Array.from(correctIndicesSet).sort((a, b) => a - b);
  const answerIndices = answerMode === 'incorrect' ? incorrectIndices : correctIndices;

  const lexicalNotes = incorrectIndices.map((idx) => {
    const note = {
      index: idx,
      targetWord: optionSegments[idx - 1]
    };
    const correction = correctionMap.get(idx);
    if (correction?.replacement) note.correction = correction.replacement;
    if (correction?.reason) note.reason = correction.reason;
    if (correction?.note) note.note = correction.note;
    return note;
  });

  const metadata = {
    generator: payload.generator || 'openai',
    documentTitle: docTitle,
    documentCode,
    optionReasons: Object.keys(reasonMap).length ? reasonMap : undefined,
    optionTags: Object.keys(tagMap).length ? tagMap : undefined,
    optionStatuses: statuses,
    vocabularyUsage: true,
    answerMode,
    incorrectIndices,
    correctIndices,
    expectedIncorrect: targetIncorrectCount,
    expectedCorrect: targetCorrectCount,
    underlinedSegments: passageSegments,
    lexicalNotes: lexicalNotes.length ? lexicalNotes : undefined
  };
  if (lexicalNotes[0]) {
    metadata.lexicalNote = lexicalNotes[0];
  }
  if (correctionEntries.length) {
    metadata.corrections = correctionEntries;
    metadata.correction = correctionEntries[0];
  }
  if (originalPassageRaw) {
    metadata.originalPassage = normalizeWhitespace(originalPassageRaw);
  }

  const answerValue = answerIndices.join(',');

  return {
    id: payload.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'vocabulary',
    question,
    mainText,
    passage: mainText,
    options: optionsInfo.formatted,
    answers: answerIndices,
    correctAnswers: answerIndices,
    answer: answerValue,
    correctAnswer: answerValue,
    explanation,
    sourceLabel,
    difficulty: payload.difficulty || payload.level || 'csat-advanced',
    metadata
  };
}
module.exports = {
  VOCAB_USAGE_BASE_QUESTION,
  VOCAB_USAGE_MULTI_INCORRECT_QUESTION,
  VOCAB_USAGE_DOUBLE_INCORRECT_QUESTION,
  VOCAB_USAGE_TRIPLE_INCORRECT_QUESTION,
  VOCAB_USAGE_CORRECT_QUESTION,
  VOCAB_USAGE_QUESTION_VARIANTS,
  VOCAB_USAGE_JSON_BLUEPRINT,
  VOCAB_MIN_EXPLANATION_LENGTH,
  VOCAB_MIN_EXPLANATION_SENTENCES,
  normalizeVocabularyPayload
};
