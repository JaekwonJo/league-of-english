const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'docs', 'problem-templates', 'summary-two-blank.md');
const SUMMARY_QUESTION = "\ub2e4\uc74c \uae00\uc758 \ub0b4\uc6a9\uc744 \ud55c \ubb38\uc7a5\uc73c\ub85c \uc694\uc57d\ud558\uace0\uc790 \ud55c\ub2e4. \ube48\uce78 (A), (B)\uc5d0 \ub4e4\uc5b4\uac08 \ub9d0\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.";
const CIRCLED_DIGITS = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464"];
const EN_DASH = "\u2013";

const { ensureSourceLabel } = require('../services/ai-problem/shared');

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

function buildPrompt({ passage, docTitle, manualExcerpt, variantTag, extraDirectives = [] }) {
  const clippedPassage = clip(passage, 1800);
  const manualBlock = manualExcerpt ? `Summary template (Korean excerpt):\n${manualExcerpt}\n\n` : "";
  const variantLine = variantTag ? `Variant seed: ${variantTag}` : "";
  const directives = Array.isArray(extraDirectives)
    ? extraDirectives.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
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
    "    \"(Correct) phrase_A \\u2013 phrase_B\",",
    "    \"(Distractor) ...\",",
    "    \"(Distractor) ...\",",
    "    \"(Distractor) ...\",",
    "    \"(Distractor) ...\"",
    "  ],",
    "  \"explanation\": \"한국어 해설\",",
    "  \"sourceLabel\": \"\\ucd9c\\ucc98\u2502기관 연도 회차 문항 (pXX)\"",
    "}",
    "Rules:",
    "- SummarySentence must be a single English sentence (18-35 words) ending with a period and containing (A) and (B) exactly once.",
    "- Provide exactly five options.",
    "- IMPORTANT: Option Index 0 MUST be the Correct Answer. The other 4 options MUST be Distractors.",
    "- Each option is an English pair 'phrase_A \\u2013 phrase_B'.",
    "- Each phrase must be a lowercase, 1-4 word verb or noun phrase that reads naturally in the sentence (no leading capital letters or full clauses).",
    "- Avoid reusing the same words that already appear immediately before or after (A) and (B); paraphrase with fresh vocabulary.",
    "- Write the explanation in friendly, plain Korean summarising why (A)-(B) is correct. Use emojis (e.g., 💡, ✨) frequently. 말투는 친절한 존댓말(해요체).",
    "- sourceLabel must start with '출처│'.",
    "- Respond with JSON only (no Markdown fences).",
    directives.length ? "" : null,
    directives.length ? "Adjustments based on previous validation errors:" : null,
    ...directives
  ].filter(Boolean).join('\n');
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

  return flat.slice(0, CIRCLED_DIGITS.length);
}

function formatOptions(rawOptions) {
  const sanitized = [];
  for (let index = 0; index < CIRCLED_DIGITS.length; index += 1) {
    const base = rawOptions[index];
    if (!base) return null;
    let textValue = String(base).trim();

    textValue = textValue.replace(/^[\u2460-\u2468]\s*/, '');
    textValue = textValue.replace(/^([A-E])([.)-])(?=\S)/i, (_, letter) => letter.toUpperCase());
    textValue = textValue.replace(/^[0-9]+[.)]?\s*/, '');
    textValue = textValue.replace(/(\(Correct\)|\(Distractor\))/gi, '').trim(); // Remove hints
    textValue = textValue.replace(/^([A-E])(?:[.)-]\s*|\s+)/i, '');
    textValue = textValue.trim();

    if (!textValue) return null;

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
  // Legacy support
  if (value === null || value === undefined) return null;
  const tokens = Array.isArray(value) ? value : String(value).replace(/[\[\]{}]/g, '').split(/[\s,;]+/);
  for (const token of tokens) {
    if (token === null || token === undefined) continue;
    const num = parseInt(String(token).trim(), 10);
    if (Number.isFinite(num) && num >= 1 && num <= optionCount) return num;
  }
  return null;
}

function buildSourceLabel(rawSource, context) {
  const docTitle = context && context.docTitle ? String(context.docTitle) : '';
  const normalized = ensureSourceLabel(rawSource, { docTitle });
  if (normalized) return normalized;
  return ensureSourceLabel(null, { docTitle });
}

function coerceSummaryProblem(raw, context) {
  if (!raw || typeof raw !== 'object') return null;
  
  // STRICT MODE: Always use original passage from context
  const originalPassage = context.passage ? String(context.passage).trim() : '';
  if (!originalPassage) {
    throw new Error('Summary generation requires original passage context');
  }

  const summarySentence = String(
    raw.summarySentence || raw.summary || raw.summaryText || raw.answerSentence || ""
  ).trim();
  if (!summarySentence || summarySentence.indexOf('(A)') === -1 || summarySentence.indexOf('(B)') === -1) {
    return null;
  }

  const rawOptions = normalizeOptions(raw.options || raw.choices || raw.pairs || []);
  if (!rawOptions || rawOptions.length !== CIRCLED_DIGITS.length) return null;

  // Shuffle Options Logic
  // We assume Index 0 is Correct (from prompt instruction).
  const indices = [0, 1, 2, 3, 4];
  const shuffledIndices = shuffleArray(indices);
  
  const shuffledOptions = shuffledIndices.map(i => rawOptions[i]);
  const correctIndex = shuffledIndices.indexOf(0); // Find where the correct answer (index 0) went
  
  const formattedOptions = formatOptions(shuffledOptions);
  if (!formattedOptions) return null;

  const correct = correctIndex + 1; // 1-based

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
    mainText: originalPassage, // STRICT: Force original passage
    text: originalPassage,     // STRICT: Force original passage
    summarySentence,
    options: formattedOptions,
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
  const tokenize = (text, minLength = 3) =>
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z\s']/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= minLength);
  const simpleStem = (token) => {
    let stem = token;
    if (stem.length > 4 && /(?:ing|ed|es)$/i.test(stem)) {
      stem = stem.replace(/(?:ing|ed|es)$/i, '');
    } else if (stem.length > 3 && /s$/i.test(stem)) {
      stem = stem.slice(0, -1);
    }
    return stem;
  };
  const collectContext = (marker) => {
    const parts = sentence.split(marker);
    if (parts.length !== 2) return { before: [], after: [] };
    const beforeTokens = tokenize(parts[0]).slice(-4);
    const afterTokens = tokenize(parts[1]).slice(0, 4);
    return {
      before: beforeTokens.map(simpleStem),
      after: afterTokens.map(simpleStem)
    };
  };
  const contextA = collectContext('(A)');
  const contextB = collectContext('(B)');
  const contextSetA = new Set([...contextA.before, ...contextA.after]);
  const contextSetB = new Set([...contextB.before, ...contextB.after]);

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
        const leftTokens = tokenize(rawLeft, 4).map(simpleStem);
        const rightTokens = tokenize(rawRight, 4).map(simpleStem);
        const leftOverlap = leftTokens.filter((token) => contextSetA.has(token)).length;
        const rightOverlap = rightTokens.filter((token) => contextSetB.has(token)).length;
        if (leftOverlap >= 2) {
          issues.push(`option_${index + 1}_context_overlap_a`);
        }
        if (rightOverlap >= 2) {
          issues.push(`option_${index + 1}_context_overlap_b`);
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

function deriveSummaryDirectives(lastFailure = '') {
  const message = String(lastFailure || '');
  if (!message) return [];

  const directives = new Set();
  const lower = message.toLowerCase();

  const add = (line) => {
    if (line) directives.add(line);
  };

  if (lower.includes('summary_sentence_blanks')) {
    add('- SummarySentence must include (A) and (B) exactly once and keep the rest of the sentence grammatical.');
  }
  if (lower.includes('summary_sentence_length')) {
    add('- Rewrite the summary sentence to exactly one sentence of 18-32 words; count the words before returning.');
  }
  if (lower.includes('summary_sentence_terminal')) {
    add('- Finish the summary sentence with a single period and avoid extra sentences.');
  }

  const leftMatches = [...message.matchAll(/option_(\d+)_left_wordcount/gi)];
  const rightMatches = [...message.matchAll(/option_(\d+)_right_wordcount/gi)];
  const leftLabels = leftMatches.map((match) => CIRCLED_DIGITS[Number(match[1]) - 1]).filter(Boolean);
  const rightLabels = rightMatches.map((match) => CIRCLED_DIGITS[Number(match[1]) - 1]).filter(Boolean);
  if (leftLabels.length) {
    add(`- Compress the left phrase in option${leftLabels.length > 1 ? 's' : ''} ${leftLabels.join(', ')} to a natural 1-4 word expression.`);
  }
  if (rightLabels.length) {
    add(`- Keep the right phrase in option${rightLabels.length > 1 ? 's' : ''} ${rightLabels.join(', ')} within 1-4 words while preserving meaning.`);
  }

  if (lower.includes('option_count')) {
    add('- Provide exactly five options (①-⑤) in the JSON array.');
  }
  const markerMatches = [...message.matchAll(/option_(\d+)_marker/gi)];
  if (markerMatches.length) {
    add('- Prefix each option with the matching circled digit (①-⑤).');
  }
  if (/option_\d+_dash/i.test(message)) {
    add('- Use an en dash (–) with spaces: "phrase_A – phrase_B" for every option.');
  }
  if (/option_\d+_pair/i.test(message)) {
    add('- Ensure each option contains both phrases around the en dash (no empty side).');
  }
  if (/context_overlap/i.test(message)) {
    add('- Rephrase the option phrases so they do not recycle the same wording that surrounds (A) or (B); introduce fresh vocabulary.');
  }

  if (lower.includes('explanation_missing') || lower.includes('explanation_language')) {
    add('- Provide a Korean explanation (at least two sentences) describing why the correct option fits and why distractors fail.');
  }
  if (lower.includes('explanation_short')) {
    add('- Expand the Korean explanation to at least 70 characters with three sentences.');
  }
  if (lower.includes('explanation_sentences')) {
    add('- Make sure the Korean explanation has at least two full sentences.');
  }

  if (lower.includes('source_missing')) {
    add("- Set sourceLabel to the format '출처│기관 연도 회차 문항 (pXX)'.");
  }

  return Array.from(directives);
}

module.exports = {
  SUMMARY_QUESTION,
  CIRCLED_DIGITS,
  EN_DASH,
  countWords,
  getManualExcerpt,
  buildPrompt,
  coerceSummaryProblem,
  validateSummaryProblem,
  deriveSummaryDirectives
};
