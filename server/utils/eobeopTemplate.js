const fs = require('fs');
const path = require('path');

const SPEC_PATH = path.join(__dirname, '..', '..', 'docs', 'problem-templates', 'eobeop-grammar.md');
const BASE_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?';
const MULTI_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 옳은 것을 모두 고르시오.';
const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤'];

let cachedSpecExcerpt = null;

function clip(text, limit = 1400) {
  if (!text) return '';
  const clean = String(text).trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)}\n…`;
}

function getSpecExcerpt() {
  if (cachedSpecExcerpt !== null) {
    return cachedSpecExcerpt;
  }
  try {
    const raw = fs.readFileSync(SPEC_PATH, 'utf8');
    const excerpt = raw.split(/\r?\n/).slice(0, 120).join('\n');
    cachedSpecExcerpt = clip(excerpt, 1600);
  } catch (err) {
    cachedSpecExcerpt = '';
  }
  return cachedSpecExcerpt;
}

function buildGrammarPrompt({
  passage,
  docTitle,
  passageIndex = 0,
  difficulty = 'basic',
  manualExcerpt = ''
}) {
  const label = (docTitle && String(docTitle).trim()) || `Passage ${passageIndex + 1}`;
  const specSnippet = getSpecExcerpt();
  const question = difficulty === 'advanced' ? MULTI_QUESTION : BASE_QUESTION;
  const type = difficulty === 'advanced' ? 'grammar_multi' : 'grammar';
  const answerField = difficulty === 'advanced'
    ? '"correctAnswers": [2,4], // 1-based indexes of all correct options'
    : '"correctAnswer": 3 // single 1-based index';
  const manualSnippet = clip(manualExcerpt, 900);
  const clippedPassage = clip(passage, 1600);

  return [
    'You are an experienced CSAT (K-SAT) English grammar item writer.',
    'Produce exactly ONE problem that mirrors official Korean 수능/모의고사 formatting.',
    '',
    `Passage title: ${label}`,
    `Passage (retain line breaks):\n${clippedPassage}`,
    '',
    'Template guidance (Korean, authoritative):',
    specSnippet || '(spec unavailable – rely on instructions below)',
    '',
    manualSnippet ? `Handbook excerpt (truncated):\n${manualSnippet}\n` : '',
    'Output requirements:',
    '- Keep the question text exactly as provided.',
    '- Underline five distinct target segments inside the passage using <u> ... </u>.',
    '- Provide five options, each starting with the matching circled digit (①~⑤) and containing the same underlined segment.',
    '- Return additional metadata fields when helpful (grammarPoint, distractors, difficulty, context).',
    '- Do not add commentary or markdown fences – respond with pure JSON only.',
    '',
    'JSON shape:',
    '{',
    `  "type": "${type}",`,
    `  "question": "${question}",`,
    '  "passage": "... <u> ... </u> ...",',
    '  "options": [',
    '    "① <u>~</u>",',
    '    "② <u>~</u>",',
    '    "③ <u>~</u>",',
    '    "④ <u>~</u>",',
    '    "⑤ <u>~</u>"',
    '  ],',
    `  ${answerField},`,
    '  "explanation": "한국어 해설 (grammar point 포함)",',
    '  "sourceLabel": "출처│기관 시험명 연도 회차 문항 (pXX)",',
    '  "grammarPoint": "예: 가정법",',
    '  "context": ["필요 시 추가 문장"]',
    '}',
    '',
    'Return valid JSON only.'
  ].filter(Boolean).join('\n');
}

function hasHangul(text) {
  return /[가-힣]/.test(text || '');
}

function countUnderlines(text) {
  return (String(text || '').match(/<u[\s\S]*?<\/u>/g) || []).length;
}

function validateGrammarProblem(problem = {}, { minCorrect = 1 } = {}) {
  const issues = [];
  const type = problem.type;
  const expectedQuestion = type === 'grammar_multi' ? MULTI_QUESTION : BASE_QUESTION;

  if (!['grammar', 'grammar_multi'].includes(type)) {
    issues.push('type_invalid');
  }

  if (String(problem.question || '').trim() !== expectedQuestion) {
    issues.push('question_mismatch');
  }

  const options = Array.isArray(problem.options) ? problem.options : [];
  if (options.length !== 5) {
    issues.push('option_count');
  }

  options.forEach((option, index) => {
    const text = String(option || '').trim();
    const marker = CIRCLED_DIGITS[index];
    if (!text.startsWith(marker)) {
      issues.push(`option_${index + 1}_marker`);
    }
    if (!/<u[\s\S]*?<\/u>/.test(text)) {
      issues.push(`option_${index + 1}_underline_missing`);
    }
  });

  const underlineCount = countUnderlines(problem.passage || problem.mainText);
  if (underlineCount !== 5) {
    issues.push('passage_underline_count');
  }

  const answers = Array.isArray(problem.answers)
    ? problem.answers
    : Array.isArray(problem.correctAnswers)
    ? problem.correctAnswers
    : problem.correctAnswer !== undefined
    ? [problem.correctAnswer]
    : Array.isArray(problem.answer)
    ? problem.answer
    : typeof problem.answer === 'number' || typeof problem.answer === 'string'
    ? String(problem.answer)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((token) => parseInt(token, 10))
        .filter((num) => !Number.isNaN(num))
    : [];

  const normalizedAnswers = [...new Set(answers.map((num) => parseInt(num, 10)).filter((num) => num >= 1 && num <= 5))];

  if (normalizedAnswers.length < minCorrect) {
    issues.push('answer_missing');
  }

  if (type === 'grammar' && normalizedAnswers.length !== 1) {
    issues.push('answer_single_expected');
  }

  if (type === 'grammar_multi' && normalizedAnswers.length < 2) {
    issues.push('answer_multi_expected');
  }

  if (!hasHangul(problem.explanation)) {
    issues.push('explanation_language');
  }

  const sourceLabel = String(problem.sourceLabel || problem.source || '').trim();
  if (!sourceLabel.startsWith('출처│')) {
    issues.push('source_missing');
  }

  return {
    valid: issues.length === 0,
    issues,
    answers: normalizedAnswers
  };
}

module.exports = {
  BASE_QUESTION,
  MULTI_QUESTION,
  CIRCLED_DIGITS,
  buildGrammarPrompt,
  validateGrammarProblem
};
