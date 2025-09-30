const fs = require("fs");
const path = require("path");
const database = require("../models/database");

let OpenAI = null;
try {
  OpenAI = require("openai");
} catch (error) {
  console.warn("[aiProblemService] OpenAI SDK unavailable:", error?.message || error);
}

const GRAMMAR_MANUAL_PATH = path.join(__dirname, "..", "..", "problem manual", "grammar_problem_manual.md");
const TITLE_MANUAL_PATH = path.join(__dirname, "..", "..", "docs", "problem-templates", "title-master.md");
let cachedGrammarManual = null;
let cachedTitleManual = null;

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
  MULTI_QUESTION
} = require("../utils/eobeopTemplate");

const SOURCE_PREFIX_REGEX = /^\s*(?:\ucd9c\ucc98|Source)\s*[:\u2502-]?\s*/iu;
const UNDERLINE_PATTERN = /<u[\s\S]*?<\/u>/gi;

function stripTags(text = "") {
  return String(text).replace(/<[^>]+>/g, "");
}

function normalizeWhitespace(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function escapeRegex(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripJsonFences(text) {
  if (!text) return "";
  return String(text)
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
}

function clipText(text, limit = 1800) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)} \u2026`;
}

function readGrammarManual(limit = 2000) {
  if (cachedGrammarManual === null) {
    try {
      cachedGrammarManual = fs.readFileSync(GRAMMAR_MANUAL_PATH, "utf8");
    } catch (error) {
      console.warn("[aiProblemService] failed to load grammar manual:", error?.message || error);
      cachedGrammarManual = "";
    }
  }
  if (!cachedGrammarManual) return "";
  return cachedGrammarManual.slice(0, limit);
}

function readTitleManual(limit = 1600) {
  if (cachedTitleManual === null) {
    try {
      cachedTitleManual = fs.readFileSync(TITLE_MANUAL_PATH, "utf8");
    } catch (error) {
      console.warn("[aiProblemService] failed to load title manual:", error?.message || error);
      cachedTitleManual = "";
    }
  }
  if (!cachedTitleManual) return "";
  return cachedTitleManual.slice(0, limit);
}

function shuffleUnique(source, size) {
  const arr = Array.isArray(source) ? [...source] : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, size);
}

function normalizeGrammarOptions(options = []) {
  if (!Array.isArray(options)) return [];
  const normalized = [];
  for (let i = 0; i < 5 && i < options.length; i += 1) {
    let text = options[i];
    if (text && typeof text === "object") {
      text = text.text || text.value || text.content;
    }
    if (typeof text !== "string") {
      normalized.push("");
      continue;
    }
    let clean = text.trim();
    clean = clean.replace(/^[\u2460-\u2468]\s*/, "").trim();
    if (!clean.startsWith("<u>")) {
      const numericEnumerator = clean.match(/^\s*\(?\d{1,2}\s*[\).:-]\s+/);
      if (numericEnumerator) {
        clean = clean.slice(numericEnumerator[0].length).trim();
      }
      const letterWithPunctuation = clean.match(/^\s*(?:\(?\s*[A-E]\s*[\).:-])\s+/i);
      if (letterWithPunctuation) {
        clean = clean.slice(letterWithPunctuation[0].length).trim();
      } else {
        const letterBeforeUnderline = clean.match(/^\s*(?:\(?\s*[A-E]\s+)(?=<u>)/i);
        if (letterBeforeUnderline) {
          clean = clean.slice(letterBeforeUnderline[0].length).trim();
        }
      }
    }
    if (!clean.includes("<u>")) {
      normalized.push("");
      continue;
    }
    normalized.push(`${GRAMMAR_DIGITS[i]} ${clean}`);
  }
  while (normalized.length < 5) {
    normalized.push("");
  }
  return normalized;
}

function extractOptionUnderlines(options = [], failureReasons = null) {
  if (!Array.isArray(options)) return [];
  const segments = [];
  for (let i = 0; i < options.length; i += 1) {
    const text = typeof options[i] === "string" ? options[i] : "";
    const match = text.match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
    if (!match || !match[1]) {
      if (failureReasons) {
        failureReasons.push(`옵션 ${i + 1}에 밑줄 구간이 없음`);
      }
      return [];
    }
    segments.push(match[1]);
  }
  return segments;
}

const HYPHEN_VARIANTS = ['-', '\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2212'];
const HYPHEN_VARIANT_SET = new Set(HYPHEN_VARIANTS);

function isAlphabetic(char) {
  return /^[A-Za-z]$/.test(char || '');
}

function rangeOverlaps(used, start, end) {
  if (!used) return false;
  for (let i = start; i < end; i += 1) {
    if (used[i]) return true;
  }
  return false;
}

function markRangeUsed(used, start, end) {
  if (!used) return;
  for (let i = start; i < end; i += 1) {
    used[i] = true;
  }
}

function expandToWordBoundaries(plain, start, end) {
  let newStart = start;
  let newEnd = end;
  while (newStart > 0 && isAlphabetic(plain[newStart - 1]) && isAlphabetic(plain[newStart])) {
    newStart -= 1;
  }
  while (newEnd < plain.length && isAlphabetic(plain[newEnd - 1]) && isAlphabetic(plain[newEnd])) {
    newEnd += 1;
  }
  return { start: newStart, end: newEnd };
}

function buildNormalizedMap(text) {
  const chars = [];
  const map = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (/\s/.test(ch)) continue;
    if (HYPHEN_VARIANT_SET.has(ch)) continue;
    chars.push(ch.toLowerCase());
    map.push(i);
  }
  return {
    text: chars.join(''),
    map
  };
}

function findNormalizedMatch(normalized, segment, startOffset, allowSuffix = false) {
  const { text } = normalized;
  let offset = startOffset;
  while (offset <= text.length - segment.length) {
    const idx = text.indexOf(segment, offset);
    if (idx === -1) break;
    return { index: idx, length: segment.length };
  }
  if (!allowSuffix) {
    return { index: -1, length: 0 };
  }
  const suffixPattern = new RegExp(`${escapeRegex(segment)}[a-z]{1,3}`, 'i');
  const slice = text.slice(startOffset);
  const match = slice.match(suffixPattern);
  if (!match || typeof match.index !== 'number') {
    return { index: -1, length: 0 };
  }
  return {
    index: startOffset + match.index,
    length: match[0].length
  };
}

function locateSegmentRange({
  plain,
  normalized,
  normalizedCursor,
  rawSegment,
  used,
  failureReasons
}) {
  const cleaned = normalizeWhitespace(stripTags(rawSegment || ''));
  if (!cleaned) {
    if (failureReasons) failureReasons.push('옵션 밑줄이 비어 있음');
    return null;
  }

  const punctuationTrimmed = cleaned.replace(/[.,;:!?"']+$/u, '').trim();
  const candidateSegments = [cleaned];
  if (punctuationTrimmed && punctuationTrimmed !== cleaned) {
    candidateSegments.push(punctuationTrimmed);
  }

  const normalizedSegments = candidateSegments
    .map((candidate) => ({
      original: candidate,
      normalized: candidate
        .replace(/[\s]+/g, '')
        .replace(new RegExp(`[${HYPHEN_VARIANTS.join('')}]`, 'g'), '')
        .toLowerCase()
    }))
    .filter((item) => item.normalized.length > 0);

  if (!normalizedSegments.length) {
    if (failureReasons) failureReasons.push(`본문에서 "${cleaned}" 위치를 찾을 수 없음`);
    return null;
  }

  const searchOffsets = [normalizedCursor.current, 0];

  for (const segment of normalizedSegments) {
    const allowSuffix = segment.normalized.length >= 4;
    for (const baseOffset of searchOffsets) {
      let offset = baseOffset;
      while (offset <= normalized.text.length - segment.normalized.length) {
        const { index, length } = findNormalizedMatch(normalized, segment.normalized, offset, allowSuffix);
        if (index === -1) {
          break;
        }

        const plainStart = normalized.map[index];
        const plainEnd = normalized.map[index + length - 1] + 1;
        const expanded = expandToWordBoundaries(plain, plainStart, plainEnd);

        if (rangeOverlaps(used, expanded.start, expanded.end)) {
          offset = index + 1;
          continue;
        }

        markRangeUsed(used, expanded.start, expanded.end);
        normalizedCursor.current = Math.max(normalizedCursor.current, index + length);
        return {
          start: expanded.start,
          end: expanded.end
        };
      }
    }
  }

  if (failureReasons) {
    failureReasons.push(`본문에서 "${cleaned}" 위치를 찾을 수 없음`);
  }
  return null;
}

function rebuildUnderlinesFromOptions(mainText, options = [], failureReasons = null) {
  if (!mainText) return null;
  const segments = extractOptionUnderlines(options, failureReasons);
  if (segments.length !== 5) return null;

  const plain = String(mainText).replace(/<\/?u[^>]*>/gi, '');
  const normalized = buildNormalizedMap(plain);
  const normalizedCursor = { current: 0 };
  const used = new Array(plain.length).fill(false);
  const ranges = [];

  for (let i = 0; i < segments.length; i += 1) {
    const range = locateSegmentRange({
      plain,
      normalized,
      normalizedCursor,
      rawSegment: segments[i],
      used,
      failureReasons
    });
    if (!range) {
      return null;
    }
    ranges.push(range);
  }

  const sorted = ranges
    .map((range, index) => ({ ...range, index }))
    .sort((a, b) => a.start - b.start);

  const rebuiltParts = [];
  let cursor = 0;
  for (const item of sorted) {
    rebuiltParts.push(plain.slice(cursor, item.start));
    rebuiltParts.push(`<u>${plain.slice(item.start, item.end)}</u>`);
    cursor = item.end;
  }
  rebuiltParts.push(plain.slice(cursor));

  const rebuilt = rebuiltParts.join('');
  const rebuiltCount = (rebuilt.match(UNDERLINE_PATTERN) || []).length;
  if (rebuiltCount !== 5) {
    if (failureReasons) failureReasons.push(`복원 후에도 밑줄이 ${rebuiltCount}개`);
    return null;
  }

  const updatedOptions = ranges.map((range, index) => {
    const snippet = plain.slice(range.start, range.end);
    return `${GRAMMAR_DIGITS[index]} <u>${snippet}</u>`;
  });

  return {
    mainText: rebuilt,
    options: updatedOptions
  };
}

function ensureSourceLabel(raw, context) {
  const value = String(raw || "").trim();
  if (value) {
    const normalized = value.replace(SOURCE_PREFIX_REGEX, "\ucd9c\ucc98\u2502").trim();
    if (normalized.startsWith("\ucd9c\ucc98\u2502")) {
      return normalized;
    }
  }
  const docTitle = String((context && context.docTitle) || "").trim();
  return docTitle ? `\ucd9c\ucc98\u2502${docTitle}` : "\ucd9c\ucc98\u2502LoE Source";
}

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
          'INSERT INTO problem_exposures (user_id, problem_id, first_seen_at, last_seen_at, exposure_count) ' +
            'VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1) ' +
            'ON CONFLICT(user_id, problem_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP, exposure_count = exposure_count + 1',
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
    const results = [];
    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for blank problems");
    }

    const question = "\ub2e4\uc74c \uae00\uc758 \ube48\uce78\uc5d0 \uc801\uc808\ud55c \ub9d0\uc744 \uace0\ub974\uc2dc\uc624.";

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let attempts = 0;
      let assigned = false;
      while (!assigned && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a CSAT English cloze item writer.",
            "Create exactly one four-option multiple-choice question.",
            "",
            `Passage:\n${clipText(passage, 900)}`,
            "",
            "Return JSON only:",
            "{",
            "  \"type\": \"blank\",",
            `  \"question\": \"${question}\",`,
            "  \"text\": \"... one blank ...\",",
            "  \"options\": [\"option1\", \"option2\", \"option3\", \"option4\"],",
            "  \"correctAnswer\": 2,",
            "  \"explanation\": \"Korean rationale\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98: ...\"",
            "}"
          ].join("\n");

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.45,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'blank' });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || "").trim())
            : [];
          const answer = Number(payload.correctAnswer || payload.answer);
          if (options.length === 4 && Number.isInteger(answer) && answer >= 1 && answer <= 4) {
            results.push({
              id: payload.id || `blank_ai_${Date.now()}_${results.length}`,
              type: "blank",
              question,
              text: payload.text || payload.passage || passage,
              options,
              answer: String(answer),
              correctAnswer: String(answer),
              explanation: String(payload.explanation || "").trim(),
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle }),
              metadata: {
                documentTitle: docTitle,
                generator: 'openai'
              }
            });
            assigned = true;
          } else {
            throw new Error("invalid blank structure");
          }
        } catch (error) {
          console.warn("[ai-blank] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw new Error(`[ai-blank] generation failed after retries: ${error?.message || error}`);
          }
        }
      }
    }

    return results;
  }

  async generateVocab(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const question = "\ub2e4\uc74c \uae00\uc758 \ube7c\ub9ac\uae30 \ub41c \ub2e8\uc5b4\uc640 \uc758\ubbf8\uc0ac\uac74 \uac00\uc7a5 \uac19\uc740 \ub2e8\uc5b4\ub97c \uace0\ub974\uc2dc\uc624.";
    const results = [];

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for vocabulary problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a CSAT synonym vocabulary item writer.",
            `Passage:\n${clipText(passage, 900)}`,
            "",
            "Return JSON only:",
            "{",
            "  \"type\": \"vocabulary\",",
            `  \"question\": \"${question}\",`,
            "  \"text\": \"... <u>target</u> ...\",",
            "  \"options\": [\"option1\", \"option2\", \"option3\", \"option4\"],",
            "  \"correctAnswer\": 1,",
            "  \"explanation\": \"Korean rationale\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98: ...\"",
            "}"
          ].join("\n");

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'vocabulary' });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || "").trim())
            : [];
          const answer = Number(payload.correctAnswer || payload.answer);
          if (options.length === 4 && Number.isInteger(answer) && answer >= 1 && answer <= 4) {
            results.push({
              id: payload.id || `vocab_ai_${Date.now()}_${results.length}`,
              type: "vocabulary",
              question,
              text: payload.text || passage,
              options,
              answer: String(answer),
              correctAnswer: String(answer),
              explanation: String(payload.explanation || "").trim(),
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle }),
              metadata: {
                documentTitle: docTitle,
                generator: 'openai'
              }
            });
            success = true;
          } else {
            throw new Error("invalid vocabulary structure");
          }
        } catch (error) {
          console.warn("[ai-vocab] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw new Error(`[ai-vocab] generation failed after retries: ${error?.message || error}`);
          }
        }
      }
    }

    return results;
  }

  async generateTitle(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const question = "\ub2e4\uc74c \uae00\uc758 \uc81c\ubaa9\uc73c\ub85c \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
    const results = [];
    const manualExcerpt = readTitleManual(1600);

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for title problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a deterministic KSAT English title item writer.",
            "Follow the style contract exactly. The question text must remain Korean.",
            `Passage (retain sentences):\n${clipText(passage, 1400)}`,
            "",
            "Title construction contract (truncated):",
            manualExcerpt,
            "",
            "Return JSON only with this exact shape:",
            "{",
            "  \"type\": \"title\",",
            `  \"question\": \"${question}\",`,
            "  \"options\": [\"Title option 1\", \"Title option 2\", \"Title option 3\", \"Title option 4\", \"Title option 5\"],",
            "  \"correctAnswer\": 3,",
            "  \"explanation\": \"한국어로 논지/오답 결함을 설명\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98│기관 연도 회차 문항 (pXX)\"",
            "}"
          ].filter(Boolean).join("\n");

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.45,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'title' });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || "").trim()).filter(Boolean)
            : [];
          const answer = Number(payload.correctAnswer || payload.answer);
          const explanation = String(payload.explanation || "").trim();
          const sourceLabel = ensureSourceLabel(payload.sourceLabel, { docTitle });

          const isValidWordCount = (text) => {
            const words = text.split(/\s+/).filter(Boolean);
            return words.length >= 6 && words.length <= 12;
          };

          if (options.length !== 5) {
            throw new Error("title options must contain 5 entries");
          }
          if (options.some((opt) => !isValidWordCount(opt))) {
            throw new Error("title options must be 6-12 words");
          }
          if (!Number.isInteger(answer) || answer < 1 || answer > 5) {
            throw new Error("invalid title answer index");
          }
          if (!/[가-힣]/.test(explanation)) {
            throw new Error("title explanation must be in Korean");
          }

          results.push({
            id: payload.id || `title_ai_${Date.now()}_${results.length}`,
            type: "title",
            question,
            text: passage,
            options,
            answer: String(answer),
            correctAnswer: String(answer),
            explanation,
            sourceLabel,
            metadata: {
              documentTitle: docTitle,
              generator: 'openai'
            }
          });
          success = true;
        } catch (error) {
          console.warn("[ai-title] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw new Error(`[ai-title] generation failed after retries: ${error?.message || error}`);
          }
        }
      }
    }

    return results;
  }

  async generateTheme(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const docTitle = document?.title || `Document ${documentId}`;
    const question = "\ub2e4\uc74c \uae00\uc758 \uc8fc\uc81c\ub85c \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
    const results = [];

    if (!this.getOpenAI()) {
      throw new Error("AI generator unavailable for theme problems");
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a CSAT English main idea/item writer.",
            `Passage:\n${clipText(passage, 1200)}`,
            "",
            "Return JSON only:",
            "{",
            "  \"type\": \"theme\",",
            `  \"question\": \"${question}\",`,
            "  \"options\": [\"option1\", \"option2\", \"option3\", \"option4\"],",
            "  \"correctAnswer\": 3,",
            "  \"explanation\": \"Korean rationale\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98: ...\"",
            "}"
          ].join("\n");

          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'theme' });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || "").trim())
            : [];
          const answer = Number(payload.correctAnswer || payload.answer);
          if (options.length === 4 && Number.isInteger(answer) && answer >= 1 && answer <= 4) {
            results.push({
              id: payload.id || `theme_ai_${Date.now()}_${results.length}`,
              type: "theme",
              question,
              text: passage,
              options,
              answer: String(answer),
              correctAnswer: String(answer),
              explanation: String(payload.explanation || "").trim(),
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle }),
              metadata: {
                documentTitle: docTitle,
                generator: 'openai'
              }
            });
            success = true;
          } else {
            throw new Error("invalid theme structure");
          }
        } catch (error) {
          console.warn("[ai-theme] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw new Error(`[ai-theme] generation failed after retries: ${error?.message || error}`);
          }
        }
      }
    }

    return results;
  }

  async generateTopic(documentId, count = 5) {
    return this.generateTheme(documentId, count);
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
    if (!raw || typeof raw !== "object") return null;

    const rawType = typeof raw.type === "string" ? raw.type.trim().toLowerCase() : "";
    const declaredAnswers = Array.isArray(raw.correctAnswers)
      ? raw.correctAnswers
      : Array.isArray(raw.answers)
        ? raw.answers
        : null;
    const isMulti = rawType === 'grammar_multi' || (declaredAnswers && declaredAnswers.length >= 2);
    const normalizedType = isMulti ? 'grammar_multi' : 'grammar';
    const expectedQuestion = normalizedType === 'grammar_multi' ? MULTI_QUESTION : BASE_QUESTION;
    const questionText = String(raw.question || '').trim();
    const question = questionText || expectedQuestion;
    const originalPassage = String(context.originalPassage ?? context.passage ?? '').trim();
    let mainText = String(raw.passage || raw.text || raw.mainText || context.passage || '').trim();
    let options = normalizeGrammarOptions(raw.options || raw.choices || []);
    const failureReasons = Array.isArray(context?.failureReasons) ? context.failureReasons : null;

    const reject = (reason) => {
      if (failureReasons) failureReasons.push(reason);
      return null;
    };

    if (options.length !== 5 || options.some((opt) => !opt)) {
      return reject('선택지가 5개 미만이거나 형식이 맞지 않음');
    }
    let underlineCount = (mainText.match(UNDERLINE_PATTERN) || []).length;
    if (underlineCount !== 5) {
      const rebuilt = rebuildUnderlinesFromOptions(mainText, options, failureReasons);
      if (rebuilt) {
        mainText = rebuilt.mainText;
        options = rebuilt.options;
        underlineCount = 5;
      } else {
        return reject(`본문의 밑줄 수(${underlineCount})가 5가 아님 (옵션 기반 보정 실패)`);
      }
    }

    const answerKeys = ['correctAnswers', 'answers', 'answer', 'correctAnswer'];
    let answers = [];
    for (const key of answerKeys) {
      if (raw[key] !== undefined && raw[key] !== null) {
        const value = Array.isArray(raw[key]) ? raw[key] : String(raw[key]).split(/[\s,]+/);
        answers = value
          .map((token) => parseInt(String(token).trim(), 10))
          .filter((num) => Number.isInteger(num) && num >= 1 && num <= 5);
        if (answers.length) break;
      }
    }

    const uniqueAnswers = [...new Set(answers)].sort((a, b) => a - b);
    const minCorrect = isMulti ? 2 : 1;
    if (uniqueAnswers.length < minCorrect) {
      return reject(`정답 번호가 ${minCorrect}개 미만(${uniqueAnswers.length}개)`);
    }

    const explanation = String(raw.explanation || '').trim();
    const sourceLabel = ensureSourceLabel(raw.sourceLabel || raw.source, context);
    const normalizedQuestion = question === expectedQuestion ? question : expectedQuestion;

    const validation = validateGrammarProblem({
      type: normalizedType,
      question: normalizedQuestion,
      passage: mainText,
      mainText,
      options,
      explanation,
      sourceLabel,
      correctAnswers: uniqueAnswers
    }, { minCorrect });

    if (!validation.valid) {
      console.warn('[ai-grammar] validation issues:', validation.issues);
      return reject(`검증 실패: ${validation.issues.join('; ')}`);
    }

    const answerValue = validation.answers.length === 1
      ? String(validation.answers[0])
      : validation.answers.join(',');

    const metadata = {
      documentTitle: context.docTitle,
      passageIndex: context.index + 1,
      generator: 'openai',
      correctCount: validation.answers.length
    };
    if (raw.grammarPoint) {
      metadata.grammarPoint = raw.grammarPoint;
    }
    if (originalPassage) {
      metadata.originalPassage = originalPassage;
    }

    return {
      id: raw.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: normalizedType,
      question: normalizedQuestion,
      mainText,
      passage: mainText,
      originalPassage: originalPassage || undefined,
      options,
      answer: answerValue,
      correctAnswer: answerValue,
      explanation,
      sourceLabel,
      difficulty: 'csat-advanced',
      metadata
    };
  }

  async generateGrammar(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    if (!this.getOpenAI()) throw new Error("AI generator unavailable for grammar problems");
    const manualExcerpt = readGrammarManual(2000);
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
          const variantTag = `doc${documentId}_p${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const prompt = buildGrammarPrompt({
            passage,
            docTitle,
            passageIndex: i,
            difficulty: "advanced",
            manualExcerpt,
            variantTag
          });
          const response = await this.callChatCompletion({
            model: "gpt-4o-mini",
            temperature: 0.25,
            max_tokens: 900,
            messages: [{ role: "user", content: prompt }]
          }, { label: 'grammar' });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const failureReasons = [];
          const problem = this.formatGrammarProblem(payload, {
            docTitle,
            passage,
            index: results.length,
            failureReasons
          });
          if (!problem) {
            const detail = failureReasons.length ? `: ${failureReasons.join(' | ')}` : '';
            throw new Error(`grammar formatting failed${detail}`);
          }
          results.push(problem);
          success = true;
        } catch (error) {
          console.warn("[ai-grammar] generation failed:", error?.message || error);
          if (attempts >= 3) {
            throw error;
          }
        }
      }
    }

    return results;
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
    let query = 'SELECT p.* FROM problems p';

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

    if (Number.isInteger(userId) && userId > 0) {
      query += ' AND pe.problem_id IS NULL';
    }

    const fetchCount = Math.max(requested * 2, requested);
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(fetchCount);

    const rows = await database.all(query, params);
    const problems = rows.map((row) => this._mapDbProblem(row)).filter(Boolean);
    return problems.slice(0, requested);
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

    return saved;
  }
}

module.exports = new AIProblemService();

