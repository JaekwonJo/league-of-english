const database = require("../models/database");
const { jsonrepair } = require("jsonrepair");
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
  readImplicitManual
} = require("./ai-problem/internal/manualLoader");
const path = require("path");
const { createGrammarPipeline } = require("./grammar-generation");
const { createVocabPipeline } = require("./vocab-generation");
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
  VOCAB_USAGE_BASE_QUESTION,
  VOCAB_USAGE_MULTI_INCORRECT_QUESTION,
  VOCAB_USAGE_SINGLE_CORRECT_QUESTION,
  VOCAB_USAGE_MULTI_CORRECT_QUESTION,
  VOCAB_USAGE_JSON_BLUEPRINT,
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
  validateSummaryProblem,
  deriveSummaryDirectives
} = require("../utils/summaryTemplate");

const {
  buildGrammarPrompt,
  validateGrammarProblem,
  CIRCLED_DIGITS: GRAMMAR_DIGITS,
  BASE_QUESTION,
  MULTI_QUESTION,
  MULTI_INCORRECT_QUESTION,
  GRAMMAR_MIN_EXPLANATION_LENGTH,
  GRAMMAR_MIN_EXPLANATION_SENTENCES
} = require("../utils/eobeopTemplate");

function buildPassageQueue(passages, count) {
  if (!Array.isArray(passages) || passages.length === 0) {
    return [];
  }
  const pool = passages.slice();
  if (pool.length > 1) {
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  if (!Number.isInteger(count) || count <= pool.length) {
    return pool;
  }
  const queue = [];
  for (let i = 0; i < count; i += 1) {
    queue.push(pool[i % pool.length]);
  }
  return queue;
}

function buildVocabularyVariantDirective(variant) {
  if (variant.answerMode === 'correct') {
    return 'Produce exactly ONE five-option problem where 네 개 표현은 문맥상 어색하도록 변형하고, 단 하나만 원문과 동일하게 유지하세요.';
  }
  if (variant.targetIncorrectCount === 1) {
    return 'Produce exactly ONE five-option problem where only one underlined expression is contextually incorrect for the passage.';
  }
  return `Produce exactly ONE five-option problem where ${variant.targetIncorrectCount} underlined expressions are contextually incorrect and the remaining ${5 - variant.targetIncorrectCount} stay identical to the source.`;
}

function buildVocabularyAnswerInstruction(variant) {
  if (variant.answerMode === 'correct') {
    if (variant.targetCorrectCount === 1) {
      return '- Set correctAnswers to the index of the sole correct expression and mark that option "correct" while 나머지는 "incorrect"로 표시하세요.';
    }
    return `- Mark the ${variant.targetCorrectCount} correct expressions as "correct" and list their indices in correctAnswers; 다른 보기들은 "incorrect"로 표시하세요.`;
  }
  if (variant.targetIncorrectCount === 1) {
    return '- Set correctAnswers (or correctAnswer) to the index of the single incorrect expression and mark that option as "incorrect" while the others remain "correct".';
  }
  return `- List all ${variant.targetIncorrectCount} incorrect expression indices in correctAnswers and mark them "incorrect"; 나머지 ${5 - variant.targetIncorrectCount} 보기는 "correct"로 유지하세요.`;
}

class AIProblemService {
  constructor() {
    this._openai = null;
    this.queue = new OpenAIQueue(() => this.getOpenAI());
    this.repository = createProblemRepository(database);
    this._grammarVariantQueue = [];
    this._grammarVariantSignature = '';
    this._vocabularyVariantQueue = [];
    this._vocabularyVariantSignature = '';
  }

  _safeParseJson(rawContent, { label = 'json' } = {}) {
    const cleaned = stripJsonFences(String(rawContent || '').trim());
    if (!cleaned) {
      const error = new Error(`${label} response empty`);
      error.code = 'JSON_EMPTY';
      error.rawContent = '';
      throw error;
    }
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      try {
        const repaired = jsonrepair(cleaned);
        return JSON.parse(repaired);
      } catch (repairError) {
        const error = new Error(`${label} JSON parse failed: ${repairError?.message || parseError.message}`);
        error.code = 'JSON_PARSE_FAILED';
        error.rawContent = cleaned;
        error.parseError = parseError;
        error.repairError = repairError;
        throw error;
      }
    }
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
    const documentCode = document?.code || document?.slug || document?.external_id || null;
    const docTitle = document?.title || documentCode || `Document ${documentId}`;

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for blank problems");
    }

    const manualExcerpt = readBlankManual(2400);
    const results = [];
    const passageQueue = buildPassageQueue(passages, count);

    for (let i = 0; i < count; i += 1) {
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
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
            documentCode,
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
    if (mode === 'vocabulary') {
      return [
        '- Underline exactly five expressions and keep four of them identical to the original passage.',
        '- Replace only one expression with a contextually incorrect word and set correctAnswer to its index.',
        '- Output options as ①-⑤ with the same <u>...</u> snippets that appear in the passage.',
        '- Fill correction.replacement and correction.reason in Korean, and provide optionReasons for at least three options (정답 포함).',
        '- Write the explanation in Korean with at least three sentences covering 지문 요약, 정답 오류, 그리고 두 개 이상의 정상 표현이 적절한 이유.',
        '- Ensure the sourceLabel begins with "출처|" and the question text matches the KSAT vocabulary usage format.',
        '- 정답 밑줄 하나만 원문과 다르게 바꾸고, 나머지 네 밑줄은 원문과 한 글자도 달라지지 않도록 유지하세요.'
      ];
    }
    const directives = [];
    if (message.includes('underline') || message.includes('밑줄')) {
      directives.push('- Underline exactly five segments with <u>...</u> in both the passage and each option.');
    }
    if (message.includes('자동으로 추가') || message.includes('missing underline')) {
      directives.push('- 밑줄은 문제 속 오류 구간만 감싸도록 정확히 표시하고, 각 보기는 최소 한 단어 이상의 밑줄을 포함해야 합니다.');
    }
    if (message.includes('option') && message.includes('5')) {
      directives.push('- Provide exactly five options labelled with the circled digits ①-⑤.');
    }
    if (/(1-4|1~4|one to four)/i.test(rawMessage) || message.includes('1-4 word')) {
      directives.push('- Each option must be a natural 1-4 word English expression that begins with a letter.');
    }
    if (message.includes('reason')) {
      directives.push('- Fill the "reason" field for every option (정답 포함) with a concise Korean sentence.');
    }
    if (message.includes('korean')) {
      directives.push('- Keep the explanation and option reasons entirely in Korean.');
    }
    if (message.includes('lexicalnote') || message.includes('targetlemma') || message.includes('targetmeaning')) {
      directives.push('- Populate targetWord, targetLemma, targetMeaning, and lexicalNote (partOfSpeech, nuance, example) fields completely.');
    }
    if (message.includes('answer count mismatch')) {
      directives.push('- 지정된 정답 개수에 맞게 correctAnswers 배열과 status 값을 정확히 맞춰 주세요.');
    } else if (message.includes('incorrect count mismatch')) {
      directives.push('- 요청된 만큼의 오류 밑줄만 변형하고, 나머지는 원문과 동일하게 유지하세요.');
    } else if (message.includes('correct count mismatch')) {
      directives.push('- 요청된 만큼의 올바른 밑줄만 유지하고, 나머지는 문법 오류가 되도록 수정하세요.');
    } else if (message.includes('correct') && message.includes('count')) {
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
    if (
      message.includes('unchanged from original') ||
      message.includes('변경되지') ||
      message.includes('그대로') ||
      message.includes('일치')
    ) {
      directives.push('- 정답이 아닌 밑줄 구간은 원문과 다른 문법 오류가 드러나도록 반드시 하나 이상의 어형/구두점/구문을 바꿔 주세요. 나머지 네 구간은 원문과 철자까지 동일해야 합니다.');
    }
    if (message.includes('mutated segment mismatch')) {
      directives.push('- 오류로 표시된 밑줄마다 원문과 다른 형태가 드러나도록 수정하고, 오류 수만큼 변형이 이루어졌는지 확인하세요.');
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

  async _repairGrammarOutput({
    rawContent,
    failureMessage = '',
    failureReasons = [],
    passage,
    docTitle,
    manualExcerpt,
    questionText,
    answerMode,
    targetIncorrectCount,
    targetCorrectCount
  } = {}) {
    const invalidJson = String(rawContent || '').trim();
    if (!invalidJson) {
      throw new Error('repair requires original JSON content');
    }
    if (!this.getOpenAI()) {
      throw new Error('AI repair unavailable');
    }

    const manualNote = manualExcerpt ? clipText(manualExcerpt, 900) : '';
    const mode = answerMode === 'correct' ? 'correct' : 'incorrect';
    const totalSegments = CIRCLED_DIGITS.length;
    const clampCount = (value, fallback) => {
      if (!Number.isInteger(value)) return fallback;
      return Math.min(Math.max(value, 1), totalSegments - 1);
    };

    let incorrectCount;
    let correctCount;
    if (mode === 'correct') {
      correctCount = clampCount(targetCorrectCount, 1);
      incorrectCount = totalSegments - correctCount;
      if (incorrectCount < 1) {
        incorrectCount = 1;
        correctCount = totalSegments - incorrectCount;
      }
    } else {
      incorrectCount = clampCount(targetIncorrectCount, 1);
      correctCount = totalSegments - incorrectCount;
      if (correctCount < 1) {
        correctCount = 1;
        incorrectCount = totalSegments - correctCount;
      }
    }

    const effectiveQuestion = String(
      questionText ||
        (mode === 'correct'
          ? MULTI_QUESTION
          : incorrectCount === 1
          ? BASE_QUESTION
          : MULTI_INCORRECT_QUESTION)
    );
    const incorrectLabel = incorrectCount === 1 ? 'segment' : 'segments';
    const correctLabel = correctCount === 1 ? 'segment' : 'segments';

    const requirementList = [
      `- Use the exact Korean question text: ${effectiveQuestion}`,
      `- Keep the passage identical to the source text except for the ${incorrectCount} designated error ${incorrectLabel}; never rewrite or reorder other content.`,
      '- Underline exactly five distinct segments in both the passage and each option using <u>...</u>.',
      '- Provide exactly five options labelled ①-⑤ whose underlined text matches the passage segments character-for-character.',
      mode === 'incorrect'
        ? `- Inject advanced grammar errors into exactly ${incorrectCount} underlined ${incorrectLabel} and keep the remaining ${correctCount} ${correctLabel} identical to the source passage.`
        : `- Keep exactly ${correctCount} underlined ${correctLabel} identical to the source passage and mutate the remaining ${incorrectCount} ${incorrectLabel} so they contain high-level grammar errors.`,
      mode === 'incorrect'
        ? incorrectCount === 1
          ? '- Set correctAnswer (or correctAnswers) to the index of the single incorrect underline and mark its status as "incorrect"; all other options must be "correct".'
          : `- List all ${incorrectCount} incorrect underline indices in correctAnswers and mark their status as "incorrect"; the remaining options must be "correct".`
        : correctCount === 1
        ? '- Set correctAnswers to the index of the single correct underline and mark its status as "correct"; all other options must be "incorrect".'
        : `- List all ${correctCount} correct underline indices in correctAnswers and mark their status as "correct"; the remaining options must be "incorrect".`,
      '- Provide a concise Korean reason sentence for every option that names the relevant grammar rule.',
      '- Write the explanation entirely in Korean with at least three sentences covering 지문 요약, 정답 근거, 그리고 두 개 이상의 오답 오류.',
      '- Ensure every option status aligns with the correctAnswers set.',
      '- Ensure the sourceLabel begins with 출처│ and references the provided document title.'
    ];

    const reasonLines = Array.isArray(failureReasons)
      ? failureReasons.map((line) => String(line || '').trim()).filter(Boolean)
      : [];

    const validatorNotes = reasonLines.length
      ? `Validator notes:\n- ${reasonLines.join('\n- ')}`
      : '';

    const promptParts = [
      'You are a senior KSAT grammar problem editor. Fix the JSON output so it satisfies publication requirements.',
      failureMessage ? `Failure summary: ${failureMessage}` : '',
      validatorNotes,
      manualNote ? `Reference manual excerpt (truncated):\n${manualNote}` : '',
      docTitle ? `Document title: ${docTitle}` : '',
      passage
        ? `Original passage (keep every character verbatim except for the ${incorrectCount} designated error ${incorrectLabel}):\n${clipText(passage, 1800)}`
        : '',
      'Invalid JSON between <bad_json> and </bad_json>:',
      '<bad_json>',
      clipText(invalidJson, 3600),
      '</bad_json>',
      'Rebuild the JSON so it meets all of these requirements:',
      ...requirementList,
      'Return corrected JSON only. Do not include Markdown fences or additional commentary.'
    ];

    const prompt = promptParts.filter(Boolean).join('\n\n');

    const response = await this.callChatCompletion({
      model: 'gpt-4o',
      temperature: 0.18,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: 'You fix malformed JSON for KSAT-style grammar questions. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ]
    }, { label: 'grammar_repair', tier: 'primary' });

    const content = response.choices?.[0]?.message?.content || '';
    return this._safeParseJson(content, { label: 'grammar_repair' });
  }

  async _repairVocabularyOutput({
    rawContent,
    failureMessage = '',
    failureReasons = [],
    passage,
    docTitle,
    documentCode,
    manualExcerpt,
    answerMode,
    targetIncorrectCount,
    targetCorrectCount,
    questionText
  } = {}) {
    const invalidJson = String(rawContent || '').trim();
    if (!invalidJson) {
      throw new Error('repair requires original JSON content');
    }
    if (!this.getOpenAI()) {
      throw new Error('AI repair unavailable');
    }

    const manualNote = manualExcerpt ? clipText(manualExcerpt, 900) : '';
    const mode = answerMode === 'correct' ? 'correct' : 'incorrect';
    const incorrectCount = Number.isInteger(targetIncorrectCount)
      ? targetIncorrectCount
      : (mode === 'incorrect' ? 1 : (CIRCLED_DIGITS.length - (Number.isInteger(targetCorrectCount) ? targetCorrectCount : 1)));
    const correctCount = mode === 'correct'
      ? (Number.isInteger(targetCorrectCount) ? targetCorrectCount : 1)
      : CIRCLED_DIGITS.length - incorrectCount;

    const requirementList = [
      questionText ? `- Use the exact Korean question text: ${questionText}` : `- Use the exact Korean question text: ${mode === 'incorrect' ? VOCAB_USAGE_BASE_QUESTION : VOCAB_USAGE_SINGLE_CORRECT_QUESTION}.`,
      '- Keep the original passage verbatim and maintain exactly five <u>...</u> expressions in place.',
      '- Provide five options labelled ①-⑤ that reuse the same underlined snippets in the same order.',
      mode === 'correct'
        ? `- Mark ${correctCount} 밑줄을 "correct"로 유지하고 나머지 ${incorrectCount}개의 표현에는 문맥상 오류를 만들어 주세요.`
        : `- 변형된 ${incorrectCount}개의 밑줄을 "incorrect"로 표시하고 나머지 ${correctCount}개의 표현은 원문과 동일하게 남겨 주세요.`,
      '- Include correction.replacement + reason for the 비자연스러운 표현이 무엇인지 명확하게 설명합니다.',
      '- Provide optionReasons in Korean (정답 포함) explaining 왜 어색하거나 자연스러운지.',
      '- Keep the explanation 두 문장 이상 한국어로 작성해 주세요.',
      '- Ensure the sourceLabel begins with 출처│ and references the document title or code.'
    ];

    const reasonLines = Array.isArray(failureReasons)
      ? failureReasons.map((line) => String(line || '').trim()).filter(Boolean)
      : [];

    const validatorNotes = reasonLines.length
      ? `Validator notes:\n- ${reasonLines.join('\n- ')}`
      : '';

    const promptParts = [
      'You are a senior KSAT vocabulary problem editor. Fix the JSON output so it satisfies publication requirements.',
      failureMessage ? `Failure summary: ${failureMessage}` : '',
      validatorNotes,
      manualNote ? `Reference manual excerpt (truncated):
${manualNote}` : '',
      docTitle || documentCode ? `Document reference: ${docTitle || documentCode}` : '',
      passage ? `Original passage (keep every character verbatim):
${clipText(passage, 1800)}` : '',
      'Invalid JSON between <bad_json> and </bad_json>:',
      '<bad_json>',
      clipText(invalidJson, 3600),
      '</bad_json>',
      'Rebuild the JSON so it meets all of these requirements:',
      ...requirementList,
      'Return corrected JSON only. Do not include Markdown fences or additional commentary.'
    ];

    const prompt = promptParts.filter(Boolean).join('\n\n');

    const response = await this.callChatCompletion({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 1100,
      messages: [
        { role: 'system', content: 'You fix malformed JSON for KSAT-style vocabulary questions. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ]
    }, { label: 'vocabulary_repair', tier: 'primary' });

    const content = response.choices?.[0]?.message?.content || '';
    return this._safeParseJson(content, { label: 'vocabulary_repair' });
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
const multiIncorrectKey = normalizeQuestionKey(MULTI_INCORRECT_QUESTION);
const providedQuestionKey = context.questionText ? normalizeQuestionKey(context.questionText) : null;

let normalizedType = 'grammar';
if (String(payload.type || '').toLowerCase() === 'grammar_multi'
  || normalizedKey === multiKey
  || normalizedKey === multiIncorrectKey
  || providedQuestionKey === multiKey
  || providedQuestionKey === multiIncorrectKey
  || String(payload.questionVariant || '').toLowerCase() === 'multi'
  || (Array.isArray(payload.correctAnswers) && payload.correctAnswers.length >= 2)) {
  normalizedType = 'grammar_multi';
}

const fallbackQuestion = (() => {
  if (normalizedType === 'grammar_multi') {
    if (providedQuestionKey === multiIncorrectKey) return context.questionText;
    if (providedQuestionKey === multiKey) return context.questionText;
    if (normalizedKey === multiIncorrectKey) return MULTI_INCORRECT_QUESTION;
    if (normalizedKey === multiKey) return MULTI_QUESTION;
    return MULTI_QUESTION;
  }
  return BASE_QUESTION;
})();

const question = context.questionText || fallbackQuestion;
const questionKey = normalizeQuestionKey(question);
if (![baseKey, multiKey, multiIncorrectKey].includes(questionKey)) {
  throw new Error('unexpected grammar question');
}

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

    const passageSegments = [];
    const passageSegmentPlain = [];
    const segmentRegex = /<u[\s\S]*?>([\s\S]*?)<\/u>/gi;
    let matchSegment;
    while ((matchSegment = segmentRegex.exec(mainText)) !== null) {
      passageSegments.push(matchSegment[0]);
      passageSegmentPlain.push(normalizeWhitespace(matchSegment[1] || ''));
    }
    if (passageSegments.length !== CIRCLED_DIGITS.length) {
      throw new Error('grammar passage segment mismatch');
    }
    const enforceAlignment = context.enforceOriginalComparison !== false;
    if (enforceAlignment) {
      optionsInfo.rawTexts.forEach((optionText, idx) => {
        const optionMatch = String(optionText || '').match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
        const optionPlain = normalizeWhitespace(optionMatch && optionMatch[1] ? optionMatch[1] : String(optionText || ''));
        const targetPlain = normalizeWhitespace(passageSegmentPlain[idx] || '');
        if (optionPlain.toLowerCase() !== targetPlain.toLowerCase()) {
          throw new Error('grammar option underline mismatch');
        }
      });
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

const uniqueAnswers = [...new Set(answerCandidates.filter((num) => Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length))].sort((a, b) => a - b);

const answerMode = context.answerMode === 'correct' ? 'correct' : 'incorrect';
const targetIncorrect = Number.isInteger(context.targetIncorrectCount) ? context.targetIncorrectCount : null;
const targetCorrect = Number.isInteger(context.targetCorrectCount) ? context.targetCorrectCount : null;


    if (answerMode === 'incorrect') {
      if (uniqueAnswers.length < 1) {
        throw new Error('grammar answer missing');
      }
    } else if (uniqueAnswers.length < 1) {
      throw new Error('grammar answer missing');
    }

    let expectedAnswerCount = null;
    if (answerMode === 'incorrect') {
      if (targetIncorrect !== null) {
        expectedAnswerCount = targetIncorrect;
      } else if (normalizedType === 'grammar') {
        expectedAnswerCount = 1;
      }
    } else {
      expectedAnswerCount = targetCorrect !== null ? targetCorrect : 1;
    }

    if (expectedAnswerCount !== null && uniqueAnswers.length !== expectedAnswerCount) {
      throw new Error('grammar answer count mismatch');
    }

    const desiredAnswerIndex = Number.isInteger(context.desiredAnswerIndex)
      ? context.desiredAnswerIndex
      : null;
    if (
      desiredAnswerIndex &&
      answerMode === 'incorrect' &&
      normalizedType === 'grammar' &&
      (uniqueAnswers.length !== 1 || uniqueAnswers[0] !== desiredAnswerIndex)
    ) {
      throw new Error(`grammar answer index mismatch (${desiredAnswerIndex} expected, got ${uniqueAnswers.join(',') || 'none'})`);
    }

    const incorrectIndexSet = new Set();
    const correctIndexSet = new Set();
    for (let slot = 1; slot <= CIRCLED_DIGITS.length; slot += 1) {
      if (answerMode === 'incorrect') {
        if (uniqueAnswers.includes(slot)) {
          incorrectIndexSet.add(slot);
        } else {
          correctIndexSet.add(slot);
        }
      } else {
        if (uniqueAnswers.includes(slot)) {
          correctIndexSet.add(slot);
        } else {
          incorrectIndexSet.add(slot);
        }
      }
    }

    if (answerMode === 'incorrect' && targetIncorrect !== null && incorrectIndexSet.size !== targetIncorrect) {
      throw new Error('grammar incorrect count mismatch');
    }
    if (answerMode === 'correct') {
      const expectedCorrect = targetCorrect !== null ? targetCorrect : correctIndexSet.size;
      if (correctIndexSet.size !== expectedCorrect) {
        throw new Error('grammar correct count mismatch');
      }
    }

    const updatedStatuses = [...optionsInfo.statuses];
    for (let i = 0; i < CIRCLED_DIGITS.length; i += 1) {
      const index = i + 1;
      const expectedStatus = answerMode === 'incorrect'
        ? (incorrectIndexSet.has(index) ? 'incorrect' : 'correct')
        : (correctIndexSet.has(index) ? 'correct' : 'incorrect');
      const currentStatus = optionsInfo.statuses[i];
      if (currentStatus && currentStatus !== expectedStatus) {
        throw new Error('grammar option status conflicts with answer set');
      }
      updatedStatuses[i] = expectedStatus;
    }
    optionsInfo.statuses = updatedStatuses;

    const explanation = String(payload.explanation || '').trim();
    if (!explanation || !containsHangul(explanation)) {
      throw new Error('grammar explanation must be Korean');
    }
    if (explanation.length < GRAMMAR_MIN_EXPLANATION_LENGTH || countSentences(explanation) < GRAMMAR_MIN_EXPLANATION_SENTENCES) {
      throw new Error('grammar explanation too short');
    }

    const sourceLabel = ensureSourceLabel(payload.sourceLabel || payload.source, { docTitle, documentCode: context.documentCode });

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

    

    const plainOptionSegments = optionsInfo.rawTexts.map((raw) => {
      const match = String(raw || '').match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
      return match && match[1] ? match[1] : '';
    });

    const originalPassagePlain = normalizeWhitespace(stripTags(convertStarsToUnderline(context.passage || '')));
    const originalPassageLower = originalPassagePlain.toLowerCase();
    const enforceOriginalComparison = context.enforceOriginalComparison !== false;
    const mutatedTracker = new Set();

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
      } else if (correctIndexSet.has(i + 1)) {
        if (!/(맞|옳|적절|정상|문법적|알맞|정답)/.test(normalizedReason)) {
          throw new Error('grammar correct reason lacks confirmation keyword');
        }
      }

      if (enforceOriginalComparison && originalPassageLower) {
        const segmentPlain = normalizeWhitespace(plainOptionSegments[i] || '');
        const segmentLower = segmentPlain.toLowerCase();
        const appearsInOriginal = segmentLower && originalPassageLower.includes(segmentLower);
        if (incorrectIndexSet.has(i + 1)) {
          if (appearsInOriginal) {
            throw new Error('grammar incorrect segment unchanged from original');
          }
          mutatedTracker.add(i + 1);
        } else if (correctIndexSet.has(i + 1) && !appearsInOriginal) {
          throw new Error('grammar correct segment diverges from original');
        }
      }
    }

    if (enforceOriginalComparison && incorrectIndexSet.size && mutatedTracker.size !== incorrectIndexSet.size) {
      throw new Error('grammar mutated segment mismatch');
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
      answerMode,
      targetIncorrectCount: targetIncorrect,
      targetCorrectCount: targetCorrect,
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
    const documentCode = document?.code || document?.slug || document?.external_id || null;
    const docTitle = document?.title || documentCode || `Document ${documentId}`;
    const results = [];

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for vocabulary problems");
    }
    const manualExcerpt = readVocabularyManual(2400);
    const passageQueue = buildPassageQueue(passages, count);
    const vocabularyVariants = [
      { key: 'single_incorrect', probability: 0.25, question: VOCAB_USAGE_BASE_QUESTION, answerMode: 'incorrect', targetIncorrectCount: 1, targetCorrectCount: 4 },
      { key: 'double_incorrect', probability: 0.25, question: VOCAB_USAGE_MULTI_INCORRECT_QUESTION, answerMode: 'incorrect', targetIncorrectCount: 2, targetCorrectCount: 3 },
      { key: 'triple_incorrect', probability: 0.25, question: VOCAB_USAGE_MULTI_INCORRECT_QUESTION, answerMode: 'incorrect', targetIncorrectCount: 3, targetCorrectCount: 2 },
      { key: 'single_correct', probability: 0.25, question: VOCAB_USAGE_SINGLE_CORRECT_QUESTION, answerMode: 'correct', targetIncorrectCount: 4, targetCorrectCount: 1 }
    ];

    // New modular pipeline path (can be toggled off by setting LOE_VOCAB_PIPELINE=0)
    if (String(process.env.LOE_VOCAB_PIPELINE || '1') === '1') {
      const pipeline = createVocabPipeline({
        manualExcerpt,
        docTitle,
        callChatCompletion: (config, options) => this.callChatCompletion(config, options),
        normalizeVocabularyPayload: (payload, context) => this._normalizeVocabularyPayload(payload, context),
        repairVocabularyOutput: (params) => this._repairVocabularyOutput(params),
        buildVariantDirective: (v) => buildVocabularyVariantDirective(v),
        buildAnswerInstruction: (v) => buildVocabularyAnswerInstruction(v),
        vocabJsonBlueprint: VOCAB_USAGE_JSON_BLUEPRINT,
        deriveDirectives: (msg) => this._deriveEobeopDirectives(msg, 'vocabulary'),
        logger: console
      });

      for (let i = 0; i < count; i += 1) {
        const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
        if (!passage) continue;
        const variant = this._pickVocabularyVariant(vocabularyVariants);
        const { problem } = await pipeline.generateProblem({
          passage,
          variant,
          passageIndex: i,
          extraContext: { documentCode }
        });
        const normalizedProblem = {
          ...problem,
          id: problem.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          metadata: {
            ...(problem.metadata || {}),
            variantKey: variant.key,
            answerMode: variant.answerMode,
            targetIncorrectCount: variant.targetIncorrectCount,
            targetCorrectCount: variant.targetCorrectCount
          }
        };
        results.push(normalizedProblem);
      }
      return results;
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
      if (!passage) continue;
      let attempt = 0;
      let lastFailure = '';
      let repairBudget = 2;
      let normalizedProblem = null;
      const variant = this._pickVocabularyVariant(vocabularyVariants);

      while (attempt < 6 && !normalizedProblem) {
        attempt += 1;
        const failureReasons = [];
        let rawContent = '';
        try {
          const variantTag = `doc${documentId}_v${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const promptSections = [
            'You are a deterministic K-CSAT English vocabulary-usage item writer.',
            buildVocabularyVariantDirective(variant),
            '',
            `Passage title: ${docTitle}`,
            `Passage (keep every sentence; underline exactly five expressions with <u>...</u>):
${clipText(passage, 1600)}`,
            '',
            'Manual excerpt (truncated):',
            manualExcerpt,
            '',
            'Return raw JSON only with this structure:',
            VOCAB_USAGE_JSON_BLUEPRINT
              .replace('"question": "' + VOCAB_USAGE_BASE_QUESTION + '"', `"question": "${variant.question}"`)
              .replace('"variantTag": "V-001"', `"variantTag": "${variantTag}"`),
            '',
            'Generation requirements:',
            '- Copy the passage verbatim; do not delete or reorder sentences.',
            '- Underline exactly five expressions with <u>...</u> and reuse the identical snippets inside the options.',
            '- Keep each underlined snippet concise (about 1–6 words), never the whole sentence.',
            buildVocabularyAnswerInstruction(variant),
            '- Provide correction.replacement + reason for every 오류 표현을 교정할 수 있도록 기록합니다.',
            '- Supply optionReasons in Korean for at least three options(정답 포함) with 핵심 근거를 명확히 서술하세요.',
            '- Keep the explanation 최소 세 문장 이상 한국어로 작성(정답 근거 + 두 개 이상 오답의 결함 포함)하고, 수능 정답지 톤을 유지하세요.',
            '- Preserve any footnotes (lines starting with *).',
            '- Respond with raw JSON only (no Markdown fences).'
          ];

          const additionalDirectives = this._deriveEobeopDirectives(lastFailure, 'vocabulary');
          if (additionalDirectives.length) {
            promptSections.push('', 'Additional fixes based on the previous attempt:', ...additionalDirectives);
          }

          const prompt = promptSections.filter(Boolean).join('\n\n');

          const useHighTierModel = attempt >= 3;
          const response = await this.callChatCompletion({
            model: useHighTierModel ? 'gpt-4o' : 'gpt-4o-mini',
            temperature: useHighTierModel ? 0.24 : 0.3,
            max_tokens: useHighTierModel ? 1050 : 900,
            messages: [{ role: 'user', content: prompt }]
          }, { label: 'vocabulary', tier: useHighTierModel ? 'primary' : 'standard' });

          rawContent = response.choices?.[0]?.message?.content || '';
          const payload = this._safeParseJson(rawContent, { label: 'vocabulary' });
          normalizedProblem = this._normalizeVocabularyPayload(payload, {
            docTitle,
            documentCode,
            passage,
            index: results.length,
            failureReasons,
            answerMode: variant.answerMode,
            targetIncorrectCount: variant.targetIncorrectCount,
            targetCorrectCount: variant.targetCorrectCount,
            questionText: variant.question
          });
        } catch (error) {
          const baseMessage = String(error?.message || '') || 'unknown vocabulary failure';
          const detailMessages = [
            ...failureReasons,
            ...(Array.isArray(error?.failureReasons) ? error.failureReasons : [])
          ].map((reason) => String(reason || '').trim()).filter(Boolean);
          let uniqueDetails = [...new Set(detailMessages)];
          let message = uniqueDetails.length ? `${baseMessage} :: ${uniqueDetails.join('; ')}` : baseMessage;
          const rawForRepair = rawContent || error?.rawContent || '';
          if (!normalizedProblem && rawForRepair && repairBudget > 0 && this.getOpenAI()) {
            repairBudget -= 1;
            try {
              const repairedPayload = await this._repairVocabularyOutput({
                rawContent: rawForRepair,
                failureMessage: message,
                failureReasons: uniqueDetails,
                passage,
                docTitle,
                documentCode,
                manualExcerpt,
                answerMode: variant.answerMode,
                targetIncorrectCount: variant.targetIncorrectCount,
                targetCorrectCount: variant.targetCorrectCount,
                questionText: variant.question
              });
              const repairFailureReasons = [];
              normalizedProblem = this._normalizeVocabularyPayload(repairedPayload, {
                docTitle,
                documentCode,
                passage,
                index: results.length,
                failureReasons: repairFailureReasons,
                answerMode: variant.answerMode,
                targetIncorrectCount: variant.targetIncorrectCount,
                targetCorrectCount: variant.targetCorrectCount,
                questionText: variant.question
              });
              if (normalizedProblem) {
                message = '';
              } else if (repairFailureReasons.length) {
                uniqueDetails = [...new Set([
                  ...uniqueDetails,
                  ...repairFailureReasons.map((reason) => String(reason || '').trim()).filter(Boolean)
                ])];
                message = uniqueDetails.length ? `${baseMessage} :: ${uniqueDetails.join('; ')}` : baseMessage;
              }
            } catch (repairError) {
              const repairMessage = String(repairError?.message || repairError) || 'repair failed';
              message = message ? `${message} :: repair_failed(${repairMessage})` : `repair_failed(${repairMessage})`;
            }
          }
          if (!normalizedProblem) {
            lastFailure = message;
            console.warn('[ai-vocab] generation failed:', lastFailure);
          }
        }
      }

      if (!normalizedProblem) {
        throw new Error(`[ai-vocab] generation failed after retries: ${lastFailure || 'unknown vocabulary failure'}`);
      }

      normalizedProblem.id = normalizedProblem.id || `vocab_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      normalizedProblem.metadata = {
        ...(normalizedProblem.metadata || {}),
        variantKey: variant.key,
        answerMode: variant.answerMode,
        targetIncorrectCount: variant.targetIncorrectCount,
        targetCorrectCount: variant.targetCorrectCount
      };
      results.push(normalizedProblem);
    }

    return results;
  }

  async generateTitle(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const manualExcerpt = readTitleManual(2000);
    const results = [];
    const passageQueue = buildPassageQueue(passages, count);

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for title problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
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
    const passageQueue = buildPassageQueue(passages, count);

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for theme problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
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
    const passageQueue = buildPassageQueue(passages, count);

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
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
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

  async generateSummary(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    if (!this.getOpenAI()) throw new Error("AI generator unavailable for summary problems");
    const manualExcerpt = getSummaryManualExcerpt(3200);
    const documentCode = document?.code || document?.slug || document?.external_id || null;
    const docTitle = document?.title || documentCode || `Document ${documentId}`;
    const results = [];
    const passageQueue = buildPassageQueue(passages, count);

    for (let i = 0; i < count; i += 1) {
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
      if (!passage) continue;
      let success = false;
      let attempts = 0;
      let lastFailure = '';
      const variantSeed = `doc${documentId}_p${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      while (!success && attempts < 5) {
        attempts += 1;
        try {
          const prompt = buildSummaryPrompt({
            passage,
            docTitle,
            manualExcerpt,
            variantTag: `${variantSeed}_t${attempts}`,
            extraDirectives: deriveSummaryDirectives(lastFailure)
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
            passage,
            documentCode
          });
          if (!problem) throw new Error("summary coercion failed");
          const validation = validateSummaryProblem(problem);
          if (!validation.valid) {
            throw new Error(`summary validation issues: ${validation.issues.join(',')}`);
          }
          problem.sourceLabel = ensureSourceLabel(problem.sourceLabel, { docTitle, documentCode });
          problem.metadata = problem.metadata || {};
          problem.metadata.documentId = documentId;
          results.push(problem);
          success = true;
          lastFailure = '';
        } catch (error) {
          lastFailure = error?.message || String(error);
          console.warn("[ai-summary] generation failed:", lastFailure);
          if (attempts >= 5) {
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
    const documentCode = document?.code || document?.slug || document?.external_id || null;
    const docTitle = document?.title || documentCode || `Document ${documentId}`;
    const answerHistory = [];
    const baselinePath = path.join(__dirname, '..', 'utils', 'data', 'wolgo-2024-03-grammar-baseline.json');

    const pipeline = createGrammarPipeline({
      manualExcerpt,
      docTitle,
      baselinePath,
      callChatCompletion: (config, options) => this.callChatCompletion(config, options),
      normalizeGrammarPayload: (payload, context) => this._normalizeGrammarPayload(payload, context),
      repairGrammarOutput: (params) => this._repairGrammarOutput(params),
      logger: console,
      answerHistory
    });

    const grammarVariants = [
      { key: 'single_incorrect', probability: 0.25, question: BASE_QUESTION, answerMode: 'incorrect', targetIncorrectCount: 1, targetCorrectCount: CIRCLED_DIGITS.length - 1 },
      { key: 'double_incorrect', probability: 0.25, question: MULTI_INCORRECT_QUESTION, answerMode: 'incorrect', targetIncorrectCount: 2, targetCorrectCount: CIRCLED_DIGITS.length - 2 },
      { key: 'triple_incorrect', probability: 0.25, question: MULTI_INCORRECT_QUESTION, answerMode: 'incorrect', targetIncorrectCount: 3, targetCorrectCount: CIRCLED_DIGITS.length - 3 },
      { key: 'single_correct', probability: 0.25, question: MULTI_QUESTION, answerMode: 'correct', targetIncorrectCount: CIRCLED_DIGITS.length - 1, targetCorrectCount: 1 }
    ];

    const passageQueue = buildPassageQueue(passages, count);
    const results = [];

    for (let i = 0; i < count; i += 1) {
      const passage = passageQueue[i] || passages[i % (passages.length || 1)] || '';
      if (!passage) continue;
      const variant = this._pickGrammarVariant(grammarVariants);

      const { problem, meta, desiredIndex } = await pipeline.generateProblem({
        passage,
        variant,
        passageIndex: i,
        extraContext: {
          order: results.length + 1,
          documentCode
        }
      });

      const normalizedProblem = {
        ...problem,
        id: problem.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        metadata: {
          ...(problem.metadata || {}),
          pipeline: meta
        }
      };

      results.push(normalizedProblem);
      const primaryAnswer = this._parsePrimaryAnswerIndex(normalizedProblem.answer || normalizedProblem.correctAnswer);
      if (primaryAnswer) {
        answerHistory.push(primaryAnswer);
      } else if (desiredIndex) {
        answerHistory.push(desiredIndex);
      }
    }

    return results;
  }

  _prepareVariantQueue(type, variants = []) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return [];
    }
    const queueKey = type === 'grammar' ? '_grammarVariantQueue' : '_vocabularyVariantQueue';
    const signatureKey = type === 'grammar' ? '_grammarVariantSignature' : '_vocabularyVariantSignature';
    const signature = variants
      .map((variant) => `${variant.key || variant.question || ''}:${variant.probability ?? ''}`)
      .join('|');
    if (!Array.isArray(this[queueKey]) || this[queueKey].length === 0 || this[signatureKey] !== signature) {
      this[queueKey] = this._buildVariantRotationQueue(variants);
      this[signatureKey] = signature;
    }
    return this[queueKey];
  }

  _buildVariantRotationQueue(variants = []) {
    const clones = variants.map((variant) => ({ ...variant }));
    for (let i = clones.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [clones[i], clones[j]] = [clones[j], clones[i]];
    }
    return clones;
  }

  _pickGrammarVariant(variants = []) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return null;
    }
    const queue = this._prepareVariantQueue('grammar', variants);
    const next = queue.shift();
    return next || variants[0];
  }

  _pickVocabularyVariant(variants = []) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return null;
    }
    const queue = this._prepareVariantQueue('vocabulary', variants);
    const next = queue.shift();
    return next || variants[0];
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
