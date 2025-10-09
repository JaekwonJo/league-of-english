const database = require("../models/database");
const shared = require("./ai-problem/shared");
const blank = require("./ai-problem/blank");
const underlined = require("./ai-problem/underlined");
const vocabulary = require("./ai-problem/vocabulary");
const title = require("./ai-problem/title");
const topic = require("./ai-problem/topic");
const { logImplicitAttempt } = require("../utils/generationLogger");
const {
  readGrammarManual,
  readVocabularyManual,
  readTitleManual,
  readBlankManual,
  readTopicManual,
  readImplicitManual,
  readIrrelevantManual
} = require("./ai-problem/internal/manualLoader");
const OpenAIQueue = require("./ai-problem/internal/openAiQueue");
const { createProblemRepository } = require("./ai-problem/internal/problemRepository");

const {
  CIRCLED_DIGITS,
  SOURCE_PREFIX_REGEX,
  UNDERLINE_PATTERN,
  containsHangul,
  stripTags,
  normalizeWhitespace,
  escapeRegex,
  stripJsonFences,
  clipText,
  normalizeQuestionKey,
  countSentences,
  replaceDigitsWithWords,
  countWords,
  isEnglishPhrase,
  labelToIndex,
  ensureSourceLabel,
  convertStarsToUnderline,
  isPlaceholderSourceLabel
} = shared;

const {
  BLANK_PLACEHOLDER_REGEX,
  BLANK_OPTION_MIN_WORDS,
  BLANK_OPTION_MAX_WORDS,
  MIN_BLANK_TEXT_LENGTH,
  MIN_BLANK_SENTENCE_COUNT,
  buildBlankPrompt,
  deriveBlankDirectives,
  normalizeBlankPayload
} = blank;

const {
  normalizeUnderlinedOptions,
  rebuildUnderlinesFromOptions,
  normalizeOptionStatus
} = underlined;

const {
  VOCAB_BASE_QUESTION,
  VOCAB_JSON_BLUEPRINT,
  VOCAB_MIN_EXPLANATION_LENGTH,
  VOCAB_MIN_EXPLANATION_SENTENCES,
  normalizeVocabularyPayload
} = vocabulary;

const {
  buildTitlePrompt,
  normalizeTitlePayload,
  validateTitleProblem
} = title;

const {
  buildTopicPrompt,
  normalizeTopicPayload,
  validateTopicProblem
} = topic;

let OpenAI = null;
try {
  OpenAI = require("openai");
} catch (error) {
  console.warn("[aiProblemService] OpenAI SDK unavailable:", error?.message || error);
}

const TOPIC_QUESTION = "\ub2e4\uc74c \uae00\uc758 \uc8fc\uc81c\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
const IMPLICIT_QUESTION = "\ub2e4\uc74c \uae00\uc5d0\uc11c \ubc11\uc904 \uce5c \ubd80\ubd84\uc774 \uc758\ubbf8\ud558\ub294 \ubc14\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc740?";
const IRRELEVANT_QUESTION = "\ub2e4\uc74c \uae00\uc5d0\uc11c \uc804\uccb4 \ud750\ub984\uacfc \uad00\uacc4 \uc5c6\ub294 \ubb38\uc7a5\uc740?";
const IRRELEVANT_QUESTION_VARIANTS = [
  IRRELEVANT_QUESTION,
  "\ub2e4\uc74c \uae00\uc5d0\uc11c \uc804\uccb4 \ud750\ub984\uacfc \uad00\uacc4\uc5c6\ub294 \ubb38\uc7a5\uc740?",
  "\ub2e4\uc74c \uae00\uc758 \uc804\uccb4\uc801\uc778 \ud750\ub984\uc5d0\uc11c \ubb38\ub9e5\uc0c1 \uc5b4\uc11c\ud55c \ubd80\ubd84\uc774 \uc788\ub294 \ubb38\uc7a5\uc740?",
  "\ub2e4\uc74c \uae00\uc758 \ud750\ub984\uc0c1, \ubc11\uc904 \uce5c (A)\uc640 \uad00\ub828\uc774 \uc5c6\ub294 \uac83\uc740?"
];

const {
  getManualExcerpt: getSummaryManualExcerpt,
  buildPrompt: buildSummaryPrompt,
  coerceSummaryProblem,
  validateSummaryProblem
} = require("../utils/summaryTemplate");

const {
  buildGrammarPrompt,
  validateGrammarProblem,
  CIRCLED_DIGITS: GRAMMAR_DIGITS,
  BASE_QUESTION,
  MULTI_QUESTION,
  GRAMMAR_MIN_EXPLANATION_LENGTH,
  GRAMMAR_MIN_EXPLANATION_SENTENCES
} = require("../utils/eobeopTemplate");


class AIProblemService {
  constructor() {
    this._openai = null;
    this.queue = new OpenAIQueue(() => this.getOpenAI());
    this.repository = createProblemRepository(database);
  }

  callChatCompletion(config, options = {}) {
    return this.queue.callChatCompletion(config, options);
  }

  async markExposures(userId, problemIds = []) {
    return this.repository.markExposures(userId, problemIds);
  }

  getOpenAI() {
    if (!OpenAI || !process.env.OPENAI_API_KEY) return null;
    if (!this._openai) {
      this._openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._openai;
  }

  async getPassages(documentId) {
    const doc = await database.get("SELECT * FROM documents WHERE id = ?", [documentId]);
    if (!doc) throw new Error("Document not found");
    let passages = [];
    let parsedContent = null;
    try {
      parsedContent = JSON.parse(doc.content);
      if (Array.isArray(parsedContent.passages) && parsedContent.passages.length > 0) {
        passages = parsedContent.passages
          .map((p) => String(p || "").trim())
          .filter((p) => p.length > 0);
      }
    } catch (error) {
      parsedContent = null;
    }
    if (!passages.length) {
      passages = String(doc.content || "")
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 40);
    }
    if (!passages.length && doc.content) {
      passages = [String(doc.content)];
    }
    return { document: doc, passages, parsedContent };
  }

  async generateBlank(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for blank problems");
    }

    const manualExcerpt = readBlankManual(2400);
    const results = [];

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let attempt = 0;
      let lastFailure = '';
      let normalized = null;

      while (attempt < 6 && !normalized) {
        attempt += 1;
        const extraDirectives = deriveBlankDirectives(lastFailure);
        const prompt = buildBlankPrompt({
          passage,
          manualExcerpt,
          extraDirectives
        });

        try {
          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.35,
            max_tokens: 820,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'blank' });

          const content = response.choices?.[0]?.message?.content || '';
          const payload = JSON.parse(stripJsonFences(content));
          normalized = normalizeBlankPayload(payload, {
            docTitle,
            passage,
            rawContent: content
          });
        } catch (error) {
          lastFailure = String(error?.message || '');
          console.warn('[ai-blank] generation failed:', lastFailure);
          if (attempt >= 4) {
            throw new Error(`[ai-blank] generation failed after retries: ${lastFailure}`);
          }
        }
      }

      if (normalized) {
        results.push({
          ...normalized,
          id: normalized.id || `blank_ai_${Date.now()}_${results.length}`
        });
      }
    }

    return results;
  }

  _deriveEobeopDirectives(lastFailure = '', mode = 'grammar') {
    const rawMessage = String(lastFailure || '');
    const message = rawMessage.toLowerCase();
    if (!rawMessage) return [];
    const directives = [];
    if (message.includes('underline') || message.includes('밑줄')) {
      directives.push('- Underline exactly five segments with <u>...</u> in both the passage and each option.');
    }
    if (message.includes('option') && message.includes('5')) {
      directives.push('- Provide exactly five options labelled with the circled digits ①-⑤.');
    }
    if (message.includes('reason')) {
      directives.push('- Fill the "reason" field for every option (정답 포함) with a concise Korean sentence.');
    }
    if (message.includes('korean')) {
      directives.push('- Keep the explanation and option reasons entirely in Korean.');
    }
    if (message.includes('correct') && message.includes('count')) {
      directives.push('- Ensure the number of incorrect options matches the correctAnswer(s) list.');
    }
    if (message.includes('question') && message.includes('unexpected')) {
      directives.push(`- Use the fixed Korean question text for ${mode === 'vocabulary' ? '어휘' : '어법'} items.`);
    }
    if (message.includes('passage') && message.includes('missing')) {
      directives.push('- Return the full original passage verbatim; do not summarise or delete sentences.');
    }
    if (message.includes('찾을 수 없음') || message.includes('segment') || message.includes('위치')) {
      directives.push('- Copy each underlined snippet exactly as it appears in the passage (no paraphrasing or trimming).');
    }
    const missingSnippetRegex = /"([^"]+)"\s*위치를? 찾을 수 없음/gi;
    const snippetDirectives = new Set();
    let snippetMatch;
    while ((snippetMatch = missingSnippetRegex.exec(rawMessage)) !== null) {
      const snippet = snippetMatch[1].trim();
      if (snippet.length) {
        snippetDirectives.add(`- Use the exact phrase "${snippet}" in both the passage and the matching option; do not replace or modify this wording.`);
      }
    }
    directives.push(...snippetDirectives);
    if (message.includes('explanation') || message.includes('too short')) {
      directives.push('- Write the explanation in at least 세 문장, covering 핵심 논지 · 정답 근거 · 두 개 이상 오답의 결함.');
    }
    return directives;
  }

  _chooseGrammarTargetIndex(history = []) {
    const validHistory = Array.isArray(history)
      ? history
          .map((value) => parseInt(value, 10))
          .filter((num) => Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length)
      : [];
    const usageMap = new Map();
    validHistory.forEach((idx) => {
      usageMap.set(idx, (usageMap.get(idx) || 0) + 1);
    });
    const recent = validHistory.length ? validHistory[validHistory.length - 1] : null;
    let pool = [];
    for (let i = 1; i <= CIRCLED_DIGITS.length; i += 1) {
      if (recent !== null && i === recent) {
        continue;
      }
      pool.push(i);
    }
    if (!pool.length) {
      pool = Array.from({ length: CIRCLED_DIGITS.length }, (_, index) => index + 1);
    }
    let minUsage = Infinity;
    const balanced = [];
    pool.forEach((idx) => {
      const usage = usageMap.get(idx) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        balanced.length = 0;
        balanced.push(idx);
      } else if (usage === minUsage) {
        balanced.push(idx);
      }
    });
    const finalPool = balanced.length ? balanced : pool;
    const choice = finalPool[Math.floor(Math.random() * finalPool.length)];
    return Number.isInteger(choice) ? choice : 3;
  }

  _parsePrimaryAnswerIndex(answerValue) {
    if (Array.isArray(answerValue)) {
      for (const entry of answerValue) {
        const num = parseInt(entry, 10);
        if (Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length) {
          return num;
        }
      }
    }
    const tokens = String(answerValue || '')
      .split(/[\s,]+/)
      .filter(Boolean);
    for (const token of tokens) {
      const num = parseInt(token, 10);
      if (Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length) {
        return num;
      }
    }
    return null;
  }

  _shuffleArray(items = []) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  _shuffleVocabularyOptions(problem) {
    if (!problem || !Array.isArray(problem.options) || problem.options.length !== CIRCLED_DIGITS.length) {
      return;
    }

    const combinationIndices = Array.isArray(problem.metadata?.optionCombinationIndices)
      ? problem.metadata.optionCombinationIndices
      : null;

    const strippedOptions = problem.options.map((option, idx) => ({
      body: option.replace(/^[\u2460-\u2464]\s*/, '').trim(),
      originalIndex: idx,
      combination: combinationIndices ? combinationIndices[idx] : null
    }));

    const shuffled = this._shuffleArray(strippedOptions);
    const originalAnswerIndex = Math.max(0, parseInt(problem.answer, 10) - 1);
    const newAnswerIndex = shuffled.findIndex((entry) => entry.originalIndex === originalAnswerIndex);
    if (newAnswerIndex === -1) {
      return;
    }

    problem.options = shuffled.map((entry, idx) => {
      const digit = CIRCLED_DIGITS[idx];
      const body = entry.body || strippedOptions[entry.originalIndex]?.body || '';
      return body ? `${digit} ${body}` : `${digit}`;
    });

    if (combinationIndices) {
      problem.metadata.optionCombinationIndices = shuffled.map((entry) => entry.combination || []);
    }

    const answerValue = String(newAnswerIndex + 1);
    problem.answer = answerValue;
    problem.correctAnswer = answerValue;
  }

  _normalizeGrammarPayload(payload, context = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('grammar payload missing');
    }

    const docTitle = context.docTitle;
    const rawQuestion = String(payload.question || '').trim() || BASE_QUESTION;
    const normalizedKey = normalizeQuestionKey(rawQuestion);
    const baseKey = normalizeQuestionKey(BASE_QUESTION);
    const multiKey = normalizeQuestionKey(MULTI_QUESTION);

    let normalizedType = 'grammar';
    if (String(payload.type || '').toLowerCase() === 'grammar_multi' || normalizedKey === multiKey || String(payload.questionVariant || '').toLowerCase() === 'multi' || (Array.isArray(payload.correctAnswers) && payload.correctAnswers.length >= 2)) {
      normalizedType = 'grammar_multi';
    }
    const expectedQuestion = normalizedType === 'grammar_multi' ? MULTI_QUESTION : BASE_QUESTION;
    if (![baseKey, multiKey].includes(normalizedKey)) {
      throw new Error('unexpected grammar question');
    }
    const question = expectedQuestion;

    const originalPassageRaw = context.passage
      ? String(context.passage)
      : String(payload.originalPassage || payload.sourcePassage || '').trim();
    let mainText = String(payload.passage || payload.text || payload.mainText || originalPassageRaw || '').trim();
    mainText = convertStarsToUnderline(mainText);
    if (!mainText) {
      throw new Error('grammar passage missing');
    }

    const failureReasons = Array.isArray(context.failureReasons) ? context.failureReasons : [];
    const reasonSuffix = () => (failureReasons.length ? ` :: ${failureReasons.join('; ')}` : '');
    const optionsInfo = normalizeUnderlinedOptions(payload.options || [], failureReasons);

    let underlineCount = (mainText.match(UNDERLINE_PATTERN) || []).length;
    if (underlineCount !== 5) {
      const rebuilt = rebuildUnderlinesFromOptions(mainText, optionsInfo.formatted, failureReasons);
      if (!rebuilt) {
        throw new Error(`passage underline count mismatch (${underlineCount})${reasonSuffix()}`);
      }
      mainText = rebuilt.mainText;
    }

    underlineCount = (mainText.match(UNDERLINE_PATTERN) || []).length;
    if (underlineCount !== 5) {
      throw new Error(`grammar passage must contain exactly five underlined segments${reasonSuffix()}`);
    }

    const answerCandidates = [];
    const answerKeys = ['correctAnswers', 'answers', 'answer', 'correctAnswer'];
    answerKeys.forEach((key) => {
      const value = payload[key];
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const num = parseInt(item, 10);
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

    if (Array.isArray(payload.answerIndices)) {
      payload.answerIndices.forEach((idx) => {
        const num = parseInt(idx, 10);
        if (Number.isInteger(num)) {
          answerCandidates.push(num);
        }
      });
    }

    optionsInfo.statuses.forEach((status, index) => {
      if (status === 'incorrect') {
        answerCandidates.push(index + 1);
      }
    });

    const uniqueAnswers = [...new Set(answerCandidates.filter((num) => Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length))].sort((a, b) => a - b);
    const minCorrect = normalizedType === 'grammar_multi' ? 2 : 1;
    if (uniqueAnswers.length < minCorrect) {
      throw new Error('grammar answer missing');
    }
    if (normalizedType === 'grammar' && uniqueAnswers.length !== 1) {
      throw new Error('grammar requires exactly one incorrect option');
    }

    const desiredAnswerIndex = Number.isInteger(context.desiredAnswerIndex)
      ? context.desiredAnswerIndex
      : null;
    if (
      desiredAnswerIndex &&
      normalizedType === 'grammar' &&
      (uniqueAnswers.length !== 1 || uniqueAnswers[0] !== desiredAnswerIndex)
    ) {
      throw new Error(`grammar answer index mismatch (${desiredAnswerIndex} expected, got ${uniqueAnswers.join(',') || 'none'})`);
    }

    optionsInfo.statuses.forEach((status, index) => {
      if (!status) return;
      const isAnswer = uniqueAnswers.includes(index + 1);
      if (status === 'incorrect' && !isAnswer) {
        throw new Error('grammar option status conflicts with answer set');
      }
      if (status === 'correct' && isAnswer && normalizedType === 'grammar') {
        throw new Error('grammar answer status must be incorrect');
      }
    });

    for (let i = 0; i < CIRCLED_DIGITS.length; i += 1) {
      if (!optionsInfo.statuses[i]) {
        optionsInfo.statuses[i] = uniqueAnswers.includes(i + 1) ? 'incorrect' : 'correct';
      }
    }

    const explanation = String(payload.explanation || '').trim();
    if (!explanation || !containsHangul(explanation)) {
      throw new Error('grammar explanation must be Korean');
    }
    if (explanation.length < GRAMMAR_MIN_EXPLANATION_LENGTH || countSentences(explanation) < GRAMMAR_MIN_EXPLANATION_SENTENCES) {
      throw new Error('grammar explanation too short');
    }

    const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, { docTitle });

    const reasonMap = { ...optionsInfo.reasons };
    const tagMap = { ...optionsInfo.tags };
    const statusList = [...optionsInfo.statuses];

    const reasonCandidates = [
      payload.distractorReasons,
      payload.optionReasons,
      payload.optionComments,
      payload.optionRationales,
      payload.distractors
    ];

    reasonCandidates.forEach((collection) => {
      if (!Array.isArray(collection)) return;
      collection.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const idx = labelToIndex(entry.label || entry.id || entry.option || entry.choice || entry.index, null);
        if (idx === null || idx < 0 || idx >= CIRCLED_DIGITS.length) return;
        const marker = CIRCLED_DIGITS[idx];
        const reasonText = entry.reason || entry.rationale || entry.comment || entry.explanation;
        if (reasonText) {
          reasonMap[marker] = String(reasonText).trim();
        }
        const tagText = entry.tag || entry.errorType || entry.defect || entry.category;
        if (tagText && !tagMap[marker]) {
          tagMap[marker] = String(tagText).trim();
        }
        const status = normalizeOptionStatus(entry.status || entry.role || entry.correctness);
        if (status && !statusList[idx]) {
          statusList[idx] = status;
        }
      });
    });

    const incorrectIndexSet = new Set(uniqueAnswers);
    const plainOptionSegments = optionsInfo.rawTexts.map((raw) => {
      const match = String(raw || '').match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
      return match && match[1] ? match[1] : '';
    });

    const originalPassagePlain = normalizeWhitespace(stripTags(convertStarsToUnderline(context.passage || '')));
    const originalPassageLower = originalPassagePlain.toLowerCase();
    const enforceOriginalComparison = context.enforceOriginalComparison !== false;

    for (let i = 0; i < CIRCLED_DIGITS.length; i += 1) {
      const marker = CIRCLED_DIGITS[i];
      const reasonText = reasonMap[marker] ? String(reasonMap[marker]).trim() : '';
      if (!reasonText || !containsHangul(reasonText) || reasonText.length < 6) {
        throw new Error('grammar option reasons incomplete');
      }

      const normalizedReason = reasonText.replace(/\s+/g, '');
      if (incorrectIndexSet.has(i + 1)) {
        if (!/(오류|틀리|잘못|어긋|일치하지|수일치|부적절|정답이아니|비문법)/.test(normalizedReason)) {
          throw new Error('grammar incorrect reason lacks error keyword');
        }
      } else if (!/(맞|옳|적절|정상|문법적|알맞|정답)/.test(normalizedReason)) {
        throw new Error('grammar correct reason lacks confirmation keyword');
      }

      if (enforceOriginalComparison && originalPassageLower) {
        const segmentPlain = normalizeWhitespace(plainOptionSegments[i] || '');
        const segmentLower = segmentPlain.toLowerCase();
        const appearsInOriginal = segmentLower && originalPassageLower.includes(segmentLower);
        if (incorrectIndexSet.has(i + 1)) {
          if (appearsInOriginal) {
            throw new Error('grammar incorrect segment unchanged from original');
          }
        } else if (!appearsInOriginal) {
          throw new Error('grammar correct segment diverges from original');
        }
      }
    }

    const normalizedMain = normalizeWhitespace(stripTags(mainText));
    if (originalPassageRaw) {
      const normalizedOriginal = normalizeWhitespace(stripTags(originalPassageRaw));
      if (normalizedOriginal && normalizedMain.length + 60 < normalizedOriginal.length) {
        throw new Error('grammar passage truncated');
      }
    }

    const answerValue = uniqueAnswers.length === 1 ? String(uniqueAnswers[0]) : uniqueAnswers.join(',');

    const metadata = {
      documentTitle: docTitle,
      generator: 'openai',
      grammarPoint: payload.grammarPoint || payload.grammarFocus || undefined,
      trapPattern: payload.trapPattern || payload.trap || payload.pattern || undefined,
      difficulty: payload.difficulty || payload.level || 'csat-advanced',
      variantTag: payload.variantTag || payload.variant || undefined,
      optionReasons: reasonMap,
      optionTags: Object.keys(tagMap).length ? tagMap : undefined,
      optionStatuses: statusList.some((item) => item) ? statusList : undefined
    };

    const normalizedOriginal = originalPassageRaw ? normalizeWhitespace(originalPassageRaw) : '';
    if (normalizedOriginal) {
      metadata.originalPassageLength = normalizedOriginal.length;
      const sentenceCount = countSentences(normalizedOriginal);
      if (sentenceCount) {
        metadata.originalSentenceCount = sentenceCount;
      }
    }

    return {
      id: payload.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: normalizedType,
      question,
      mainText,
      passage: mainText,
      originalPassage: originalPassageRaw ? normalizeWhitespace(originalPassageRaw) : undefined,
      options: optionsInfo.formatted,
      answer: answerValue,
      correctAnswer: answerValue,
      explanation,
      sourceLabel,
      difficulty: 'csat-advanced',
      metadata
    };
  }

  _normalizeVocabularyPayload(payload, context = {}) {
    return normalizeVocabularyPayload(payload, context);
  }

  _normalizeBlankPayload(payload, context = {}) {
    return normalizeBlankPayload(payload, context);
  }

  async generateVocab(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const results = [];

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for vocabulary problems");
    }
    const manualExcerpt = readVocabularyManual(2400);

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;
      let attempt = 0;
      let normalized = null;
      let lastFailure = '';
      while (attempt < 6 && !normalized) {
        attempt += 1;
        const failureReasons = [];
        try {
          const variantTag = `doc${documentId}_v${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const promptSections = [
            'You are a deterministic K-CSAT English vocabulary (어휘 적절성) item writer.',
            'Follow the dedicated vocabulary manual exactly and keep the 한국어 질문 문구 그대로.',
            '',
            `Passage title: ${docTitle}`,
            `Passage (retain all sentences verbatim; replace target expressions with (A)/(B)/(C) slots and bracketed choices like "(A) [resolved / raised]"):\n${clipText(passage, 1600)}`,
            '',
            'Manual excerpt (truncated):',
            manualExcerpt,
            '',
            'Return raw JSON only with this structure:',
            VOCAB_JSON_BLUEPRINT.replace('"variantTag": "V-103"', `"variantTag": "${variantTag}"`),
            '',
            'Generation requirements:',
            '- Provide a slots array where each entry describes one blank label (예: "A"), exactly two choices, the 0-based correctIndex, and optionally a short Korean explanation.',
            '- In the passage string, show each blank as "(Label) [choice1 / choice2]" with the correct choice listed first.',
            '- Provide exactly five options labelled with circled digits (①-⑤); each option must list the selected choices for (A)-(C) joined with " - ".',
            '- correctAnswer must be the 1-based index of the unique option whose combination matches every slot\'s correct choice.',
            '- Explanation must be in Korean with 최소 세 문장, 빈칸별 정답 근거와 대표 오답 결함을 모두 언급.',
            '- Source label must start with "출처│" and avoid placeholder text.',
            '- Respond with JSON only (no Markdown fences).'
          ];

          const additionalDirectives = this._deriveEobeopDirectives(lastFailure, 'vocabulary');
          if (additionalDirectives.length) {
            promptSections.push('', 'Additional fixes based on the previous attempt:', ...additionalDirectives);
          }

          const prompt = promptSections.filter(Boolean).join('\n');

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.3,
            max_tokens: 880,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'vocabulary' });

          const content = response.choices?.[0]?.message?.content || '';
          const payload = JSON.parse(stripJsonFences(content));
          normalized = this._normalizeVocabularyPayload(payload, {
            docTitle,
            passage,
            index: results.length,
            failureReasons
          });

          if (normalized) {
            this._shuffleVocabularyOptions(normalized);
            normalized.id = normalized.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            results.push(normalized);
          }
        } catch (error) {
          const baseMessage = String(error?.message || '') || 'unknown vocabulary failure';
          const reasonDetails = failureReasons
            .map((reason) => String(reason || '').trim())
            .filter((reason) => reason.length > 0);
          const uniqueDetails = [...new Set(reasonDetails)];
          const detailSuffix = uniqueDetails.length ? ` :: ${uniqueDetails.join('; ')}` : '';
          lastFailure = `${baseMessage}${detailSuffix}`;
          console.warn('[ai-vocab] generation failed:', lastFailure);
          if (attempt >= 6) {
            throw new Error(`[ai-vocab] generation failed after retries: ${lastFailure}`);
          }
        }
      }
    }

    return results;
  }

  async generateTitle(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const manualExcerpt = readTitleManual(2000);
    const results = [];

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for title problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;
      let attempt = 0;
      let normalized = null;
      let lastFailure = '';

      while (attempt < 6 && !normalized) {
        attempt += 1;
        const variantTag = `title_${documentId}_${i}_${Date.now()}_${attempt}`;
        try {
          const prompt = buildTitlePrompt({
            passage,
            manualExcerpt,
            docTitle,
            variantTag,
            failureReason: lastFailure
          });
          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.35,
            max_tokens: 720,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'title' });

          const content = response.choices?.[0]?.message?.content || '';
          const payload = JSON.parse(stripJsonFences(content));
          normalized = normalizeTitlePayload(payload, {
            docTitle,
            passage,
            variantTag
          });

          if (normalized) {
            results.push(normalized);
          }
        } catch (error) {
          lastFailure = String(error?.message || '').trim() || 'unknown title failure';
          console.warn('[ai-title] generation failed:', lastFailure);
          if (attempt >= 4) {
            throw new Error(`[ai-title] generation failed after retries: ${lastFailure}`);
          }
        }
      }
    }

    return results;
  }

  async generateTheme(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const manualExcerpt = readTopicManual(1800);
    const results = [];

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for theme problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;
      let attempt = 0;
      let normalized = null;
      let lastFailure = '';

      while (attempt < 6 && !normalized) {
        attempt += 1;
        const variantTag = `theme_${documentId}_${i}_${Date.now()}_${attempt}`;
        try {
          const prompt = buildTopicPrompt({
            passage,
            manualExcerpt,
            docTitle,
            variantTag,
            failureReason: lastFailure
          });
          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.32,
            max_tokens: 720,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'theme' });

          const content = response.choices?.[0]?.message?.content || '';
          const payload = JSON.parse(stripJsonFences(content));
          normalized = normalizeTopicPayload(payload, {
            docTitle,
            passage,
            variantTag
          });
          if (normalized) {
            results.push(normalized);
          }
        } catch (error) {
          lastFailure = String(error?.message || '').trim() || 'unknown topic failure';
          console.warn('[ai-theme] generation failed:', lastFailure);
          if (attempt >= 4) {
            throw new Error(`[ai-theme] generation failed after retries: ${lastFailure}`);
          }
        }
      }
    }

    return results;
  }

  async generateTopic(documentId, count = 5) {
    return this.generateTheme(documentId, count);
  }

  async generateImplicit(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const results = [];
    const manualExcerpt = readImplicitManual(1800);

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for implicit problems");
    }

    const validateUnderline = (text) => {
      if (!text) return false;
      const matches = String(text).match(/<u[\s\S]*?<\/u>/g);
      return Array.isArray(matches) && matches.length === 1;
    };

    const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const coerceSingleUnderline = (text, targetSpan) => {
      const rawText = String(text || '');
      let count = 0;
      const sanitized = rawText.replace(/<u[^>]*>([\s\S]*?)<\/u>/g, (match, inner) => {
        count += 1;
        if (count === 1) {
          return `<u>${inner}</u>`;
        }
        return inner;
      });

      if (count > 0) {
        return sanitized;
      }

      const cleanTarget = String(targetSpan || '').trim();
      if (!cleanTarget) {
        return null;
      }

      const pattern = new RegExp(escapeRegExp(cleanTarget).replace(/\s+/g, '\\s+'), 'i');
      if (!pattern.test(rawText)) {
        return null;
      }

      return rawText.replace(pattern, (match) => `<u>${match}</u>`);
    };

    const isValidEnglishOption = (value) => {
      if (!value) return false;
      if (containsHangul(value)) return false;
      const cleaned = value.replace(/[’]/g, "'").replace(/[“”]/g, '"').trim();
      if (!cleaned) return false;
      const wordCount = countWords(cleaned);
      if (wordCount < 6 || wordCount > 18) {
        return false;
      }
      return /^[A-Za-z][A-Za-z\s.,'"()\-:;!?]*$/.test(cleaned);
    };

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let success = false;
      let attempts = 0;
      let lastFailure = '';

      while (!success && attempts < 3) {
        attempts += 1;
        const attemptStartedAt = Date.now();
        let variantTag = '';
        try {
          const failureReminder = lastFailure
            ? `Previous attempt failed because: ${lastFailure}. Fix that issue without changing other requirements.`
            : '';

          variantTag = `implicit_${documentId}_${i}_${Date.now()}_${attempts}`;

          const prompt = [
            "You are a deterministic K-CSAT implicit meaning inference item writer.",
            "Follow the style contract exactly. Question text must remain Korean.",
            manualExcerpt,
            `Passage (preserve sentences; wrap exactly one span with <u>...</u>):\n${clipText(passage, 1500)}`,
            "",
            failureReminder,
            variantTag ? `VariantTag: ${variantTag}` : '',
            "Return raw JSON only with this schema:",
            "{",
            "  \"type\": \"implicit\",",
            `  \"question\": \"${IMPLICIT_QUESTION}\",`,
            "  \"text\": \"English passage with <u>target</u>\",",
            "  \"targetSpan\": \"Exact English text that must be underlined\",",
            "  \"options\": [",
            "    \"\\u2460 English option\",",
            "    \"\\u2461 English option\",",
            "    \"\\u2462 English option\",",
            "    \"\\u2463 English option\",",
            "    \"\\u2464 English option\"",
            "  ],",
            "  \"correctAnswer\": 3,",
            "  \"explanation\": \"한국어 해설\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98│기관 연도 회차 문항 (pXX)\",",
            "  \"implicitType\": \"I-M|I-A|I-X|I-E|I-R|open-set\",",
            "  \"defectTags\": [\"focus-shift\", \"polarity-flip\", \"scope-shift\", \"fact-error\", \"relation-flip\", \"definition-trivial\"],",
            "}",
            "Rules:",
            "- Underline exactly one contiguous span with <u>...</u> inside text.",
            "- targetSpan must match the exact English text that is underlined.",
            "- Question must remain exactly in Korean as provided.",
            "- Provide five English options labelled with circled digits (\\u2460-\\u2464).",
            "- Options must be academic or neutral English sentences/phrases (6-18 words, no numerals).",
            "- Exactly one option must match the passage's implicit message, polarity, and scope.",
            "- Each distractor must embody a distinct defect from {focus-shift, polarity-flip, scope-shift, fact-error, relation-flip, definition-trivial}.",
            "- Explanation must be Korean and cite the discourse cues plus at least one distractor defect.",
            "- sourceLabel must start with '출처│'.",
            "- Respond with JSON only (no Markdown fences)."
          ].filter(Boolean).join("\n");

          logImplicitAttempt({
            documentId,
            passageIndex: i,
            attempt: attempts,
            status: 'start',
            variantTag
          });

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 540,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'implicit' });

          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const question = String(payload.question || '').trim();
          if (question !== IMPLICIT_QUESTION) {
            throw new Error(`unexpected implicit question: ${question}`);
          }

          const coercedText = coerceSingleUnderline(payload.text || '', payload.targetSpan);
          if (!coercedText) {
            throw new Error('implicit text must contain exactly one <u>...</u> span');
          }
          let text = String(coercedText).trim();
          text = text.replace(/\)\s+(?=\([1-5]\))/g, ')\n');
          if (!validateUnderline(text)) {
            throw new Error('implicit text must contain exactly one <u>...</u> span');
          }

          const normalizeForComparison = (input) => String(input || '')
            .toLowerCase()
            .replace(/[^a-z\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || '').trim()).filter(Boolean)
            : [];
          if (options.length !== CIRCLED_DIGITS.length) {
            throw new Error('implicit options must contain 5 entries');
          }
          const normalizedTarget = normalizeForComparison(payload.targetSpan || '');
          options.forEach((option, index) => {
            if (!option.startsWith(CIRCLED_DIGITS[index])) {
              throw new Error(`implicit option ${index + 1} missing circled digit`);
            }
            const value = option.slice(CIRCLED_DIGITS[index].length).trim();
            if (!isValidEnglishOption(value)) {
              throw new Error(`implicit option ${index + 1} must be an academic English phrase (6-18 words)`);
            }
            if (normalizedTarget && normalizeForComparison(value) === normalizedTarget) {
              throw new Error(`implicit option ${index + 1} duplicates the underlined expression`);
            }
          });

          const answer = Number(payload.correctAnswer || payload.answer);
          if (!Number.isInteger(answer) || answer < 1 || answer > CIRCLED_DIGITS.length) {
            throw new Error('invalid implicit correctAnswer');
          }

          const explanation = String(payload.explanation || '').trim();
          if (!explanation || !containsHangul(explanation)) {
            throw new Error('implicit explanation must be Korean');
          }

          const sourceLabel = ensureSourceLabel(payload.sourceLabel, { docTitle });

          const metadata = {
            documentTitle: docTitle,
            generator: 'openai'
          };
          if (payload.implicitType) {
            metadata.implicitType = String(payload.implicitType).trim();
          }
          if (Array.isArray(payload.defectTags)) {
            const tags = payload.defectTags
              .map((tag) => String(tag || '').trim())
              .filter((tag) => tag.length > 0);
            if (tags.length) {
              metadata.defectTags = tags;
            }
          }
          if (variantTag) {
            metadata.variantTag = metadata.variantTag || variantTag;
          }

          results.push({
            id: payload.id || `implicit_ai_${Date.now()}_${results.length}`,
            type: 'implicit',
            question,
            text,
            mainText: text,
            options,
            answer: String(answer),
            correctAnswer: String(answer),
            explanation,
            sourceLabel,
            metadata
          });
          logImplicitAttempt({
            documentId,
            passageIndex: i,
            attempt: attempts,
            status: 'success',
            variantTag,
            durationMs: Date.now() - attemptStartedAt
          });
          success = true;
        } catch (error) {
          const failureMessage = error?.message || error;
          console.warn("[ai-implicit] generation failed:", failureMessage);
          lastFailure = String(failureMessage || '').slice(0, 160);
          logImplicitAttempt({
            documentId,
            passageIndex: i,
            attempt: attempts,
            status: 'retry',
            variantTag,
            durationMs: Date.now() - attemptStartedAt,
            message: String(failureMessage || '')
          });
          if (attempts >= 3) {
            throw new Error(`[ai-implicit] generation failed after retries: ${error?.message || error}`);
          }
        }
      }
    }

    return results;
  }

  async generateIrrelevant(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const results = [];
    const manualExcerpt = readIrrelevantManual(2000);

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for irrelevant problems");
    }

    const hasCircledPrefix = (text, index) =>
      typeof text === 'string' && text.trim().startsWith(CIRCLED_DIGITS[index]);

    const looksEnglishSentence = (text) => /[A-Za-z]/.test(String(text || ''));

    const validateEnumeratedText = (text) => {
      if (!text) return false;
      const matches = String(text)
        .split(/\((\d)\)/)
        .filter((chunk) => chunk && chunk.trim().length > 0);
      return /(\([1-5]\))/.test(text) && matches.length >= 5;
    };

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let success = false;
      let attempts = 0;

      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a deterministic K-CSAT 'irrelevant sentence' item writer.",
            "Follow the style contract exactly. Question text must remain Korean.",
            manualExcerpt,
            `Passage (preserve sentences; enumerate as (1)~(n)):\n${clipText(passage, 1500)}`,
            "",
            "Return raw JSON only with this schema:",
            "{",
            "  \"type\": \"irrelevant\",",
            `  \"question\": \"${IRRELEVANT_QUESTION}\",`,
            "  \"text\": \"(1) ... (2) ... (3) ... (4) ... (5) ...\",",
            "  \"options\": [",
            "    \"\\u2460 English sentence\",",
            "    \"\\u2461 English sentence\",",
            "    \"\\u2462 English sentence\",",
            "    \"\\u2463 English sentence\",",
            "    \"\\u2464 English sentence\"",
            "  ],",
            "  \"correctAnswer\": 3,",
            "  \"explanation\": \"한국어 해설\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98│기관 연도 회차 문항 (pXX)\",",
            "  \"irrelevantType\": \"T1|T2|T3|T4|T5|T6|T7|T8|T9|T10\",",
            "  \"defectAxis\": [\"theme\", \"discourse\", \"cohesion\", \"logic\", \"convention\"]",
            "}",
            "Rules:",
            "- Provide exactly five sentences in options, each prefixed with circled digits (\\u2460-\\u2464).",
            "- Options must be English declarative sentences that mirror the passage sentences.",
            "- Exactly one option must break the passage's theme/discourse/cohesion/logic/convention axes decisively.",
            "- The remaining four options must support the passage's main argument and discourse path.",
            "- Explanation must be Korean, naming at least one axis where the correct option fails and noting why the others fit.",
            "- sourceLabel must start with '출처│'.",
            "- Respond with JSON only (no Markdown fences)."
          ].filter(Boolean).join("\n");

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.35,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'irrelevant' });

          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const question = String(payload.question || '').trim();
          if (!IRRELEVANT_QUESTION_VARIANTS.includes(question)) {
            throw new Error(`unexpected irrelevant question: ${question}`);
          }

          const text = String(payload.text || '').trim();
          if (!validateEnumeratedText(text)) {
            throw new Error('irrelevant text must contain enumerated sentences (1)~(5)');
          }

          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || '').trim()).filter(Boolean)
            : [];
          if (options.length !== CIRCLED_DIGITS.length) {
            throw new Error('irrelevant options must contain 5 entries');
          }
          options.forEach((option, index) => {
            if (!hasCircledPrefix(option, index)) {
              throw new Error(`irrelevant option ${index + 1} missing circled digit`);
            }
            const value = option.slice(CIRCLED_DIGITS[index].length).trim();
            if (!looksEnglishSentence(value)) {
              throw new Error(`irrelevant option ${index + 1} must contain English text`);
            }
          });

          const answer = Number(payload.correctAnswer || payload.answer);
          if (!Number.isInteger(answer) || answer < 1 || answer > CIRCLED_DIGITS.length) {
            throw new Error('invalid irrelevant correctAnswer');
          }

          const explanation = String(payload.explanation || '').trim();
          if (!explanation || !containsHangul(explanation)) {
            throw new Error('irrelevant explanation must be Korean');
          }

          const sourceLabel = ensureSourceLabel(payload.sourceLabel, { docTitle });

          const metadata = {
            documentTitle: docTitle,
            generator: 'openai'
          };
          if (payload.irrelevantType) {
            metadata.irrelevantType = String(payload.irrelevantType).trim();
          }
          if (Array.isArray(payload.defectAxis)) {
            const axes = payload.defectAxis
              .map((axis) => String(axis || '').trim())
              .filter((axis) => axis.length > 0);
            if (axes.length) {
              metadata.defectAxis = axes;
            }
          }

          results.push({
            id: payload.id || `irrelevant_ai_${Date.now()}_${results.length}`,
            type: 'irrelevant',
            question,
            text,
            options,
            answer: String(answer),
            correctAnswer: String(answer),
            explanation,
            sourceLabel,
            metadata
          });
          success = true;
        } catch (error) {
          console.warn("[ai-irrelevant] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw new Error(`[ai-irrelevant] generation failed after retries: ${error?.message || error}`);
          }
        }
      }
    }

    return results;
  }

  async generateSummary(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    if (!this.getOpenAI()) throw new Error("AI generator unavailable for summary problems");
    const manualExcerpt = getSummaryManualExcerpt(3200);
    const docTitle = document?.title || `Document ${documentId}`;
    const results = [];

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = buildSummaryPrompt({
            passage,
            docTitle,
            manualExcerpt
          });
          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.35,
            max_tokens: 720,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'summary' });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const problem = coerceSummaryProblem(payload, {
            index: results.length,
            docTitle,
            passage
          });
          if (!problem) throw new Error("summary coercion failed");
          const validation = validateSummaryProblem(problem);
          if (!validation.valid) {
            throw new Error(`summary validation issues: ${validation.issues.join(',')}`);
          }
          problem.sourceLabel = ensureSourceLabel(problem.sourceLabel, { docTitle });
          problem.metadata = problem.metadata || {};
          problem.metadata.documentId = documentId;
          results.push(problem);
          success = true;
        } catch (error) {
          console.warn("[ai-summary] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw error;
          }
        }
      }
    }

    return results;
  }

  formatGrammarProblem(raw, context) {
    const failureReasons = Array.isArray(context?.failureReasons) ? context.failureReasons : null;
    try {
      return this._normalizeGrammarPayload(raw, context || {});
    } catch (error) {
      if (failureReasons) {
        failureReasons.push(String(error?.message || error));
      }
      return null;
    }
  }

  async generateGrammar(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    if (!this.getOpenAI()) throw new Error("AI generator unavailable for grammar problems");
    const manualExcerpt = readGrammarManual(2400);
    const docTitle = document?.title || `Document ${documentId}`;
    const results = [];
    const answerHistory = [];

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;
      let attempt = 0;
      let normalized = null;
      let lastFailure = '';
      const targetAnswerIndex = this._chooseGrammarTargetIndex(answerHistory);
      while (attempt < 6 && !normalized) {
        attempt += 1;
        const failureReasons = [];
        try {
          const variantTag = `doc${documentId}_p${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const enforceIndex = attempt <= 3 ? targetAnswerIndex : null;
          const directiveHints = [];
          if (enforceIndex) {
            const marker = CIRCLED_DIGITS[enforceIndex - 1];
            directiveHints.push(
              `- ${marker} 밑줄만 어법 오류가 되도록 고급 문법 변형(원자 연산 1회)을 적용하세요.`,
              `- ${marker} 외의 밑줄 네 개는 원문과 철자, 어형, 구두점까지 모두 동일해야 합니다.`
            );
          }
          const prompt = buildGrammarPrompt({
            passage,
            docTitle,
            passageIndex: i,
            manualExcerpt,
            variantTag,
            desiredAnswerIndex: enforceIndex,
            extraDirectives: [
              ...directiveHints,
              ...this._deriveEobeopDirectives(lastFailure, 'grammar')
            ]
          });
          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.25,
            max_tokens: 900,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'grammar' });
          const content = response.choices?.[0]?.message?.content || '';
          const payload = JSON.parse(stripJsonFences(content));
          normalized = this._normalizeGrammarPayload(payload, {
            docTitle,
            passage,
            index: results.length,
            desiredAnswerIndex: enforceIndex,
            failureReasons
          });
          if (normalized) {
            normalized.id = normalized.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            results.push(normalized);
            const primaryAnswer = this._parsePrimaryAnswerIndex(normalized.answer || normalized.correctAnswer);
            if (primaryAnswer) {
              answerHistory.push(primaryAnswer);
            }
          }
        } catch (error) {
          const baseMessage = String(error?.message || '') || 'unknown grammar failure';
          const reasonDetails = failureReasons
            .map((reason) => String(reason || '').trim())
            .filter((reason) => reason.length > 0);
          const uniqueDetails = [...new Set(reasonDetails)];
          const detailSuffix = uniqueDetails.length ? ` :: ${uniqueDetails.join('; ')}` : '';
          lastFailure = `${baseMessage}${detailSuffix}`;
          console.warn("[ai-grammar] generation failed:", lastFailure);
          if (attempt >= 6) {
            throw new Error(`[ai-grammar] generation failed after retries: ${lastFailure}`);
          }
        }
      }
    }

    return results;
  }

  _acceptCachedProblem(type, problem) {
    return this.repository.acceptCachedProblem(type, problem);
  }

  async listReviewQueueForUser(userId, options = {}) {
    return this.repository.listReviewQueueForUser(userId, options);
  }

  async getProblemsByIds(ids = [], options = {}) {
    return this.repository.getProblemsByIds(ids, options);
  }

  _mapDbProblem(row) {
    return this.repository.mapDbProblem(row);
  }

  async fetchCached(documentId, type, limit, options = {}) {
    return this.repository.fetchCached(documentId, type, limit, options);
  }

  async listProblemsForExport(options = {}) {
    return this.repository.listProblemsForExport(options);
  }

  async saveProblems(documentId, type, problems = [], context = {}) {
    return this.repository.saveProblems(documentId, type, problems, context);
  }

  async saveProblemNote(problemId, userId, noteText = '') {
    const numericProblemId = Number(problemId);
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      throw new Error('잘못된 problemId 입니다.');
    }

    const trimmedNote = typeof noteText === 'string' ? noteText.trim() : '';
    const updater = Number(userId) || null;

    await database.run(
      'INSERT INTO problem_notes (problem_id, note, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ' +
        'ON CONFLICT(problem_id) DO UPDATE SET note = excluded.note, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP',
      [numericProblemId, trimmedNote, updater]
    );

    const row = await database.get(
      'SELECT p.*, pn.note AS note_text FROM problems p LEFT JOIN problem_notes pn ON pn.problem_id = p.id WHERE p.id = ?',
      [numericProblemId]
    );

    return this._mapDbProblem(row);
  }

  async recordExportHistory(payload = {}) {
    return this.repository.recordExportHistory(payload);
  }

  async _pruneProblemCache(documentId, type, maxCount = 1000) {
    return this.repository.pruneProblemCache(documentId, type, maxCount);
  }
}

module.exports = new AIProblemService();
