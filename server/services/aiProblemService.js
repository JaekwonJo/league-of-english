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
let cachedGrammarManual = null;

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
  BASE_QUESTION
} = require("../utils/eobeopTemplate");

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
      clean = clean.replace(/^[0-9]+\.?\s*/, "").trim();
      clean = clean.replace(/^[A-E]\.?\s*/i, "").trim();
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

function ensureSourceLabel(raw, context) {
  const value = String(raw || "").trim();
  if (value.startsWith("\ucd9c\ucc98:")) return value;
  const docTitle = String(context.docTitle || "").trim();
  return docTitle ? `\ucd9c\ucc98: ${docTitle}` : "\ucd9c\ucc98: LoE Source";
}

class AIProblemService {
  constructor() {
    this._openai = null;
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
    const { passages } = await this.getPassages(documentId);
    const results = [];
    const openai = this.getOpenAI();
    if (!openai) {
      return this.generateBlankRule(passages, count);
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

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.45,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          });
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
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle: "" })
            });
            assigned = true;
          } else {
            throw new Error("invalid blank structure");
          }
        } catch (error) {
          console.warn("[ai-blank] generation failed:", error?.message || error);
          if (attempts >= 3) {
            results.push(...this.generateBlankRule([passage], 1));
            assigned = true;
          }
        }
      }
    }

    return results;
  }

  generateBlankRule(passages, count) {
    const question = "\ub2e4\uc74c \uae00\uc758 \ube48\uce78\uc5d0 \uc801\uc808\ud55c \ub9d0\uc744 \uace0\ub974\uc2dc\uc624.";
    const results = [];
    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      const words = (String(passage).match(/\b[A-Za-z]{5,}\b/g) || []).slice(0, 120);
      if (words.length < 4) continue;
      const answerWord = words[Math.floor(Math.random() * words.length)];
      const distractors = shuffleUnique(words.filter((word) => word !== answerWord), 3);
      const options = shuffleUnique([answerWord, ...distractors], 4);
      const answerIndex = options.findIndex((word) => word === answerWord);
      results.push({
        id: `blank_rule_${Date.now()}_${i}`,
        type: "blank",
        question,
        text: String(passage).replace(new RegExp(`\\b${answerWord}\\b`), "_____"),
        options,
        answer: String(answerIndex + 1),
        correctAnswer: String(answerIndex + 1),
        explanation: `Answer: ${answerWord}`
      });
    }
    return results;
  }

  async generateVocab(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const openai = this.getOpenAI();
    const question = "\ub2e4\uc74c \uae00\uc758 \ube7c\ub9ac\uae30 \ub41c \ub2e8\uc5b4\uc640 \uc758\ubbf8\uc0ac\uac74 \uac00\uc7a5 \uac19\uc740 \ub2e8\uc5b4\ub97c \uace0\ub974\uc2dc\uc624.";
    const results = [];

    if (!openai) {
      for (let i = 0; i < count; i += 1) {
        const passage = passages[i % passages.length];
        const words = (String(passage).match(/\b[A-Za-z]{5,}\b/g) || []).slice(0, 20);
        if (words.length < 4) continue;
        const target = words[0];
        const options = shuffleUnique(words.slice(1), 3);
        const answer = Math.floor(Math.random() * 4) + 1;
        const finalOptions = [...options];
        finalOptions.splice(answer - 1, 0, target);
        results.push({
          id: `vocab_rule_${Date.now()}_${i}`,
          type: "vocabulary",
          question,
          text: passage,
          options: finalOptions,
          answer: String(answer),
          correctAnswer: String(answer),
          explanation: `Target word: ${target}`
        });
      }
      return results;
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

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          });
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
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle: "" })
            });
            success = true;
          } else {
            throw new Error("invalid vocabulary structure");
          }
        } catch (error) {
          console.warn("[ai-vocab] generation failed:", error?.message || error);
          if (attempts >= 3) {
            const fallback = this.generateBlankRule([passage], 1)[0];
            if (fallback) {
              fallback.type = "vocabulary";
              fallback.question = question;
              results.push(fallback);
            }
            success = true;
          }
        }
      }
    }

    return results;
  }

  async generateTitle(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const openai = this.getOpenAI();
    const question = "\ub2e4\uc74c \uae00\uc758 \uc81c\ubaa9\uc73c\ub85c \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
    const results = [];

    if (!openai) {
      return passages.slice(0, count).map((passage, index) => ({
        id: `title_rule_${Date.now()}_${index}`,
        type: "title",
        question,
        text: passage,
        options: shuffleUnique([
          "Mindfulness and Focus",
          "Technological Innovations",
          "Historical Anecdotes",
          "Environmental Concerns"
        ], 4),
        answer: "1",
        correctAnswer: "1",
        explanation: "\uc77c\uce58\ud558\ub294 \ubb38\ub2e8\uc744 \ucc3e\uc73c\uc138\uc694."
      }));
    }

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        attempts += 1;
        try {
          const prompt = [
            "You are a CSAT English main-idea/title item writer.",
            `Passage:\n${clipText(passage, 1200)}`,
            "",
            "Return JSON only:",
            "{",
            "  \"type\": \"title\",",
            `  \"question\": \"${question}\",`,
            "  \"options\": [\"option1\", \"option2\", \"option3\", \"option4\"],",
            "  \"correctAnswer\": 2,",
            "  \"explanation\": \"Korean rationale\",",
            "  \"sourceLabel\": \"\\ucd9c\\ucc98: ...\"",
            "}"
          ].join("\n");

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.45,
            max_tokens: 520,
            messages: [{ role: "user", content: prompt }]
          });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const options = Array.isArray(payload.options)
            ? payload.options.map((opt) => String(opt || "").trim())
            : [];
          const answer = Number(payload.correctAnswer || payload.answer);
          if (options.length === 4 && Number.isInteger(answer) && answer >= 1 && answer <= 4) {
            results.push({
              id: payload.id || `title_ai_${Date.now()}_${results.length}`,
              type: "title",
              question,
              text: passage,
              options,
              answer: String(answer),
              correctAnswer: String(answer),
              explanation: String(payload.explanation || "").trim(),
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle: "" })
            });
            success = true;
          } else {
            throw new Error("invalid title structure");
          }
        } catch (error) {
          console.warn("[ai-title] generation failed:", error?.message || error);
          if (attempts >= 3) {
            results.push({
              id: `title_fallback_${Date.now()}_${i}`,
              type: "title",
              question,
              text: passage,
              options: shuffleUnique([
                "Benefits of Teamwork",
                "Travel Planning Tips",
                "Caring for the Environment",
                "Digital Communication Tools"
              ], 4),
              answer: "1",
              correctAnswer: "1",
              explanation: "\uc8fc\uc81c\ub97c \ub098\ud0c0\ub0b4\ub294 \ubb38\uc7a5\uc744 \ucc3e\uc73c\uc138\uc694."
            });
            success = true;
          }
        }
      }
    }

    return results;
  }

  async generateTheme(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const openai = this.getOpenAI();
    const question = "\ub2e4\uc74c \uae00\uc758 \uc8fc\uc81c\ub85c \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
    const results = [];

    if (!openai) {
      return passages.slice(0, count).map((passage, index) => ({
        id: `theme_rule_${Date.now()}_${index}`,
        type: "theme",
        question,
        text: passage,
        options: ["\uc0dd\ud65c \uc9c0\ud61c", "\uac74\uac15 \uad8c\uc7a5", "\uacbd\uc81c \ubb38\uc81c", "\uacbd\ud5a5 \uc815\ubcf4"],
        answer: "1",
        correctAnswer: "1",
        explanation: "\uc8fc\uc81c\ub97c \ub098\ud0c0\ub0b4\ub294 \ubb38\uc7a5\uc744 \ucc3e\uc73c\uc138\uc694."
      }));
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

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }]
          });
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
              sourceLabel: ensureSourceLabel(payload.sourceLabel, { docTitle: "" })
            });
            success = true;
          } else {
            throw new Error("invalid theme structure");
          }
        } catch (error) {
          console.warn("[ai-theme] generation failed:", error?.message || error);
          if (attempts >= 3) {
            results.push({
              id: `theme_fallback_${Date.now()}_${i}`,
              type: "theme",
              question,
              text: passage,
              options: ["\uc0dd\ud65c \uc9c0\ud61c", "\uac74\uac15 \uad8c\uc7a5", "\uacbd\uc81c \ubb38\uc81c", "\uacbd\ud5a5 \uc815\ubcf4"],
              answer: "1",
              correctAnswer: "1",
              explanation: "\uc8fc\uc81c\uac00 \uc81c\uc2dc\ud558\ub294 \ub0b4\uc6a9\uc744 \ud655\uc778\ud558\uc138\uc694."
            });
            success = true;
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
    const openai = this.getOpenAI();
    if (!openai) throw new Error("AI generator unavailable for summary problems");
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
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.35,
            max_tokens: 720,
            messages: [{ role: "user", content: prompt }]
          });
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
          if (!problem.sourceLabel) {
            problem.sourceLabel = `\ucd9c\ucc98: ${docTitle}`;
          }
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
    const normalized = {
      type: "grammar",
      question: String(raw.question || "").trim() || BASE_QUESTION,
      passage: String(raw.passage || raw.text || raw.mainText || context.passage || "").trim(),
      mainText: String(raw.passage || raw.text || raw.mainText || context.passage || "").trim(),
      options: normalizeGrammarOptions(raw.options || raw.choices || []),
      explanation: String(raw.explanation || "").trim(),
      sourceLabel: ensureSourceLabel(raw.sourceLabel || raw.source, context)
    };

    const answerKeys = ["correctAnswers", "correctAnswer", "answers", "answer"];
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
    if (!answers.length) return null;

    const validation = validateGrammarProblem(
      {
        ...normalized,
        options: normalized.options,
        correctAnswers: answers
      },
      { minCorrect: 1 }
    );

    if (!validation.valid) {
      console.warn("[ai-grammar] validation issues:", validation.issues);
      return null;
    }

    const answerValue = validation.answers.length === 1
      ? String(validation.answers[0])
      : validation.answers.join(',');

    return {
      id: raw.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: "grammar",
      question: normalized.question,
      mainText: normalized.mainText,
      passage: normalized.mainText,
      options: normalized.options,
      answer: answerValue,
      correctAnswer: answerValue,
      explanation: normalized.explanation,
      sourceLabel: normalized.sourceLabel,
      difficulty: "csat",
      metadata: {
        documentTitle: context.docTitle,
        passageIndex: context.index + 1,
        generator: "openai",
        grammarPoint: raw.grammarPoint || undefined
      }
    };
  }

  async generateGrammar(documentId, count = 5) {
    const { document, passages } = await this.getPassages(documentId);
    const openai = this.getOpenAI();
    if (!openai) throw new Error("AI generator unavailable for grammar problems");
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
          const prompt = buildGrammarPrompt({
            passage,
            docTitle,
            passageIndex: i,
            difficulty: "basic",
            manualExcerpt
          });
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.25,
            max_tokens: 900,
            messages: [{ role: "user", content: prompt }]
          });
          const payload = JSON.parse(stripJsonFences(response.choices?.[0]?.message?.content || ""));
          const problem = this.formatGrammarProblem(payload, {
            docTitle,
            passage,
            index: results.length
          });
          if (!problem) throw new Error("grammar formatting failed");
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

  async fetchCached(documentId, type, limit) {
    return database.all(
      "SELECT * FROM problems WHERE document_id = ? AND type = ? ORDER BY RANDOM() LIMIT ?",
      [documentId, type, parseInt(limit, 10)]
    );
  }

  async saveProblems(documentId, type, problems) {
    for (const item of problems) {
      const options = JSON.stringify(item.options || []);
      const answer = Array.isArray(item.answer)
        ? item.answer.join(',')
        : String(item.correctAnswer ?? item.answer ?? "");
      const explanation = item.explanation || "";
      const difficulty = item.difficulty || "basic";
      const mainText = item.mainText || item.text || null;
      const metadata = item.metadata ? JSON.stringify(item.metadata) : null;
      await database.run(
        "INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, is_ai_generated, main_text, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
        [
          documentId,
          type,
          item.question || "",
          options,
          answer,
          explanation,
          difficulty,
          mainText,
          metadata
        ]
      );
    }
  }
}

module.exports = new AIProblemService();