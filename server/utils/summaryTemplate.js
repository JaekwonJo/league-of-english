const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'docs', 'problem-templates', 'summary-two-blank.md');
const SUMMARY_QUESTION = "\ub2e4\uc74c \uae00\uc758 \ub0b4\uc6a9\uc744 \ud55c \ubb38\uc7a5\uc73c\ub85c \uc694\uc57d\ud558\uace0\uc790 \ud55c\ub2e4. \ube48\uce78 (A), (B)\uc5d0 \ub4e4\uc5b4\uac08 \ub9d0\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
const CIRCLED_DIGITS = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464"];
const EN_DASH = "\u2013";

let cachedTemplate = null;

function countWords(text = "") {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function countSentencesLocal(text = '') {
  return (String(text || '').match(/[.!?](?=\s|$)/g) || []).length;
}

function clip(text, limit = 1800) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)} \u2026`;
}

function getManualExcerpt(limit = 3600) {
  if (cachedTemplate === null) {
    try {
      cachedTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    } catch (error) {
      console.warn('[summaryTemplate] failed to load template manual:', error?.message || error);
      cachedTemplate = "";
    }
  }
  if (!cachedTemplate) return "";
  return cachedTemplate.slice(0, limit);
}

function buildPrompt({ passage, docTitle, manualExcerpt, variantTag }) {
  const clippedPassage = clip(passage, 1800);
  const manualBlock = manualExcerpt ? `Summary template (Korean excerpt):\n${manualExcerpt}\n\n` : "";
  const variantLine = variantTag ? `Variant seed: ${variantTag}` : "";
  return [
    "You are an expert CSAT English item writer. Produce exactly ONE summary question with two blanks (A) and (B).",
    manualBlock,
    variantLine,
    `Passage title: ${docTitle}`,
    `Passage (preserve line breaks):\n${clippedPassage}`,
    "",
    "Return raw JSON only with this schema:",
    "{",
    `  \"type\": \"summary\",`,
    `  \"question\": \"${SUMMARY_QUESTION}\",`,
    "  \"summarySentence\": \"... (A) ... (B) ....\",",
    "  \"options\": [",
    "    \"\\u2460 phrase_A \\u2013 phrase_B\",",
    "    \"\\u2461 ...\",",
    "    \"\\u2462 ...\",",
    "    \"\\u2463 ...\",",
    "    \"\\u2464 ...\"",
    "  ],",
    "  \"correctAnswer\": 3,",
    "  \"explanation\": \"한국어 해설\",",
    "  \"sourceLabel\": \"\\ucd9c\\ucc98\u2502기관 연도 회차 문항 (pXX)\"",
    "}",
    "Rules:",
    "- SummarySentence must be a single English sentence (18-35 words) ending with a period and containing (A) and (B) exactly once.",
    "- Provide five options labelled with circled digits (\\u2460-\\u2464). Each option is an English pair 'phrase_A \\u2013 phrase_B'.",
    "- Each phrase must be 1-4 words, grammatically valid, and collocationally natural with its partner.",
    "- Exactly one option must satisfy the passage's logic and polarity; the other four must contain distinct defects (narrow, broad, detail, counter-claim, metaphor-literal, role-swap, collocation break, definition).",
    "- Write the explanation in Korean summarising the reason (A)-(B) is correct and naming the main defect of at least one distractor.",
    "- sourceLabel must start with '출처│'.",
    "- Respond with JSON only (no Markdown fences)."
  ].filter(Boolean).join('\n');
}

function normalizeOptions(options) {
  const flat = [];
  const push = (value) => {
    if (value === null || value === undefined) return;
    const str = String(value).trim();
    if (str) flat.push(str);
  };

  if (!Array.isArray(options)) {
    push(options);
  } else {
    options.forEach((item) => {
      if (item === null || item === undefined) return;
      if (Array.isArray(item)) {
        item.forEach((entry) => push(entry));
        return;
      }
      if (typeof item === 'object') {
        const left = item.left || item.first || item.a || item.A;
        const right = item.right || item.second || item.b || item.B;
        if (left && right) {
          push(`${String(left).trim()} ${EN_DASH} ${String(right).trim()}`);
          return;
        }
        if (typeof item.text === 'string' || typeof item.value === 'string') {
          push(item.text || item.value);
          return;
        }
        if (Array.isArray(item.options)) {
          item.options.forEach((entry) => push(entry));
          return;
        }
      }
      push(item);
    });
  }

  if (flat.length < CIRCLED_DIGITS.length) return null;

  const sanitized = [];
  for (let index = 0; index < CIRCLED_DIGITS.length; index += 1) {
    const base = flat[index];
    if (!base) return null;
    let textValue = String(base).trim();

    textValue = textValue.replace(/^[\u2460-\u2468]\s*/, '');
    textValue = textValue.replace(/^([A-E])([.)-])(?=\S)/i, (_, letter) => letter.toUpperCase());
    textValue = textValue.replace(/^[0-9]+[.)]?\s*/, '');
    textValue = textValue.replace(/^([A-E])(?:[.)-]\s*|\s+)/i, '');
    textValue = textValue.trim();

    if (!textValue) return null;

    if (/^[a-z]/.test(textValue)) {
      textValue = textValue.charAt(0).toUpperCase() + textValue.slice(1);
    }

    textValue = textValue.replace(/\s{2,}/g, ' ');

    if (/[-\u2013\u2014]/.test(textValue)) {
      textValue = textValue.replace(/\s*[-\u2013\u2014]\s*/, ` ${EN_DASH} `);
    } else {
      const parts = textValue
        .split(/[-\u2013\u2014]/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length < 2) return null;
      textValue = `${parts[0]} ${EN_DASH} ${parts[1]}`;
    }

    sanitized.push(`${CIRCLED_DIGITS[index]} ${textValue}`);
  }

  return sanitized;
}

function parseAnswer(value, optionCount) {
  if (value === null || value === undefined) return null;
  const tokens = Array.isArray(value)
    ? value
    : String(value)
        .replace(/[\[\]{}]/g, '')
        .split(/[\s,;]+/);

  for (const token of tokens) {
    if (token === null || token === undefined) continue;
    const num = parseInt(String(token).trim(), 10);
    if (Number.isFinite(num) && num >= 1 && num <= optionCount) {
      return num;
    }
  }
  return null;
}

function buildSourceLabel(rawSource, context) {
  const cleaned = String(rawSource || "").trim();
  if (cleaned.startsWith("\ucd9c\ucc98:")) return cleaned;
  const docTitle = String(context.docTitle || "").trim();
  const defaultLabel = docTitle ? `\ucd9c\ucc98: ${docTitle}` : "\ucd9c\ucc98: LoE Source";
  return cleaned ? `\ucd9c\ucc98: ${cleaned}` : defaultLabel;
}

function coerceSummaryProblem(raw, context) {
  if (!raw || typeof raw !== 'object') return null;
  const summarySentence = String(
    raw.summarySentence || raw.summary || raw.summaryText || raw.answerSentence || ""
  ).trim();
  if (!summarySentence || summarySentence.indexOf('(A)') === -1 || summarySentence.indexOf('(B)') === -1) {
    return null;
  }

  const options = normalizeOptions(raw.options || raw.choices || raw.pairs || []);
  if (!options || options.length !== CIRCLED_DIGITS.length) return null;

  const correct = parseAnswer(
    raw.correctAnswer ?? raw.answer ?? raw.correctAnswers ?? raw.answers,
    options.length
  );
  if (!correct) return null;

  const explanation = String(raw.explanation || raw.rationale || "").trim();
  if (!explanation) return null;

  const sourceLabel = buildSourceLabel(raw.sourceLabel || raw.source, context);
  const metadata = {
    passageIndex: context.index + 1,
    documentTitle: context.docTitle
  };

  if (raw.summaryPattern) {
    const pattern = String(raw.summaryPattern).trim();
    if (pattern) metadata.summaryPattern = pattern;
  }
  if (Array.isArray(raw.keywords)) {
    const keywords = raw.keywords
      .map((kw) => String(kw).trim())
      .filter((kw) => kw.length > 0);
    if (keywords.length) metadata.keywords = keywords;
  }

  const reportedDifficulty = String(raw.difficulty || '').trim().toLowerCase();
  if (reportedDifficulty && reportedDifficulty !== 'advanced') {
    metadata.reportedDifficulty = reportedDifficulty;
  }
  metadata.difficulty = 'advanced';

  const problem = {
    id: raw.id || `summary_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'summary',
    question: SUMMARY_QUESTION,
    mainText: String(raw.passage || context.passage || '').trim(),
    summarySentence,
    options,
    answer: String(correct),
    correctAnswer: String(correct),
    explanation,
    sourceLabel,
    difficulty: 'advanced',
    metadata
  };

  if (raw.summarySentenceKor) {
    const korean = String(raw.summarySentenceKor).trim();
    if (korean) problem.summarySentenceKor = korean;
  }

  return problem;
}

function validateSummaryProblem(problem) {
  const issues = [];
  if (!problem || typeof problem !== 'object') {
    return { valid: false, issues: ['invalid_object'] };
  }

  if (problem.type !== 'summary') issues.push('type_invalid');
  if (String(problem.question || "").trim() !== SUMMARY_QUESTION) issues.push('question_mismatch');

  const sentence = String(problem.summarySentence || "").trim();
  if (!sentence || sentence.indexOf('(A)') === -1 || sentence.indexOf('(B)') === -1) {
    issues.push('summary_sentence_blanks');
  }
  const summaryWordCount = countWords(sentence.replace(/[().]/g, ' '));
  if (summaryWordCount < 18 || summaryWordCount > 35) {
    issues.push('summary_sentence_length');
  }
  if (!/[.]\s*$/.test(sentence)) {
    issues.push('summary_sentence_terminal');
  }

  const options = Array.isArray(problem.options) ? problem.options : [];
  if (options.length !== CIRCLED_DIGITS.length) {
    issues.push('option_count');
  } else {
    options.forEach((option, index) => {
      const text = String(option || "");
      if (!text.startsWith(CIRCLED_DIGITS[index])) {
        issues.push(`option_${index + 1}_marker`);
      }
      if (text.indexOf(EN_DASH) === -1) {
        issues.push(`option_${index + 1}_dash`);
      }
      const pair = text
        .slice(CIRCLED_DIGITS[index].length)
        .trim();
      const [rawLeft, rawRight] = pair.split(EN_DASH).map((part) => (part ? part.trim() : ''));
      if (!rawLeft || !rawRight) {
        issues.push(`option_${index + 1}_pair`);
      } else {
        const leftWords = countWords(rawLeft);
        const rightWords = countWords(rawRight);
        if (leftWords === 0 || leftWords > 4) {
          issues.push(`option_${index + 1}_left_wordcount`);
        }
        if (rightWords === 0 || rightWords > 4) {
          issues.push(`option_${index + 1}_right_wordcount`);
        }
      }
    });
  }

  if (!problem.answer) issues.push('answer_missing');
  if (!problem.explanation) {
    issues.push('explanation_missing');
  } else if (!/[가-힣]/.test(problem.explanation)) {
    issues.push('explanation_language');
  } else {
    if (problem.explanation.trim().length < 70) {
      issues.push('explanation_short');
    }
    if (countSentencesLocal(problem.explanation) < 2) {
      issues.push('explanation_sentences');
    }
  }

  const source = String(problem.sourceLabel || "").trim();
  if (!source.startsWith("\ucd9c\ucc98\u2502")) issues.push('source_missing');

  return { valid: issues.length === 0, issues };
}

module.exports = {
  SUMMARY_QUESTION,
  CIRCLED_DIGITS,
  EN_DASH,
  countWords,
  getManualExcerpt,
  buildPrompt,
  coerceSummaryProblem,
  validateSummaryProblem
};
