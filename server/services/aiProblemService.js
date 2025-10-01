const fs = require("fs");
const path = require("path");
const database = require("../models/database");
const shared = require("./ai-problem/shared");
const blank = require("./ai-problem/blank");
const underlined = require("./ai-problem/underlined");
const vocabulary = require("./ai-problem/vocabulary");
const title = require("./ai-problem/title");
const topic = require("./ai-problem/topic");

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

const GRAMMAR_MANUAL_PATH = path.join(__dirname, "..", "..", "problem manual", "grammar_problem_manual.md");
const VOCABULARY_MANUAL_PATH = path.join(__dirname, "..", "..", "problem manual", "vocabulary_problem_manual.md");
const TITLE_MANUAL_PATH = path.join(__dirname, "..", "..", "docs", "problem-templates", "title-master.md");
const BLANK_MANUAL_PATH = path.join(__dirname, "..", "..", "problem manual", "빈칸_메뉴얼_GPTxClaude.md");
const TOPIC_MANUAL_PATH = path.join(__dirname, "..", "..", "docs", "problem-templates", "topic-master.md");
const IMPLICIT_MANUAL_PATH = path.join(__dirname, "..", "..", "docs", "problem-templates", "implicit-master.md");
const IRRELEVANT_MANUAL_PATH = path.join(__dirname, "..", "..", "docs", "problem-templates", "irrelevant-master.md");
let cachedGrammarManual = null;
let cachedVocabularyManual = null;
let cachedTitleManual = null;
let cachedBlankManual = null;
let cachedTopicManual = null;
let cachedImplicitManual = null;
let cachedIrrelevantManual = null;

const EXPOSURE_MIN_INCORRECT_RETRY_MINUTES = 20;
const EXPOSURE_BASE_RETRY_PROBABILITY = 0.45;
const EXPOSURE_RETRY_BONUS_PER_MISS = 0.12;
const EXPOSURE_FETCH_MULTIPLIER = 4;
const TOPIC_QUESTION = "\ub2e4\uc74c \uae00\uc758 \uc8fc\uc81c\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
const IMPLICIT_QUESTION = "\ub2e4\uc74c \uae00\uc5d0\uc11c \ubc11\uc904 \uce5c \ubd80\ubd84\uc774 \uc758\ubbf8\ud558\ub294 \ubc14\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc740?";
const IRRELEVANT_QUESTION = "\ub2e4\uc74c \uae00\uc5d0\uc11c \uc804\uccb4 \ud750\ub984\uacfc \uad00\uacc4 \uc5c6\ub294 \ubb38\uc7a5\uc740?";
const IRRELEVANT_QUESTION_VARIANTS = [
  IRRELEVANT_QUESTION,
  "\ub2e4\uc74c \uae00\uc5d0\uc11c \uc804\uccb4 \ud750\ub984\uacfc \uad00\uacc4\uc5c6\ub294 \ubb38\uc7a5\uc740?",
  "\ub2e4\uc74c \uae00\uc758 \uc804\uccb4\uc801\uc778 \ud750\ub984\uc5d0\uc11c \ubb38\ub9e5\uc0c1 \uc5b4\uc11c\ud55c \ubd80\ubd84\uc774 \uc788\ub294 \ubb38\uc7a5\uc740?",
  "\ub2e4\uc74c \uae00\uc758 \ud750\ub984\uc0c1, \ubc11\uc904 \uce5c (A)\uc640 \uad00\ub828\uc774 \uc5c6\ub294 \uac83\uc740?"
];

function readGrammarManual(limit = 2000) {
  if (cachedGrammarManual === null) {
    try {
      cachedGrammarManual = fs.readFileSync(GRAMMAR_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load grammar manual:', error?.message || error);
      cachedGrammarManual = '';
    }
  }
  if (!cachedGrammarManual) return '';
  return cachedGrammarManual.slice(0, limit);
}

function readVocabularyManual(limit = 2000) {
  if (cachedVocabularyManual === null) {
    try {
      cachedVocabularyManual = fs.readFileSync(VOCABULARY_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load vocabulary manual:', error?.message || error);
      cachedVocabularyManual = '';
    }
  }
  if (!cachedVocabularyManual) return '';
  return cachedVocabularyManual.slice(0, limit);
}

function readTitleManual(limit = 1600) {
  if (cachedTitleManual === null) {
    try {
      cachedTitleManual = fs.readFileSync(TITLE_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load title manual:', error?.message || error);
      cachedTitleManual = '';
    }
  }
  if (!cachedTitleManual) return '';
  return cachedTitleManual.slice(0, limit);
}

function readBlankManual(limit = 2000) {
  if (cachedBlankManual === null) {
    try {
      cachedBlankManual = fs.readFileSync(BLANK_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load blank manual:', error?.message || error);
      cachedBlankManual = '';
    }
  }
  if (!cachedBlankManual) return '';
  return cachedBlankManual.slice(0, limit);
}

function readTopicManual(limit = 1600) {
  if (cachedTopicManual === null) {
    try {
      cachedTopicManual = fs.readFileSync(TOPIC_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load topic manual:', error?.message || error);
      cachedTopicManual = '';
    }
  }
  if (!cachedTopicManual) return '';
  return cachedTopicManual.slice(0, limit);
}

function readImplicitManual(limit = 1800) {
  if (cachedImplicitManual === null) {
    try {
      cachedImplicitManual = fs.readFileSync(IMPLICIT_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load implicit manual:', error?.message || error);
      cachedImplicitManual = '';
    }
  }
  if (!cachedImplicitManual) return '';
  return cachedImplicitManual.slice(0, limit);
}

function readIrrelevantManual(limit = 2000) {
  if (cachedIrrelevantManual === null) {
    try {
      cachedIrrelevantManual = fs.readFileSync(IRRELEVANT_MANUAL_PATH, 'utf8');
    } catch (error) {
      console.warn('[aiProblemService] failed to load irrelevant manual:', error?.message || error);
      cachedIrrelevantManual = '';
    }
  }
  if (!cachedIrrelevantManual) return '';
  return cachedIrrelevantManual.slice(0, limit);
}

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
    this._queue = [];
    this._processing = false;
  }

  _enqueueOpenAI(task, options = {}) {
    return new Promise((resolve, reject) => {
      this._queue.push({ task, options, resolve, reject });
      if (!this._processing) {
        this._processQueue();
      }
    });
  }

  async _processQueue() {
    if (this._processing) return;
    this._processing = true;
    while (this._queue.length) {
      const { task, options, resolve, reject } = this._queue.shift();
      try {
        const result = await this._runWithRetry(task, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    this._processing = false;
  }

  async _runWithRetry(task, options = {}) {
    const retries = Number.isInteger(options.retries) ? options.retries : 3;
    const baseDelay = Number.isFinite(options.baseDelay) ? options.baseDelay : 500;
    const maxDelay = Number.isFinite(options.maxDelay) ? options.maxDelay : 4000;
    let attempt = 0;
    while (true) {
      try {
        return await task();
      } catch (error) {
        attempt += 1;
        if (attempt > retries) {
          throw error;
        }
        const delay = Math.min(baseDelay * (2 ** (attempt - 1)), maxDelay);
        await this._delay(delay);
      }
    }
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  callChatCompletion(config, options = {}) {
    const openai = this.getOpenAI();
    if (!openai) {
      throw new Error('AI generator unavailable');
    }
    return this._enqueueOpenAI(() => openai.chat.completions.create(config), options);
  }

  async markExposures(userId, problemIds = []) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) return 0;
    const uniqueIds = [...new Set((Array.isArray(problemIds) ? problemIds : [])
      .map((id) => Number(id))
      .filter((num) => Number.isInteger(num) && num > 0))];
    if (!uniqueIds.length) return 0;
    let updated = 0;
    for (const problemId of uniqueIds) {
      try {
        await database.run(
          'INSERT INTO problem_exposures (user_id, problem_id, first_seen_at, last_seen_at, exposure_count, last_result) ' +
            "VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'pending') " +
            "ON CONFLICT(user_id, problem_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP, exposure_count = problem_exposures.exposure_count + 1, last_result = 'pending'",
          [numericUserId, problemId]
        );
        updated += 1;
      } catch (error) {
        console.warn('[aiProblemService] failed to mark exposure:', error?.message || error);
      }
    }
    return updated;
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

    for (let i = 0; i < CIRCLED_DIGITS.length; i += 1) {
      const marker = CIRCLED_DIGITS[i];
      const reasonText = reasonMap[marker] ? String(reasonMap[marker]).trim() : '';
      if (!reasonText || !containsHangul(reasonText) || reasonText.length < 6) {
        throw new Error('grammar option reasons incomplete');
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

      while (attempt < 4 && !normalized) {
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

      while (attempt < 4 && !normalized) {
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

      const pattern = new RegExp(escapeRegExp(cleanTarget));
      if (!pattern.test(rawText)) {
        return null;
      }

      return rawText.replace(pattern, `<u>${cleanTarget}</u>`);
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

      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a deterministic K-CSAT implicit meaning inference item writer.",
            "Follow the style contract exactly. Question text must remain Korean.",
            manualExcerpt,
            `Passage (preserve sentences; wrap exactly one span with <u>...</u>):\n${clipText(passage, 1500)}`,
            "",
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
          const text = String(coercedText).trim();
          if (!validateUnderline(text)) {
            throw new Error('implicit text must contain exactly one <u>...</u> span');
          }

          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || '').trim()).filter(Boolean)
            : [];
          if (options.length !== CIRCLED_DIGITS.length) {
            throw new Error('implicit options must contain 5 entries');
          }
          options.forEach((option, index) => {
            if (!option.startsWith(CIRCLED_DIGITS[index])) {
              throw new Error(`implicit option ${index + 1} missing circled digit`);
            }
            const value = option.slice(CIRCLED_DIGITS[index].length).trim();
            if (!isValidEnglishOption(value)) {
              throw new Error(`implicit option ${index + 1} must be an academic English phrase (6-18 words)`);
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
          success = true;
        } catch (error) {
          console.warn("[ai-implicit] generation failed:", error?.message || error);
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

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;
      let attempt = 0;
      let normalized = null;
      let lastFailure = '';
      while (attempt < 4 && !normalized) {
        attempt += 1;
        const failureReasons = [];
        try {
          const variantTag = `doc${documentId}_p${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const prompt = buildGrammarPrompt({
            passage,
            docTitle,
            passageIndex: i,
            difficulty: "advanced",
            manualExcerpt,
            variantTag,
            extraDirectives: this._deriveEobeopDirectives(lastFailure, 'grammar')
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
            failureReasons
          });
          if (normalized) {
            normalized.id = normalized.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            results.push(normalized);
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
    if (!problem || typeof problem !== 'object') {
      return false;
    }
    if (type === 'summary') {
      const validation = validateSummaryProblem(problem);
      if (!validation.valid) {
        return false;
      }
    }
    if (type === 'title') {
      const validation = validateTitleProblem(problem);
      if (!validation.valid) {
        return false;
      }
    }
    if (type === 'theme' || type === 'topic') {
      const validation = validateTopicProblem(problem);
      if (!validation.valid) {
        return false;
      }
    }
    if (type === 'blank') {
      const passage = normalizeWhitespace(problem.mainText || problem.text || '');
      if (!passage || passage.length < MIN_BLANK_TEXT_LENGTH) {
        return false;
      }
      const metadata = problem.metadata && typeof problem.metadata === 'object' ? problem.metadata : {};
      const originalLength = Number(metadata.originalPassageLength) || 0;
      if (originalLength && passage.length + 80 < originalLength) {
        return false;
      }
      if (!originalLength && passage.length < MIN_BLANK_TEXT_LENGTH + 80) {
        return false;
      }
      if (countSentences(passage) < MIN_BLANK_SENTENCE_COUNT) {
        return false;
      }
      if (!BLANK_PLACEHOLDER_REGEX.test(passage)) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
      for (let i = 0; i < options.length; i += 1) {
        const marker = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(marker)) {
          return false;
        }
        const value = optionText.slice(marker.length).trim();
        if (!value) {
          return false;
        }
        if (!isEnglishPhrase(value)) {
          return false;
        }
        if (/\d/.test(value)) {
          return false;
        }
        const wordCount = countWords(value);
        if (wordCount < BLANK_OPTION_MIN_WORDS || wordCount > BLANK_OPTION_MAX_WORDS) {
          return false;
        }
      }
    }
    if (type === 'grammar' || type === 'grammar_multi') {
      const passage = String(problem.mainText || problem.passage || problem.text || '').trim();
      if (!passage) return false;
      if ((passage.match(UNDERLINE_PATTERN) || []).length !== 5) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
      for (let i = 0; i < options.length; i += 1) {
        const expected = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(expected)) {
          return false;
        }
        if (!/<u[\s\S]*?<\/u>/.test(optionText)) {
          return false;
        }
      }
      const explanation = String(problem.explanation || '').trim();
      if (!containsHangul(explanation) || explanation.length < GRAMMAR_MIN_EXPLANATION_LENGTH) {
        return false;
      }
      const sourceLabel = String(problem.sourceLabel || '').trim();
      if (!sourceLabel.startsWith('출처│')) {
        return false;
      }
      const metadata = problem.metadata && typeof problem.metadata === 'object' ? problem.metadata : {};
      if (!metadata.optionReasons || Object.keys(metadata.optionReasons).length !== CIRCLED_DIGITS.length) {
        return false;
      }
    }
    if (type === 'vocabulary') {
      const passage = String(problem.mainText || problem.passage || problem.text || '').trim();
      if (!passage) return false;
      if (!/\(A\)/.test(passage)) {
        return false;
      }

      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }

      const metadata = problem.metadata && typeof problem.metadata === 'object' ? problem.metadata : {};
      const slots = Array.isArray(metadata.vocabSlots) ? metadata.vocabSlots : [];
      const combinationIndices = Array.isArray(metadata.optionCombinationIndices) ? metadata.optionCombinationIndices : [];
      if (!slots.length || combinationIndices.length !== options.length) {
        return false;
      }

      const slotCount = slots.length;
      const slotChoiceMaps = slots.map((slot) => {
        if (!slot || typeof slot !== 'object') {
          return null;
        }
        const label = String(slot.label || '').trim();
        if (!/^[A-Z]$/.test(label)) {
          return null;
        }
        const choices = Array.isArray(slot.choices) ? slot.choices.map((choice) => String(choice || '').trim()).filter(Boolean) : [];
        if (choices.length < 2) {
          return null;
        }
        const correctIndex = Number.isInteger(slot.correctIndex) ? slot.correctIndex : -1;
        if (correctIndex < 0 || correctIndex >= choices.length) {
          return null;
        }
        if (!new RegExp(`\\(${label}\\)`).test(passage)) {
          return null;
        }
        const normalizedChoices = choices.map((choice) => choice.replace(/\s+/g, ' ').trim());
        const choiceMap = new Map();
        normalizedChoices.forEach((choice, idx) => {
          choiceMap.set(choice, idx);
        });
        return { label, choices, normalizedChoices, correctIndex, choiceMap };
      });

      if (slotChoiceMaps.some((entry) => entry === null)) {
        return false;
      }

      const optionCombinationIndices = combinationIndices.map((combo) => {
        if (!Array.isArray(combo) || combo.length !== slotCount) {
          return null;
        }
        return combo.map((value) => {
          const index = parseInt(value, 10);
          return Number.isInteger(index) ? index : null;
        });
      });

      if (optionCombinationIndices.some((combo) => !combo || combo.some((index, slotIdx) => index === null || index < 0 || index >= slotChoiceMaps[slotIdx].choices.length))) {
        return false;
      }

      for (let i = 0; i < options.length; i += 1) {
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(CIRCLED_DIGITS[i])) {
          return false;
        }
        const body = optionText.slice(CIRCLED_DIGITS[i].length).trim();
        if (!body) {
          return false;
        }
        const parts = body.split(/\s*-\s*/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (parts.length !== slotCount) {
          return false;
        }
        const combination = optionCombinationIndices[i];
        for (let slotIdx = 0; slotIdx < slotCount; slotIdx += 1) {
          const slot = slotChoiceMaps[slotIdx];
          const choiceIndex = combination[slotIdx];
          const expected = slot.choices[choiceIndex];
          if (!expected || parts[slotIdx].replace(/\s+/g, ' ').trim() !== expected.replace(/\s+/g, ' ').trim()) {
            return false;
          }
        }
      }

      const explanation = String(problem.explanation || '').trim();
      if (!containsHangul(explanation) || explanation.length < VOCAB_MIN_EXPLANATION_LENGTH || countSentences(explanation) < VOCAB_MIN_EXPLANATION_SENTENCES) {
        return false;
      }

      const sourceLabel = String(problem.sourceLabel || '').trim();
      if (!sourceLabel.startsWith('출처│')) {
        return false;
      }

      const answerIndex = Number.parseInt(problem.correctAnswer || problem.answer, 10);
      if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > options.length) {
        return false;
      }

      const correctCombination = optionCombinationIndices[answerIndex - 1];
      if (!correctCombination) {
        return false;
      }
      for (let slotIdx = 0; slotIdx < slotCount; slotIdx += 1) {
        const slot = slotChoiceMaps[slotIdx];
        if (correctCombination[slotIdx] !== slot.correctIndex) {
          return false;
        }
      }
    }
    if (type === 'implicit') {
      const passage = String(problem.text || problem.mainText || '').trim();
      if (!passage) return false;
      if ((passage.match(UNDERLINE_PATTERN) || []).length !== 1) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
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
      for (let i = 0; i < options.length; i += 1) {
        const expected = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(expected)) {
          return false;
        }
        const value = optionText.slice(expected.length).trim();
        if (!isValidEnglishOption(value)) {
          return false;
        }
      }
      const explanation = String(problem.explanation || '').trim();
      if (!containsHangul(explanation) || explanation.length < 60 || countSentences(explanation) < 2) {
        return false;
      }
      const sourceLabel = String(problem.sourceLabel || '').trim();
      if (!sourceLabel.startsWith('출처│')) {
        return false;
      }
    }
    return true;
  }

  async listReviewQueueForUser(userId, options = {}) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return { total: 0, problems: [] };
    }

    const limit = Math.max(parseInt(options.limit, 10) || 0, 0) || 20;
    const fetchLimit = Math.max(limit * 4, limit);

    const rows = await database.all(
      'SELECT p.*, pe.last_result AS exposure_last_result, pe.correct_count AS exposure_correct_count, pe.incorrect_count AS exposure_incorrect_count, pe.last_answered_at AS exposure_last_answered_at, pe.last_seen_at AS exposure_last_seen_at ' +
        'FROM problem_exposures pe ' +
        'JOIN problems p ON p.id = pe.problem_id ' +
        "WHERE pe.user_id = ? AND pe.last_result = 'incorrect' " +
        'ORDER BY datetime(pe.last_answered_at) DESC, pe.id DESC ' +
        'LIMIT ?'
      , [numericUserId, fetchLimit]
    );

    const mapped = rows
      .map((row) => this._mapDbProblem(row))
      .filter((problem) => problem && this._acceptCachedProblem(problem.type, problem));

    const totalRow = await database.get(
      "SELECT COUNT(*) AS total FROM problem_exposures WHERE user_id = ? AND last_result = 'incorrect'",
      [numericUserId]
    );

    const total = Number(totalRow?.total) || mapped.length;
    return {
      total,
      problems: mapped.slice(0, limit)
    };
  }

  async getProblemsByIds(ids = [], options = {}) {
    const numericIds = [...new Set((Array.isArray(ids) ? ids : [])
      .map((id) => Number(id))
      .filter((num) => Number.isInteger(num) && num > 0))];
    if (!numericIds.length) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(',');
    const rows = await database.all(
      `SELECT p.*, pe.last_result AS exposure_last_result, pe.correct_count AS exposure_correct_count, pe.incorrect_count AS exposure_incorrect_count, pe.last_answered_at AS exposure_last_answered_at, pe.last_seen_at AS exposure_last_seen_at
         FROM problems p
         LEFT JOIN problem_exposures pe ON pe.problem_id = p.id AND pe.user_id = ?
        WHERE p.id IN (${placeholders})`,
      [Number(options.userId) || 0, ...numericIds]
    );

    const problems = rows
      .map((row) => this._mapDbProblem(row))
      .filter((problem) => problem && this._acceptCachedProblem(problem.type, problem));

    const ordered = numericIds
      .map((id) => problems.find((problem) => Number(problem.id) === id))
      .filter((problem) => problem);

    return ordered;
  }

  _decideExposure(exposure) {
    if (!exposure || typeof exposure !== 'object') {
      return 'allow';
    }
    const normalizedResult = exposure.lastResult ? String(exposure.lastResult).toLowerCase() : '';
    if (normalizedResult === 'pending') {
      return 'skip';
    }
    if (normalizedResult === 'correct') {
      return 'skip';
    }
    if (normalizedResult === 'incorrect') {
      const incorrectCount = Math.max(1, Number(exposure.incorrectCount) || 1);
      let timestamp = Number.NaN;
      if (exposure.lastAnsweredAt) {
        const parsed = Date.parse(String(exposure.lastAnsweredAt).replace(/\s$/, ''));
        if (Number.isFinite(parsed)) {
          timestamp = parsed;
        }
      }
      if (Number.isFinite(timestamp)) {
        const elapsed = Date.now() - timestamp;
        if (elapsed < EXPOSURE_MIN_INCORRECT_RETRY_MINUTES * 60 * 1000) {
          return 'skip';
        }
      }
      const probability = Math.min(0.92, EXPOSURE_BASE_RETRY_PROBABILITY + (incorrectCount - 1) * EXPOSURE_RETRY_BONUS_PER_MISS);
      if (Math.random() <= probability) {
        return 'allow';
      }
      return 'defer';
    }

    if (!normalizedResult) {
      return 'allow';
    }

    return 'skip';
  }

  _parseJson(value, fallback) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.warn('[aiProblemService] JSON parse failed:', error?.message || error);
      return fallback;
    }
  }

  _mapDbProblem(row) {
    if (!row) return null;
    const options = this._parseJson(row.options, []);
    const sentences = this._parseJson(row.sentences, undefined);
    const metadata = this._parseJson(row.metadata, undefined);

    const generatorTag = metadata && typeof metadata.generator === "string"
      ? metadata.generator.trim().toLowerCase()
      : null;
    if (generatorTag && !['openai', 'openai-preview'].includes(generatorTag)) {
      return null;
    }

    const optionArray = Array.isArray(options)
      ? options
          .map((opt) => {
            if (typeof opt === 'string') return opt.trim();
            if (opt && typeof opt === 'object') {
              const candidate = opt.text || opt.value || opt.label || opt.symbol;
              return candidate ? String(candidate).trim() : '';
            }
            return opt === null || opt === undefined ? '' : String(opt).trim();
          })
          .filter((opt) => opt && opt.length)
      : [];

    if (!row.question || !optionArray.length || !row.answer) {
      return null;
    }

    const noteText = Object.prototype.hasOwnProperty.call(row, 'note_text')
      ? row.note_text
      : Object.prototype.hasOwnProperty.call(row, 'note')
        ? row.note
        : undefined;

    const problem = {
      id: row.id ? String(row.id) : undefined,
      type: row.type || 'generic',
      question: row.question,
      options: optionArray,
      answer: row.answer,
      explanation: row.explanation || '',
      difficulty: row.difficulty || 'basic',
      mainText: row.main_text || undefined,
      sentences: Array.isArray(sentences) ? sentences : undefined,
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined
    };

    if (noteText !== undefined) {
      problem.note = noteText ? String(noteText).trim() : '';
    }

    if (metadata && typeof metadata === 'object') {
      if (metadata.sourceLabel && !problem.sourceLabel) {
        problem.sourceLabel = metadata.sourceLabel;
      }
      if (metadata.documentTitle && !problem.source) {
        problem.source = metadata.documentTitle;
      }
      if (metadata.originalPassage && !problem.originalPassage) {
        problem.originalPassage = metadata.originalPassage;
      }
      if (problem.type === 'summary') {
        const summarySentence = metadata.summarySentence || metadata.summary_sentence;
        if (summarySentence && !problem.summarySentence) {
          problem.summarySentence = String(summarySentence).trim();
        }
        const summarySentenceKor = metadata.summarySentenceKor || metadata.summary_sentence_kor;
        if (summarySentenceKor && !problem.summarySentenceKor) {
          problem.summarySentenceKor = String(summarySentenceKor).trim();
        }
        if (Array.isArray(metadata.keywords) && metadata.keywords.length && !problem.keywords) {
          problem.keywords = metadata.keywords.map((kw) => String(kw).trim()).filter((kw) => kw.length);
        }
        if (metadata.summaryPattern && !problem.summaryPattern) {
          problem.summaryPattern = String(metadata.summaryPattern).trim();
        }
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(row, 'exposure_last_result')
      || Object.prototype.hasOwnProperty.call(row, 'exposure_last_answered_at')
    ) {
      const exposure = {
        lastResult: row.exposure_last_result || null,
        lastAnsweredAt: row.exposure_last_answered_at || null,
        lastSeenAt: row.exposure_last_seen_at || null,
        incorrectCount: Number(row.exposure_incorrect_count) || 0,
        correctCount: Number(row.exposure_correct_count) || 0
      };
      const hasData = exposure.lastResult || exposure.lastAnsweredAt || exposure.lastSeenAt;
      if (hasData) {
        problem.exposure = exposure;
      }
    }

    return problem;
  }

  async fetchCached(documentId, type, limit, options = {}) {
    const requested = Math.max(parseInt(limit, 10) || 0, 0);
    if (!requested) return [];

    const excludeIds = Array.isArray(options.excludeIds)
      ? options.excludeIds
          .map((id) => Number(id))
          .filter((num) => Number.isFinite(num))
      : [];

    const userId = Number(options.userId);
    const params = [];
    let query = 'SELECT p.*, pe.last_result AS exposure_last_result, pe.correct_count AS exposure_correct_count, pe.incorrect_count AS exposure_incorrect_count, pe.last_answered_at AS exposure_last_answered_at, pe.last_seen_at AS exposure_last_seen_at FROM problems p';

    if (Number.isInteger(userId) && userId > 0) {
      query += ' LEFT JOIN problem_exposures pe ON pe.problem_id = p.id AND pe.user_id = ?';
      params.push(userId);
    }

    query += ' WHERE p.document_id = ? AND p.type = ?';
    params.push(documentId, type);

    if (excludeIds.length) {
      const placeholders = excludeIds.map(() => '?').join(',');
      query += ` AND p.id NOT IN (${placeholders})`;
      params.push(...excludeIds);
    }

    const fetchCount = Math.max(requested * EXPOSURE_FETCH_MULTIPLIER, requested);
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(fetchCount);

    const rows = await database.all(query, params);
    const mapped = rows
      .map((row) => this._mapDbProblem(row))
      .filter((problem) => this._acceptCachedProblem(type, problem));

    if (!mapped.length) {
      return [];
    }

    const allowList = [];
    const deferred = [];
    mapped.forEach((problem) => {
      const decision = this._decideExposure(problem?.exposure);
      if (decision === 'allow') {
        allowList.push(problem);
      } else if (decision === 'defer') {
        deferred.push(problem);
      }
    });

    let final = allowList.slice(0, requested);
    if (final.length < requested && deferred.length) {
      const need = requested - final.length;
      final = final.concat(deferred.slice(0, need));
    }

    return final.slice(0, requested);
  }

  async listProblemsForExport(options = {}) {
    const documentId = Number(options.documentId) || null;
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 40, 1), 200);
    const types = Array.isArray(options.types)
      ? options.types.map((type) => String(type || '').trim()).filter((type) => type.length)
      : [];
    const difficulties = Array.isArray(options.difficulties)
      ? options.difficulties.map((level) => String(level || '').trim().toLowerCase()).filter((level) => level.length)
      : [];
    const aiOnly = options.includeGeneratedOnly !== false;
    const randomize = options.randomize !== false;

    const params = [];
    let query = 'SELECT p.*, pn.note AS note_text FROM problems p LEFT JOIN problem_notes pn ON pn.problem_id = p.id';

    const filters = [];
    if (documentId) {
      filters.push('p.document_id = ?');
      params.push(documentId);
    }
    if (types.length) {
      const placeholders = types.map(() => '?').join(',');
      filters.push(`p.type IN (${placeholders})`);
      params.push(...types);
    }
    if (difficulties.length) {
      const placeholders = difficulties.map(() => '?').join(',');
      filters.push(`LOWER(p.difficulty) IN (${placeholders})`);
      params.push(...difficulties);
    }
    if (aiOnly) {
      filters.push('p.is_ai_generated = 1');
    }

    if (filters.length) {
      query += ` WHERE ${filters.join(' AND ')}`;
    }

    query += randomize
      ? ' ORDER BY RANDOM()'
      : ' ORDER BY datetime(p.created_at) DESC, p.id DESC';
    query += ' LIMIT ?';
    params.push(limit);

    const rows = await database.all(query, params);
    return rows
      .map((row) => this._mapDbProblem(row))
      .filter((problem) => problem);
  }

  async saveProblems(documentId, type, problems = [], context = {}) {
    const saved = [];
    const contextTitle = context.docTitle || context.documentTitle || null;

    for (const item of Array.isArray(problems) ? problems : []) {
      if (!item || typeof item !== 'object') continue;

      const baseMetadata = { ...(item.metadata || {}) };
      if (contextTitle && !baseMetadata.documentTitle) {
        baseMetadata.documentTitle = contextTitle;
      }
      if (item.sourceLabel && !baseMetadata.sourceLabel) {
        baseMetadata.sourceLabel = item.sourceLabel;
      }
      if (item.originalPassage && !baseMetadata.originalPassage) {
        baseMetadata.originalPassage = String(item.originalPassage).trim();
      }
      if (!baseMetadata.generator) {
        baseMetadata.generator = 'openai';
      }

      if (type === 'summary') {
        if (item.summarySentence && !baseMetadata.summarySentence) {
          baseMetadata.summarySentence = String(item.summarySentence).trim();
        }
        if (item.summarySentenceKor && !baseMetadata.summarySentenceKor) {
          baseMetadata.summarySentenceKor = String(item.summarySentenceKor).trim();
        }
        if (!baseMetadata.summaryPattern && item.summaryPattern) {
          baseMetadata.summaryPattern = String(item.summaryPattern).trim();
        }
        if (!baseMetadata.keywords && Array.isArray(item.keywords)) {
          const keywords = item.keywords
            .map((kw) => String(kw).trim())
            .filter((kw) => kw.length);
          if (keywords.length) {
            baseMetadata.keywords = keywords;
          }
        }
      }

      const optionArray = Array.isArray(item.options)
        ? item.options
            .map((opt) => {
              if (typeof opt === 'string') return opt.trim();
              if (opt && typeof opt === 'object') {
                const candidate = opt.text || opt.value || opt.label || opt.symbol;
                return candidate ? String(candidate).trim() : '';
              }
              return opt === null || opt === undefined ? '' : String(opt).trim();
            })
            .filter((opt) => opt && opt.length)
        : [];
      if (!optionArray.length) continue;

      const primaryAnswer = item.correctAnswer ?? item.answer;
      const rawAnswer = Array.isArray(primaryAnswer) && primaryAnswer.length === 0
        ? undefined
        : primaryAnswer;
      const answerValue = Array.isArray(rawAnswer)
        ? rawAnswer
            .filter((val) => val !== null && val !== undefined)
            .map((val) => String(val).trim())
            .filter((val) => val.length)
            .join(',')
        : rawAnswer === undefined || rawAnswer === null
          ? ''
          : String(rawAnswer).trim();

      if (!answerValue) continue;

      const explanation = item.explanation || '';
      const difficulty = item.difficulty
        || ((type === 'grammar' || type === 'grammar_multi') ? 'advanced' : 'basic');
      const mainText = item.mainText || item.text || null;
      const sentencesJson = item.sentences ? JSON.stringify(item.sentences) : null;
      const metadataJson = Object.keys(baseMetadata).length ? JSON.stringify(baseMetadata) : null;
      const optionsJson = JSON.stringify(optionArray);

      const result = await database.run(
        "INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, is_ai_generated, main_text, sentences, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
        [
          documentId,
          type,
          item.question || item.instruction || '',
          optionsJson,
          answerValue,
          explanation,
          difficulty,
          mainText,
          sentencesJson,
          metadataJson
        ]
      );

      const savedProblem = {
        ...item,
        id: result?.id ? String(result.id) : item.id,
        type,
        documentId,
        question: item.question || item.instruction || '',
        options: [...optionArray],
        answer: answerValue,
        explanation,
        difficulty,
        mainText,
        sentences: item.sentences ? [...item.sentences] : undefined,
        metadata: baseMetadata
      };

      if (baseMetadata.sourceLabel && !savedProblem.sourceLabel) {
        savedProblem.sourceLabel = baseMetadata.sourceLabel;
      }

      saved.push(savedProblem);
    }

    if (saved.length) {
      await this._pruneProblemCache(documentId, type, 1000);
    }

    return saved;
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
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    const documentId = Number(payload.documentId) || null;
    const types = Array.isArray(payload.types) ? payload.types : [];
    const counts = payload.counts && typeof payload.counts === 'object' ? payload.counts : {};
    const problemIds = Array.isArray(payload.problemIds)
      ? payload.problemIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const total = Number(payload.total) || problemIds.length || 0;
    const includeSolutions = payload.includeSolutions !== false ? 1 : 0;

    try {
      await database.run(
        'INSERT INTO problem_export_history (user_id, document_id, types, counts, problem_ids, total, include_solutions, created_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [
          userId,
          documentId,
          JSON.stringify(types),
          JSON.stringify(counts),
          JSON.stringify(problemIds),
          total,
          includeSolutions
        ]
      );
    } catch (error) {
      console.warn('[aiProblemService] failed to record export history:', error?.message || error);
    }
  }

  async _pruneProblemCache(documentId, type, maxCount = 1000) {
    if (!Number.isInteger(maxCount) || maxCount <= 0) return;
    try {
      const rows = await database.all(
        'SELECT id FROM problems WHERE document_id = ? AND type = ? ORDER BY datetime(created_at) DESC, id DESC',
        [documentId, type]
      );
      if (!Array.isArray(rows) || rows.length <= maxCount) {
        return;
      }
      const excess = rows.slice(maxCount).map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
      if (!excess.length) return;
      const placeholders = excess.map(() => '?').join(',');
      await database.run(`DELETE FROM problems WHERE id IN (${placeholders})`, excess);
    } catch (error) {
      console.warn('[aiProblemService] prune cache failed:', error?.message || error);
    }
  }
}

module.exports = new AIProblemService();
