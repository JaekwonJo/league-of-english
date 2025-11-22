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
  // Fisher-Yates Shuffle
  for (let i = size - 1; i > 0; i--) {
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
    '- DO NOT rewrite or summarize the passage. The goal is to create a blank from the EXACT source text.',
    '- DO NOT return the "text" or "passage" field in JSON. We will reconstruct it programmatically.',
    '- Identify ONE key expression to blank out. It MUST be a contiguous span of text found VERBATIM in the passage.',
    '- Return `targetExpression`: The exact string to be removed.',
    '- Provide five options (①-⑤). The correct answer (e.g., ③) MUST be a paraphrase or synonym of the target expression, NOT the exact same word.',
    '- Explain in friendly, easy Korean (use emojis 💡, ❌) why the answer fits and distractors fail.'
  ];

  const promptSections = [
    'You are a deterministic KSAT blank cloze generator.',
    'Manual excerpt:',
    manualExcerpt,
    '',
    `Original Passage:\n${String(passage || '').trim()}`,
    '',
    'Return raw JSON only (no Markdown) with this structure:',
    `{ 
  "type": "blank",
  "question": "${BLANK_GENERAL_QUESTION}",
  "targetExpression": "exact phrase from text",
  "strategy": "paraphrasing",
  "options": ["① ...", "② ...", "③ ...", "④ ...", "⑤ ..."],
  "correctAnswer": 3,
  "explanation": "friendly Korean explanation",
  "sourceLabel": "출처..."
}`,
    '',
    'Requirements:',
    ...requirements,
    ...extraDirectives
  ];

  return promptSections.join('\n');
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
  if (message.includes('verbatim') || message.includes('target not found')) {
    directives.push('- The `targetExpression` MUST be a substring found exactly in the Original Passage.');
  }
  return directives;
}

function normalizeBlankPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') throw new Error('blank payload missing');

  // 1. Source of Truth: The Original Passage
  const originalPassageRaw = context.passage ? String(context.passage) : '';
  if (!originalPassageRaw) throw new Error('Original passage is required for strict blank generation.');
  
  const { normalizeForPassage } = require('./shared');
  const normalizedOriginal = normalizeForPassage(originalPassageRaw);

  // 2. Extract Target
  let target = String(payload.targetExpression || payload.target || '').trim();
  
  const optionsInfo = normalizeBlankOptions(payload.options || []);
  let answerNumber = Number(payload.correctAnswer || payload.answer);
  if (!Number.isInteger(answerNumber) || answerNumber < 1 || answerNumber > CIRCLED_DIGITS.length) {
    answerNumber = 1; 
  }
  let answerIndex = answerNumber - 1;
  
  if (!target) {
    target = optionsInfo.rawTexts[answerIndex] || optionsInfo.texts[answerIndex] || '';
  }

  // 3. Locate Target in Original Passage (Strict Search)
  if (!target) throw new Error('No target expression identified.');
  
  const esc = escapeRegex(target).replace(/\s+/g, '\\s+');
  const pattern = new RegExp(esc, 'i');
  const match = normalizedOriginal.match(pattern);

  if (!match) {
    const altTarget = optionsInfo.rawTexts[answerIndex];
    const altEsc = escapeRegex(altTarget).replace(/\s+/g, '\\s+');
    const altMatch = normalizedOriginal.match(new RegExp(altEsc, 'i'));
    
    if (altMatch) {
      target = altMatch[0];
    } else {
      // Fallback: Try to find a fuzzy match or substring if exact match fails
      throw new Error(`Target "${target}" not found verbatim in original passage. AI hallucinations prevented.`);
    }
  } else {
    target = match[0];
  }

  // 4. Construct the Problem using ORIGINAL passage
  const prefix = normalizedOriginal.slice(0, match ? match.index : normalizedOriginal.indexOf(target));
  const suffix = normalizedOriginal.slice((match ? match.index : normalizedOriginal.indexOf(target)) + target.length);
  const finalPassage = `${prefix}____${suffix}`;

  // Recalculate options shuffle
  const shuffleOrder = shuffleIndices(CIRCLED_DIGITS.length);
  const originalToNewIndex = Array.from({ length: CIRCLED_DIGITS.length }, (_, i) => i);
  shuffleOrder.forEach((fromIdx, newIdx) => {
    originalToNewIndex[fromIdx] = newIdx;
  });
  // const reorderedTexts = shuffleOrder.map(i => optionsInfo.texts[i]); // Unused
  const formattedOptions = shuffleOrder.map((oldIdx, newIdx) => `${CIRCLED_DIGITS[newIdx]} ${optionsInfo.texts[oldIdx]}`);
  const newAnswerNum = shuffleOrder.indexOf(answerIndex) + 1;

  // Ensure normalizedText actually contains "____"
  if (!BLANK_PLACEHOLDER_REGEX.test(finalPassage)) {
     // Fallback logic if needed
  }

  // --- Explanation Fix Logic ---
  const finalAnswerSymbol = CIRCLED_DIGITS[newAnswerNum - 1];
  let finalExplanation = String(payload.explanation || '').trim();
  
  finalExplanation = finalExplanation.replace(/정답은\s*[①②③④⑤\d]+\s*(번?)\s*입니다/g, `정답은 ${finalAnswerSymbol}$1입니다`);
  finalExplanation = finalExplanation.replace(/따라서\s*[①②③④⑤\d]+\s*(번?)\s*이/g, `따라서 ${finalAnswerSymbol}$1이`);
  finalExplanation = finalExplanation.replace(/답은\s*[①②③④⑤\d]+\s*(번?)\s*입니다/g, `답은 ${finalAnswerSymbol}$1입니다`);

  const explanation = finalExplanation;
  if (!explanation || !containsHangul(explanation)) {
    throw new Error('blank explanation must be Korean');
  }
  
  const rawSourceLabel = payload.sourceLabel || payload.source || (payload.notes && payload.notes.sourceLabel);
  const sourceLabel = ensureSourceLabel(rawSourceLabel, {
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

  const resolvedQuestion = resolveBlankQuestionText(String(payload.question || '')) || { canonical: BLANK_GENERAL_QUESTION, type: 'general' };
  const family = BLANK_FAMILY_TO_QUESTION[resolvedQuestion.type] === 'definition' ? 'C-2' : 'C-1';
  const strategy = payload.strategy || 'paraphrasing';

  const metadata = {
    blankFamily: family,
    blankStrategy: strategy,
    family,
    strategy,
    targetExpression: target,
    normalizedOriginalPassage: normalizedOriginal,
    originalPassageLength: normalizedOriginal.length,
    originalSentenceCount: countSentences(normalizedOriginal),
    fallacies: optionsInfo.fallacies,
    distractorReasons,
    rawQuestion: String(payload.question || ''),
    targetSpan: target
  };

  return {
    id: payload.id || `blank_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'blank',
    question: resolvedQuestion.canonical,
    questionFamily: family,
    strategy,
    targetExpression: target,
    text: finalPassage,
    passage: finalPassage,
    originalPassage: normalizedOriginal,
    options: formattedOptions,
    correctAnswer: newAnswerNum,
    answer: newAnswerNum,
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
