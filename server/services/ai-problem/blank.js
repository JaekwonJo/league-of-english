'use strict';

const {
  CIRCLED_DIGITS,
  normalizeWhitespace,
  normalizeQuestionKey,
  escapeRegex,
  countSentences,
  countWords,
  replaceDigitsWithWords,
  isEnglishPhrase,
  labelToIndex,
  ensureSourceLabel,
  containsHangul
} = require('./shared');

const BLANK_GENERAL_QUESTION = '다음 빈칸에 들어갈 말로 가장 적절한 것은?';
const BLANK_GENERAL_VARIANTS = [
  BLANK_GENERAL_QUESTION,
  `${BLANK_GENERAL_QUESTION} `,
  `${BLANK_GENERAL_QUESTION}\n`,
  `${BLANK_GENERAL_QUESTION}\r\n`
];
const BLANK_DEFINITION_QUESTION = '다음 글의 빈칸에 들어갈 단어의 영어 풀의로 가장 적절한 것은?';
const BLANK_DEFINITION_VARIANTS = [
  BLANK_DEFINITION_QUESTION,
  `${BLANK_DEFINITION_QUESTION} `,
  `${BLANK_DEFINITION_QUESTION}\n`,
  `${BLANK_DEFINITION_QUESTION}\r\n`
];

const BLANK_FAMILY_CODES = new Set(['C-1', 'C-2', 'C-3', 'C-4']);
const BLANK_FAMILY_TO_QUESTION = {
  'C-1': 'general',
  'C-2': 'definition',
  'C-3': 'general',
  'C-4': 'general'
};
const BLANK_ALLOWED_STRATEGIES = new Set(['paraphrasing', 'compression', 'generalization', 'minimal-change']);
const BLANK_OPTION_MIN_WORDS = 3;
const BLANK_OPTION_MAX_WORDS = 18;
const MIN_BLANK_TEXT_LENGTH = 150;
const MIN_BLANK_SENTENCE_COUNT = 2;
const MIN_BLANK_OPTION_LENGTH = 3;
const BLANK_PLACEHOLDER_REGEX = /_{2,}|\(\s*\)|\[\s*\]|\bblank\b/i;

const BLANK_JSON_BLUEPRINT = `{
  "questionFamily": "C-1",
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
  "text": "Researchers once expected ____ to offer the quickest relief, yet the data now favours slower but steadier reforms.",
  "targetExpression": "a swift round of tax cuts",
  "strategy": "paraphrasing",
  "options": [
    {"label": "①", "text": "strict civilian oversight committees", "fallacy": "scope-shift"},
    {"label": "②", "text": "identical spending caps for all regions", "fallacy": "over-generalisation"},
    {"label": "③", "text": "a swift round of tax cuts", "fallacy": "correct"},
    {"label": "④", "text": "delayed investment packages", "fallacy": "delay-bias"},
    {"label": "⑤", "text": "relief funds for unrelated projects", "fallacy": "off-topic"}
  ],
  "correctAnswer": 3,
  "distractorReasons": [
    {"label": "①", "reason": "감독 틀을 바꾸어 핵심 논지에서 벗어남", "fallacy": "scope-shift"},
    {"label": "②", "reason": "모든 지역을 똑같이 취급해 본문 조건을 무시함", "fallacy": "over-generalisation"},
    {"label": "④", "reason": "즉각적 개입이 아닌 지연 전략을 제안함", "fallacy": "delay-bias"},
    {"label": "⑤", "reason": "재원을 엉뚱한 분야로 돌려 본문의 문제를 해결하지 못함", "fallacy": "off-topic"}
  ],
  "explanation": "본문은 신속하지만 단기적인 감세보다 데이터를 기반으로 한 점진적 개혁이 더 큰 효과를 낸다고 강조한다. 따라서 (③) 'launching a swift round of tax cuts'가 원문의 핵심 주장과 일치한다. 다른 선택지는 감독 범위를 바꾸거나, 모든 지역에 동일한 상한을 적용하거나, 개입을 미루는 등 본문의 해결책과 어긋난다.",
  "sourceLabel": "출처│기관 연도 회차 문항 (pXX)",
  "notes": {
    "targetExpression": "a swift round of tax cuts",
    "difficulty": "advanced",
    "estimatedAccuracy": 52
  }
}`;

function shuffleIndices(size) {
  const indices = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function buildQuestionResolver(canonical, variants = []) {
  const map = new Map();
  const entries = [canonical, ...variants];
  entries.forEach((item) => {
    const key = normalizeQuestionKey(item);
    if (key && !map.has(key)) {
      map.set(key, canonical);
    }
  });
  return map;
}

const BLANK_GENERAL_MAP = buildQuestionResolver(BLANK_GENERAL_QUESTION, BLANK_GENERAL_VARIANTS);
const BLANK_DEFINITION_MAP = buildQuestionResolver(BLANK_DEFINITION_QUESTION, BLANK_DEFINITION_VARIANTS);

function resolveBlankQuestionText(question) {
  const key = normalizeQuestionKey(question);
  if (!key) return null;
  if (BLANK_GENERAL_MAP.has(key)) {
    return { canonical: BLANK_GENERAL_MAP.get(key), type: 'general' };
  }
  if (BLANK_DEFINITION_MAP.has(key)) {
    return { canonical: BLANK_DEFINITION_MAP.get(key), type: 'definition' };
  }
  return null;
}

function normalizeBlankOptions(rawOptions = []) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    throw new Error('blank options missing');
  }

  const size = CIRCLED_DIGITS.length;
  const formatted = new Array(size).fill(null);
  const texts = new Array(size).fill(null);
  const rawTexts = new Array(size).fill(null);
  const fallacies = {};
  const reasonMap = {};
  const available = new Set(Array.from({ length: size }, (_, i) => i));

  rawOptions.forEach((entry, rawIndex) => {
    let label;
    let rawText = '';
    let fallacy;
    let reason;

    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      const prefix = trimmed.slice(0, 1);
      if (CIRCLED_DIGITS.includes(prefix)) {
        label = prefix;
        rawText = trimmed.slice(1).trim();
      } else {
        rawText = trimmed;
      }
    } else if (entry && typeof entry === 'object') {
      label = entry.label || entry.symbol || entry.id || entry.choice || entry.option;
      rawText = entry.text || entry.value || entry.phrase || entry.option || '';
      fallacy = entry.fallacy || entry.trap || entry.tag || entry.defect;
      reason = entry.reason || entry.rationale || entry.explanation;
    } else {
      throw new Error('blank options contain invalid entry');
    }

    let index = labelToIndex(label, undefined);
    if (index === undefined || !available.has(index)) {
      index = available.size ? Math.min(...available) : rawIndex;
    }
    if (!available.has(index)) {
      throw new Error('duplicate option labels detected');
    }
    available.delete(index);

    const originalValue = String(rawText || '').trim();
    let optionValue = originalValue
      .replace(/[’]/g, "'")
      .replace(/[“”]/g, '"')
      .trim();
    optionValue = replaceDigitsWithWords(optionValue)
      .replace(/\s+/g, ' ')
      .trim();

    if (!optionValue) {
      throw new Error(`blank option ${index + 1} missing value`);
    }
    if (!isEnglishPhrase(optionValue)) {
      throw new Error(`blank option ${index + 1} must be an English phrase`);
    }
    if (/\d/.test(optionValue)) {
      throw new Error(`blank option ${index + 1} must not contain numerals`);
    }
    const wordCount = countWords(optionValue);
    if (wordCount < BLANK_OPTION_MIN_WORDS || wordCount > BLANK_OPTION_MAX_WORDS) {
      throw new Error(`blank option ${index + 1} must be ${BLANK_OPTION_MIN_WORDS}-${BLANK_OPTION_MAX_WORDS} words`);
    }
    if (/^(to\s+|[a-z]+ing\b)/i.test(optionValue)) {
      throw new Error(`blank option ${index + 1} must start with a noun phrase`);
    }

    const circled = CIRCLED_DIGITS[index];
    formatted[index] = `${circled} ${optionValue}`;
    texts[index] = optionValue;
    rawTexts[index] = originalValue.trim();
    if (fallacy) {
      fallacies[circled] = String(fallacy).trim();
    }
    if (reason) {
      reasonMap[circled] = String(reason).trim();
    }
  });

  if (formatted.some((value) => !value)) {
    throw new Error('blank options must contain 5 entries');
  }

  return {
    formatted,
    texts,
    rawTexts,
    fallacies,
    reasons: reasonMap
  };
}

function buildBlankPrompt({ passage, manualExcerpt, extraDirectives = [] }) {
  const requirements = [
    '- Preserve the original passage sentences and replace exactly one expression with "____".',
    '- Return the full passage verbatim (no sentence deletion or summarising) except for the blanked expression.',
    '- Output the indices of the blanked expression as `targetSpan: { start, end }` (0-based, end exclusive). Do not modify the passage; the server will replace that slice with "____".',
    '- Select a family C-1, C-2, C-3, or C-4. Use the definition-style Korean prompt only for C-2.',
    '- Provide five English answer choices labelled ①-⑤. Each option must be a natural noun phrase of 3-18 words (e.g., "a swift round of tax cuts"), without numerals or Korean text. Do not start with gerunds or infinitives.',
    '- Include the original removed wording in "targetExpression" and specify the strategy used (paraphrasing, compression, generalization, minimal-change).',
    '- Explain in friendly, plain Korean with at least three sentences: (1) 핵심 메시지 요약, (2) 정답 근거, (3) 두 개 이상 오답 결함. 쉬운 단어로 단계별로 써 주세요(불릿 허용), 마무리에 격려 이모지 1개 정도 허용(예: 😊).',
    '- Provide `distractorReasons` covering every incorrect option with one-sentence Korean rationales.'
  ];

  const promptSections = [
    'You are a deterministic KSAT English blank cloze item writer. Adhere strictly to the Claude × ChatGPT unified manual.',
    'Manual excerpt (truncated):',
    manualExcerpt,
    '',
    `Passage (retain sentences verbatim; do not summarise):\n${String(passage || '').trim()}`,
    '',
    'Return raw JSON only with this structure:',
    BLANK_JSON_BLUEPRINT,
    '',
    'Generation requirements:',
    ...requirements
  ];

  if (extraDirectives && extraDirectives.length) {
    promptSections.push('', 'Additional fixes based on the previous attempt:', ...extraDirectives);
  }

  return promptSections.filter(Boolean).join('\n');
}

function deriveBlankDirectives(lastFailure = '') {
  const message = String(lastFailure || '').toLowerCase();
  if (!message) return [];
  const directives = [];
  if (message.includes('placeholder')) {
    directives.push('- Ensure the passage contains exactly one blank represented as "____" and nothing else.');
  }
  if (message.includes('numeral') || message.includes('digit')) {
    directives.push('- Spell out any numbers in the options and avoid numerals or time abbreviations.');
  }
  if (message.includes('english phrase') || message.includes('alphabetic')) {
    directives.push('- Options must be natural English phrases (letters, spaces, and punctuation only).');
  }
  if (message.includes('text too short') || message.includes('more sentences')) {
    directives.push(`- Keep at least two full sentences around the blank and ensure the passage excerpt stays over ${MIN_BLANK_TEXT_LENGTH} characters.`);
  }
  if (message.includes('option') && (message.includes('words') || message.includes('too short'))) {
    directives.push(`- Expand every answer choice into a ${BLANK_OPTION_MIN_WORDS}-${BLANK_OPTION_MAX_WORDS} word descriptive phrase (예: "extend the library's opening hours" → 6 words).`);
  }
  if (message.includes('noun phrase')) {
    directives.push('- 시작을 명사구로 작성하고, 동사원형(to ...)이나 현재분사(~ing)로 시작하지 마세요.');
  }
  if (message.includes('missing original sentences') || message.includes('missing sentence count')) {
    directives.push('- Output the full original passage and keep every sentence intact, only replacing the target expression with "____".');
  }
  if (message.includes('sentence')) {
    directives.push('- Provide at least two complete sentences around the blank (150+ characters).');
  }
  if (message.includes('explanation')) {
    directives.push('- Write the explanation in Korean as 최소 3문장으로, 정답 근거와 두 개 이상의 오답 결함을 분명히 언급하세요.');
  }
  if (message.includes('deviates') || message.includes('except blank')) {
    directives.push('- Return the original passage verbatim and replace only the target expression with "____"; do not paraphrase or reorder any sentence.');
  }
  if (message.includes('distractor') || message.includes('reason')) {
    directives.push('- Provide distractorReasons for every incorrect option with 한 문장짜리 한국어 근거를 채워 주세요.');
  }
  return directives;
}

function normalizeBlankPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('blank payload missing');
  }

  const rawQuestion = String(payload.question || '').trim();
  const questionInfo = resolveBlankQuestionText(rawQuestion);
  if (!questionInfo) {
    throw new Error('unexpected blank question');
  }

  let familyRaw = payload.questionFamily || payload.family || payload.blankFamily || payload.manualFamily;
  if (!familyRaw && payload.notes && typeof payload.notes === 'object') {
    familyRaw = payload.notes.family || payload.notes.questionFamily;
  }
  let family = familyRaw ? String(familyRaw).toUpperCase() : null;
  if (!family) {
    family = questionInfo.type === 'definition' ? 'C-2' : 'C-1';
  }
  if (!BLANK_FAMILY_CODES.has(family)) {
    throw new Error('invalid blank family');
  }
  const expectedQuestionType = BLANK_FAMILY_TO_QUESTION[family];
  if (expectedQuestionType && expectedQuestionType !== questionInfo.type) {
    throw new Error('question-family mismatch');
  }

  let strategyRaw = payload.strategy || payload.answerStrategy || payload.solutionStrategy;
  if (!strategyRaw && payload.notes && typeof payload.notes === 'object') {
    strategyRaw = payload.notes.strategy;
  }
  let strategy = strategyRaw ? String(strategyRaw).toLowerCase() : '';
  if (strategy && !BLANK_ALLOWED_STRATEGIES.has(strategy)) {
    throw new Error('invalid blank strategy');
  }
  if (!strategy) {
    strategy = 'paraphrasing';
  }

  const STRICT_REQUIRE_TARGETSPAN = String(process.env.LOE_STRICT_BLANK || '').trim().toLowerCase() === '1'
    || String(process.env.LOE_STRICT_BLANK || '').trim().toLowerCase() === 'true';

  // If strict mode is on, targetSpan must be present to guarantee exact blanking on original passage
  if (STRICT_REQUIRE_TARGETSPAN && (!payload.targetSpan
    || !Number.isInteger(payload.targetSpan.start)
    || !Number.isInteger(payload.targetSpan.end))) {
    throw new Error('blank targetSpan required');
  }

  // If targetSpan is provided, derive targetExpression and text from the original passage deterministically
  if (context.passage && payload && payload.targetSpan && Number.isInteger(payload.targetSpan.start) && Number.isInteger(payload.targetSpan.end)) {
    const original = String(context.passage);
    const s = Math.max(0, payload.targetSpan.start);
    const e = Math.min(original.length, payload.targetSpan.end);
    if (e <= s) throw new Error('blank targetSpan invalid');
    targetExpression = original.slice(s, e);
    const left = original.slice(0, s);
    const right = original.slice(e);
    const derived = `${left}____${right}`;
    const derivedNormalized = normalizeWhitespace(derived);
    const originalNormalized = normalizeWhitespace(original);
    if (derivedNormalized.replace(/____/g, targetExpression) !== originalNormalized) {
      throw new Error('blank derived text deviates from original except blank');
    }
    const resolvedQuestion = resolveBlankQuestionText(String(payload.question || '')) || { canonical: BLANK_GENERAL_QUESTION, type: 'general' };
    return {
      id: payload.id || `blank_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'blank',
      question: resolvedQuestion.canonical,
      questionFamily: BLANK_FAMILY_TO_QUESTION[resolvedQuestion.type] === 'definition' ? 'C-2' : 'C-1',
      strategy: 'minimal-change',
      targetExpression: normalizeWhitespace(targetExpression),
      text: derivedNormalized,
      mainText: derivedNormalized,
      passage: derivedNormalized,
      originalPassage: originalNormalized,
      options: normalizeBlankOptions(payload.options || []).formatted,
      answer: Number(payload.correctAnswer || payload.answer || 0) || 1,
      correctAnswer: Number(payload.correctAnswer || payload.answer || 0) || 1,
      explanation: String(payload.explanation || '').trim(),
      sourceLabel: ensureSourceLabel(payload.sourceLabel || payload.source, {
        docTitle: context.docTitle,
        documentCode: context.documentCode
      }),
      distractorReasons: {},
      metadata: {
        family: BLANK_FAMILY_TO_QUESTION[resolvedQuestion.type] === 'definition' ? 'C-2' : 'C-1',
        blankFamily: BLANK_FAMILY_TO_QUESTION[resolvedQuestion.type] === 'definition' ? 'C-2' : 'C-1',
        strategy: 'minimal-change',
        targetExpression: normalizeWhitespace(targetExpression),
        normalizedOriginalPassage: originalNormalized
      }
    };
  }

  let text = String(payload.text || payload.passage || '')
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
  if (!text) {
    throw new Error('blank text missing placeholder');
  }

  const normalizedText = normalizeWhitespace(text);

  const optionsInfo = normalizeBlankOptions(payload.options || []);
  let answerNumber = Number(payload.correctAnswer || payload.answer);
  if (!Number.isInteger(answerNumber) || answerNumber < 1 || answerNumber > CIRCLED_DIGITS.length) {
    throw new Error('invalid blank correctAnswer');
  }
  let answerIndex = answerNumber - 1;

  const shuffleOrder = shuffleIndices(CIRCLED_DIGITS.length);
  const needsShuffle = shuffleOrder.some((originalIdx, newIdx) => originalIdx !== newIdx);
  let originalToNewIndex = Array.from({ length: CIRCLED_DIGITS.length }, (_, idx) => idx);
  if (needsShuffle) {
    originalToNewIndex = new Array(CIRCLED_DIGITS.length);
    shuffleOrder.forEach((fromIdx, newIdx) => {
      originalToNewIndex[fromIdx] = newIdx;
    });
    const reorderedTexts = shuffleOrder.map((fromIdx, newIdx) => {
      const value = optionsInfo.texts[fromIdx];
      return `${CIRCLED_DIGITS[newIdx]} ${value}`;
    });
    const reorderedPlainTexts = shuffleOrder.map((fromIdx) => optionsInfo.texts[fromIdx]);
    const reorderedRawTexts = shuffleOrder.map((fromIdx) => optionsInfo.rawTexts[fromIdx]);

    const remapByDigit = (sourceMap) => {
      const result = {};
      shuffleOrder.forEach((fromIdx, newIdx) => {
        const oldDigit = CIRCLED_DIGITS[fromIdx];
        const newDigit = CIRCLED_DIGITS[newIdx];
        if (sourceMap && sourceMap[oldDigit]) {
          result[newDigit] = sourceMap[oldDigit];
        }
      });
      return result;
    };

    const shuffledFallacies = remapByDigit(optionsInfo.fallacies);
    const shuffledReasons = remapByDigit(optionsInfo.reasons);

    optionsInfo.formatted = reorderedTexts;
    optionsInfo.texts = reorderedPlainTexts;
    optionsInfo.rawTexts = reorderedRawTexts;
    optionsInfo.fallacies = shuffledFallacies;
    optionsInfo.reasons = shuffledReasons;

    const newAnswerIdx = shuffleOrder.indexOf(answerIndex);
    if (newAnswerIdx === -1) {
      throw new Error('blank answer lost during shuffle');
    }
    answerIndex = newAnswerIdx;
    answerNumber = newAnswerIdx + 1;
  }

  const targetExpressionRaw = payload.targetExpression || payload.target || (payload.notes && payload.notes.targetExpression);
  let targetExpression = targetExpressionRaw ? String(targetExpressionRaw).trim() : '';
  if (!targetExpression) {
    targetExpression = optionsInfo.rawTexts[answerIndex]
      ? String(optionsInfo.rawTexts[answerIndex]).trim()
      : optionsInfo.texts[answerIndex] || '';
  }

  if (targetExpression) {
    const targetTokens = new Set(
      String(targetExpression)
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((token) => token.length >= 4)
    );
    if (targetTokens.size) {
      const correctOptionTokens = String(optionsInfo.texts[answerIndex] || '')
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((token) => token.length >= 4);
      if (!correctOptionTokens.some((token) => targetTokens.has(token))) {
        throw new Error('blank correct option must echo target expression');
      }
    }
  }

  if (!BLANK_PLACEHOLDER_REGEX.test(text)) {
    const candidates = [];
    if (targetExpression) {
      candidates.push(targetExpression);
    }
    if (optionsInfo.texts[answerIndex]) {
      candidates.push(optionsInfo.texts[answerIndex]);
    }

    for (const candidateRaw of candidates) {
      if (!candidateRaw) continue;

      const variantSet = new Set();
      const baseVariant = String(candidateRaw)
        .replace(/[’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

      if (!baseVariant) continue;

      variantSet.add(baseVariant);
      if (candidateRaw !== baseVariant) {
        variantSet.add(String(candidateRaw).trim());
      }

      for (const variant of variantSet) {
        if (!variant) continue;
        const pattern = new RegExp(`\n?${escapeRegex(variant)}`, 'i');
        if (pattern.test(text)) {
          text = text.replace(pattern, '____');
          break;
        }
      }

      if (BLANK_PLACEHOLDER_REGEX.test(text)) {
        break;
      }
    }
  }

  const placeholderMatches = text.match(BLANK_PLACEHOLDER_REGEX) || [];
  if (placeholderMatches.length !== 1) {
    throw new Error('blank text missing placeholder');
  }

  const originalPassageRaw = context && context.passage ? String(context.passage) : '';
  const normalizedOriginalPassage = originalPassageRaw ? normalizeWhitespace(originalPassageRaw) : '';
  if (normalizedText.length < MIN_BLANK_TEXT_LENGTH) {
    throw new Error('blank text too short');
  }
  if (countSentences(normalizedText) < MIN_BLANK_SENTENCE_COUNT) {
    throw new Error('blank text requires more sentences');
  }

  if (normalizedOriginalPassage) {
    const originalLength = normalizedOriginalPassage.length;
    const allowedDelta = Math.max(120, Math.floor(originalLength * 0.1));
    if (normalizedText.length < originalLength - allowedDelta) {
      throw new Error('blank text missing original sentences');
    }
    const originalSentenceCount = countSentences(normalizedOriginalPassage);
    if (originalSentenceCount >= 2) {
      const normalizedSentenceCount = countSentences(normalizedText);
      if (normalizedSentenceCount + 1 < originalSentenceCount) {
        throw new Error('blank text missing sentence count');
      }
    }

    // Strict check: original passage must be identical except for the single blank
    if (targetExpression) {
      const restored = String(normalizedText).replace(BLANK_PLACEHOLDER_REGEX, String(targetExpression));
      const restoredNormalized = normalizeWhitespace(restored);
      const originalNormalized = normalizeWhitespace(normalizedOriginalPassage);
      if (restoredNormalized !== originalNormalized) {
        throw new Error('blank passage deviates from original except blank');
      }
    }
  }

  const explanation = String(payload.explanation || '').trim();
  if (!explanation || !containsHangul(explanation)) {
    throw new Error('blank explanation must be Korean');
  }
  if (explanation.length < 80 || countSentences(explanation) < 3) {
    throw new Error('blank explanation too short');
  }

  const rawSource = payload.sourceLabel || payload.source || (payload.notes && payload.notes.sourceLabel);
  const sourceLabel = ensureSourceLabel(rawSource, {
    docTitle: context.docTitle,
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
    const idx = labelToIndex(entry.label, null);
    if (idx === null || idx === answerIndex) return;
    const mappedIndex = originalToNewIndex[idx] ?? idx;
    if (mappedIndex === answerIndex) return;
    const circled = CIRCLED_DIGITS[mappedIndex];
    const reason = String(entry.reason || entry.rationale || entry.explanation || '').trim();
    if (reason) {
      distractorReasons[circled] = reason;
    }
    if (entry.fallacy && !optionsInfo.fallacies[circled]) {
      optionsInfo.fallacies[circled] = String(entry.fallacy).trim();
    }
  });

  const metadata = {
    blankFamily: family,
    blankStrategy: strategy,
    family,
    strategy,
    targetExpression,
    normalizedOriginalPassage,
    originalPassageLength: normalizedOriginalPassage.length,
    originalSentenceCount: normalizedOriginalPassage ? countSentences(normalizedOriginalPassage) : undefined,
    fallacies: optionsInfo.fallacies,
    distractorReasons,
    rawQuestion
  };

  return {
    id: payload.id || `blank_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'blank',
    question: questionInfo.canonical,
    questionFamily: family,
    strategy,
    targetExpression,
    text: normalizedText,
    mainText: normalizedText,
    passage: normalizedText,
    originalPassage: normalizedOriginalPassage,
    options: optionsInfo.formatted,
    answer: answerNumber,
    correctAnswer: answerNumber,
    explanation,
    sourceLabel,
    distractorReasons,
    metadata
  };
}

module.exports = {
  BLANK_PLACEHOLDER_REGEX,
  BLANK_OPTION_MIN_WORDS,
  BLANK_OPTION_MAX_WORDS,
  MIN_BLANK_TEXT_LENGTH,
  MIN_BLANK_SENTENCE_COUNT,
  MIN_BLANK_OPTION_LENGTH,
  BLANK_ALLOWED_STRATEGIES,
  BLANK_FAMILY_CODES,
  BLANK_FAMILY_TO_QUESTION,
  buildBlankPrompt,
  deriveBlankDirectives,
  normalizeBlankPayload,
  normalizeBlankOptions,
  resolveBlankQuestionText
};
