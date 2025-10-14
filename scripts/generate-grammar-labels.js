#!/usr/bin/env node
/**
 * Build grammar label dataset from existing Wolgo fallback sets.
 *
 * Output: server/utils/data/grammar-labels.jsonl
 */
const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
  'wolgo-2022-09-grammar.json',
  'wolgo-2022-09-grammar-set2.json',
  'wolgo-2024-03-grammar.json'
];

const DATA_DIR = path.join(__dirname, '..', 'server', 'utils', 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'grammar-labels.jsonl');

function loadProblems() {
  const problems = [];
  for (const filename of SOURCE_FILES) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      problems.push(...parsed);
    } catch (err) {
      console.warn(`[warn] Failed to parse ${filename}: ${err.message}`);
    }
  }
  return problems;
}

function stripTags(text) {
  return text.replace(/<\/?u>/gi, '').replace(/\s+/g, ' ').trim();
}

function extractUnderline(optionText) {
  const match = optionText.match(/<u>([\s\S]*?)<\/u>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : stripTags(optionText);
}

function pickSentence(passage, targetSpan) {
  const cleaned = passage.replace(/\s+/g, ' ').replace(/<\/?u>/gi, '').trim();
  const sentences = cleaned.split(/(?<=[.!?])/g).map((s) => s.trim()).filter(Boolean);
  const target = targetSpan.replace(/\s+/g, ' ').trim();
  const found = sentences.find((s) => s.includes(target));
  return (found || cleaned).trim();
}

const ERROR_RULES = [
  { type: 'subject-verb-agreement', keywords: ['수 일치', '수일치', '단수 주어', '복수 주어'] },
  { type: 'verb-tense', keywords: ['시제', '과거', '현재완료', '미래', '시제 일치'] },
  { type: 'gerund-participle', keywords: ['동명사', '분사', '분사구문', '현재분사', '과거분사'] },
  { type: 'to-infinitive', keywords: ['to부정사', 'to 부정사', 'to-v', 'be about to'] },
  { type: 'infinitive-gerund-choice', keywords: ['동명사/부정사', '동명사 대신', '부정사 대신'] },
  { type: 'relative-pronoun', keywords: ['관계대명사', '선행사', '관계절'] },
  { type: 'relative-adverb', keywords: ['관계부사'] },
  { type: 'conditional', keywords: ['가정법'] },
  { type: 'comparison', keywords: ['비교급', '최상급', 'than', 'as ~ as'] },
  { type: 'parallel-structure', keywords: ['병렬', '평행 구조', 'parallel', 'both A and B', 'either A or B'] },
  { type: 'pronoun', keywords: ['대명사', '재귀대명사', '인칭 대명사'] },
  { type: 'preposition', keywords: ['전치사'] },
  { type: 'conjunction', keywords: ['접속사'] },
  { type: 'article', keywords: ['관사'] },
  { type: 'imperative-verb-form', keywords: ['명령문', '명령형', '부탁하는 문장'] },
  { type: 'voice', keywords: ['수동태', '능동태'] },
  { type: 'word-choice', keywords: ['어휘', '단어 선택', '적절한 표현', '명사구', '표현'] }
];

function detectErrorType(explanation) {
  const text = explanation || '';
  for (const rule of ERROR_RULES) {
    if (rule.keywords.some((word) => text.includes(word))) {
      return rule.type;
    }
  }
  return 'unknown';
}

function extractSuggestedFix(explanation) {
  if (!explanation) return '';
  const quoted = explanation.match(/['‘“]([^'’”]+)['’”]\s*로\s*(?:고쳐|바꿔)/i);
  if (quoted) return quoted[1].trim();
  const simple = explanation.match(/([\w-]+)\s*로\s*(?:고쳐|바꿔)/i);
  if (simple) return simple[1].trim();
  return '';
}

function hasOptionMarkers(explanation) {
  return /①|②|③|④|⑤/.test(explanation || '');
}

function buildLabel(problem) {
  if (!Array.isArray(problem.answers) || !problem.answers.length) {
    return null;
  }
  const answerIndex = problem.answers[0] - 1;
  if (!Array.isArray(problem.options) || !problem.options[answerIndex]) {
    return null;
  }
  const targetSpan = extractUnderline(problem.options[answerIndex]);
  const sentence = pickSentence(problem.mainText || '', targetSpan);
  const explanation = (problem.explanation || '').replace(/\s+/g, ' ').trim();
  if (hasOptionMarkers(explanation)) {
    return null;
  }
  return {
    sourceId: problem.id || '',
    documentTitle: problem.sourceLabel || '',
    originalSentence: sentence,
    targetSpan,
    errorType: detectErrorType(explanation),
    errorComment: explanation,
    suggestedFix: extractSuggestedFix(explanation)
  };
}

function main() {
  const problems = loadProblems();
  const labels = problems
    .map(buildLabel)
    .filter(Boolean);

  if (!labels.length) {
    console.error('[error] No labels generated.');
    process.exit(1);
  }

  const lines = labels.map((item) => JSON.stringify(item));
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');
  console.log(`[ok] Wrote ${labels.length} labels to ${OUTPUT_PATH}`);
}

main();
