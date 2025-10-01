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

const VOCAB_BASE_QUESTION = '(A), (B), (C)의 각 네모 안에서 문맥에 맞는 낱말로 가장 적절한 것은?';
const VOCAB_QUESTION_VARIANTS = [
  VOCAB_BASE_QUESTION,
  '(A), (B), (C)의 각 네모 안에서 문맥에 맞는 말로 가장 적절한 것은?'
];

const VOCAB_JSON_BLUEPRINT = `{
  "type": "vocabulary",
  "question": "${VOCAB_BASE_QUESTION}",
  "passage": "... (A) [resolved / raised] ... (B) [presence / absence] ... (C) [transfer / transform] ...",
  "slots": [
    {"label": "A", "choices": ["resolved", "raised"], "correctIndex": 0, "explanation": "문맥상 문제를 해결한 사람이 적합"},
    {"label": "B", "choices": ["presence", "absence"], "correctIndex": 0, "explanation": "긍정적 에너지의 존재가 필요"},
    {"label": "C", "choices": ["transfer", "transform"], "correctIndex": 0, "explanation": "에너지가 전달된다"}
  ],
  "options": [
    "① resolved - presence - transform",
    "② raised - presence - transfer",
    "③ resolved - presence - transfer",
    "④ resolved - absence - transfer",
    "⑤ raised - absence - transform"
  ],
  "correctAnswer": 3,
  "explanation": "한국어로 최소 세 문장 정답 근거와 오답 결함 설명",
  "sourceLabel": "출처│기관 시험명 연도 회차 문항 (pXX)",
  "vocabFocus": "collocation",
  "difficulty": "중상",
  "variantTag": "V-103"
}`;

const VOCAB_MIN_EXPLANATION_LENGTH = 120;
const VOCAB_MIN_EXPLANATION_SENTENCES = 3;
const MIN_SLOT_CHOICES = 2;

const questionKeySet = new Set(
  VOCAB_QUESTION_VARIANTS.map((variant) => normalizeQuestionKey(variant))
);

const sanitizeToken = (token) => String(token || '')
  .replace(/^[\s\u0028\uFF08\[{]+/, '')
  .replace(/[\s\u0029\uFF09\]}]+$/, '')
  .replace(/\s+/g, ' ')
  .trim();

function parseChoiceIndex(value, max) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 0 && value < max ? value : null;
  }
  const str = String(value).trim();
  if (!str) return null;
  const parsed = parseInt(str, 10);
  if (Number.isInteger(parsed)) {
    const index = parsed >= 0 && parsed < max ? parsed : parsed - 1;
    return index >= 0 && index < max ? index : null;
  }
  return null;
}

function normalizeVocabularyPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('vocabulary payload missing');
  }

  const docTitle = context.docTitle;
  const rawQuestion = String(payload.question || '').trim() || VOCAB_BASE_QUESTION;
  const normalizedQuestionKey = normalizeQuestionKey(rawQuestion);
  if (!questionKeySet.has(normalizedQuestionKey)) {
    throw new Error(`unexpected vocabulary question: ${rawQuestion}`);
  }

  const originalPassageRaw = context.passage
    ? String(context.passage)
    : String(payload.originalPassage || payload.sourcePassage || '').trim();

  const passage = String(payload.passage || payload.text || payload.mainText || originalPassageRaw || '').trim();
  if (!passage) {
    throw new Error('vocabulary passage missing');
  }

  const rawSlots = Array.isArray(payload.slots) ? payload.slots : [];
  if (!rawSlots.length) {
    throw new Error('vocabulary slots missing');
  }

  const slotMap = new Map();
  const normalizedSlots = rawSlots.map((slot, index) => {
    if (!slot || typeof slot !== 'object') {
      throw new Error('vocabulary slot entry invalid');
    }
    const label = String(slot.label || String.fromCharCode(65 + index)).trim().toUpperCase();
    if (!/^[A-Z]$/.test(label)) {
      throw new Error(`invalid slot label: ${label}`);
    }
    if (slotMap.has(label)) {
      throw new Error(`duplicate slot label: ${label}`);
    }

    const rawChoices = Array.isArray(slot.choices) ? slot.choices : [];
    if (rawChoices.length < MIN_SLOT_CHOICES) {
      throw new Error(`slot ${label} requires at least ${MIN_SLOT_CHOICES} choices`);
    }

    const normalizedChoices = rawChoices.map((choice) => {
      const cleaned = sanitizeToken(choice);
      if (!cleaned) {
        throw new Error(`slot ${label} contains empty choice`);
      }
      return cleaned;
    });

    const uniqueChoices = new Set(normalizedChoices);
    if (uniqueChoices.size !== normalizedChoices.length) {
      throw new Error(`slot ${label} contains duplicate choices`);
    }

    let correctIndex = parseChoiceIndex(slot.correctIndex, normalizedChoices.length);
    if (correctIndex === null && slot.correctChoice) {
      const target = sanitizeToken(slot.correctChoice);
      correctIndex = normalizedChoices.indexOf(target);
      correctIndex = correctIndex === -1 ? null : correctIndex;
    }
    if (correctIndex === null && slot.answer) {
      const target = sanitizeToken(slot.answer);
      correctIndex = normalizedChoices.indexOf(target);
      correctIndex = correctIndex === -1 ? null : correctIndex;
    }

    const explanation = slot.explanation ? String(slot.explanation).trim() : undefined;

    const slotData = {
      label,
      normalizedChoices,
      displayChoices: rawChoices.map((choice) => String(choice || '').trim()),
      correctIndex,
      explanation
    };

    slotMap.set(label, slotData);
    return slotData;
  });

  normalizedSlots.sort((a, b) => a.label.localeCompare(b.label));

  normalizedSlots.forEach((slot) => {
    const pattern = new RegExp(`\\(${slot.label}\\)`);
    if (!pattern.test(passage)) {
      throw new Error(`passage missing slot marker (${slot.label})`);
    }
  });

  const optionStrings = Array.isArray(payload.options)
    ? payload.options.map((option) => String(option || '').trim()).filter(Boolean)
    : [];
  if (optionStrings.length !== CIRCLED_DIGITS.length) {
    throw new Error('vocabulary options must contain 5 entries');
  }

  const slotOrder = normalizedSlots.map((slot) => slot.label);
  const slotIndexMap = new Map(slotOrder.map((label, idx) => [label, idx]));

  const combinationIndices = optionStrings.map((option, index) => {
    if (!option.startsWith(CIRCLED_DIGITS[index])) {
      throw new Error(`vocabulary option ${index + 1} missing circled digit`);
    }
    const body = option.slice(CIRCLED_DIGITS[index].length).trim();
    if (!body) {
      throw new Error(`vocabulary option ${index + 1} missing combination body`);
    }
    const parts = body.split(/\s*-\s*/).map(sanitizeToken).filter(Boolean);
    if (parts.length !== normalizedSlots.length) {
      throw new Error(`vocabulary option ${index + 1} has ${parts.length} selections but expected ${normalizedSlots.length}`);
    }

    const indices = parts.map((value, slotIdx) => {
      const slot = normalizedSlots[slotIdx];
      const choiceIndex = slot.normalizedChoices.indexOf(value);
      if (choiceIndex === -1) {
        throw new Error(`vocabulary option ${index + 1} contains unknown choice "${value}" for slot ${slot.label}`);
      }
      return choiceIndex;
    });

    return { raw: option, indices };
  });

  let answerIndex = null;
  const answerCandidates = [];
  const answerKeys = ['correctAnswer', 'answer'];
  answerKeys.forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        const parsed = parseInt(entry, 10);
        if (Number.isInteger(parsed)) answerCandidates.push(parsed);
      });
    } else {
      String(value)
        .split(/[\s,]+/)
        .filter(Boolean)
        .forEach((token) => {
          const parsed = parseInt(token, 10);
          if (Number.isInteger(parsed)) answerCandidates.push(parsed);
        });
    }
  });

  if (answerCandidates.length) {
    const unique = [...new Set(answerCandidates)];
    if (unique.length !== 1) {
      throw new Error('vocabulary correctAnswer must be a single index');
    }
    answerIndex = unique[0];
  }

  if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > CIRCLED_DIGITS.length) {
    throw new Error('vocabulary correctAnswer out of range');
  }

  const correctCombination = combinationIndices[answerIndex - 1];
  if (!correctCombination) {
    throw new Error('vocabulary correctAnswer combination missing');
  }

  correctCombination.indices.forEach((choiceIdx, slotIdx) => {
    const slot = normalizedSlots[slotIdx];
    if (choiceIdx < 0 || choiceIdx >= slot.normalizedChoices.length) {
      throw new Error('vocabulary correctAnswer combination invalid');
    }
    if (slot.correctIndex === null || slot.correctIndex === undefined) {
      slot.correctIndex = choiceIdx;
    } else if (slot.correctIndex !== choiceIdx) {
      throw new Error(`slot ${slot.label} correctIndex mismatch with correctAnswer`);
    }
  });

  const normalizedOptions = combinationIndices.map(({ indices }, optionIdx) => {
    const parts = indices.map((choiceIndex, slotIdx) => {
      const slot = normalizedSlots[slotIdx];
      return slot.displayChoices[choiceIndex] || slot.normalizedChoices[choiceIndex];
    });
    return `${CIRCLED_DIGITS[optionIdx]} ${parts.join(' - ')}`;
  });

  const explanation = String(payload.explanation || '').trim();
  if (!containsHangul(explanation)) {
    throw new Error('vocabulary explanation must be Korean');
  }
  if (explanation.length < VOCAB_MIN_EXPLANATION_LENGTH || countSentences(explanation) < VOCAB_MIN_EXPLANATION_SENTENCES) {
    throw new Error('vocabulary explanation too short');
  }

  const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, { docTitle });

  const normalizedOriginal = originalPassageRaw ? normalizeWhitespace(stripTags(originalPassageRaw)) : '';
  if (normalizedOriginal) {
    const normalizedCurrent = normalizeWhitespace(stripTags(passage));
    if (normalizedCurrent.length + 40 < normalizedOriginal.length) {
      throw new Error('vocabulary passage truncated');
    }
  }

  const metadata = {
    documentTitle: docTitle,
    generator: 'openai',
    vocabFocus: payload.vocabFocus || payload.focus || undefined,
    difficulty: payload.difficulty || payload.level || 'csat-advanced',
    variantTag: payload.variantTag || payload.variant || undefined,
    vocabSlots: normalizedSlots.map((slot) => ({
      label: slot.label,
      choices: slot.displayChoices,
      correctIndex: slot.correctIndex,
      explanation: slot.explanation
    })),
    optionCombinationIndices: combinationIndices.map(({ indices }) => indices)
  };

  if (normalizedOriginal) {
    metadata.originalPassageLength = normalizedOriginal.length;
    const sentenceCount = countSentences(normalizedOriginal);
    if (sentenceCount) {
      metadata.originalSentenceCount = sentenceCount;
    }
  }

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
