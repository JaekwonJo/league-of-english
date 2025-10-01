const fs = require('fs');
const path = require('path');

const SPEC_PATH = path.join(__dirname, '..', '..', 'docs', 'problem-templates', 'eobeop-grammar.md');
const BASE_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?';
const MULTI_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 옳은 것을 모두 고르시오.';
const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤'];
const GRAMMAR_MIN_EXPLANATION_LENGTH = 120;
const GRAMMAR_MIN_EXPLANATION_SENTENCES = 3;

const GRAMMAR_JSON_BLUEPRINT = `{
  "type": "grammar",
  "questionVariant": "single",
  "question": "${BASE_QUESTION}",
  "passage": "... <u>segment</u> ...",
  "options": [
    {"label": "①", "text": "<u>segment</u>", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"},
    {"label": "②", "text": "<u>segment</u>", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"},
    {"label": "③", "text": "<u>segment</u>", "status": "incorrect", "reason": "한국어 오류 설명", "tag": "주어-동사 수 일치"},
    {"label": "④", "text": "<u>segment</u>", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"},
    {"label": "⑤", "text": "<u>segment</u>", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"}
  ],
  "correctAnswer": 3,
  "explanation": "한국어로 최소 세 문장 정답 근거와 오답 결함 설명",
  "sourceLabel": "출처│기관 시험명 연도 회차 문항 (pXX)",
  "grammarPoint": "subject-verb agreement",
  "trapPattern": "pattern-overgeneralisation",
  "difficulty": "중상",
  "variantTag": "G-103"
}`;

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
  manualExcerpt = '',
  variantTag = '',
  extraDirectives = []
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
  let blueprint = GRAMMAR_JSON_BLUEPRINT
    .replace('"type": "grammar"', `"type": "${type}"`)
    .replace('"questionVariant": "single"', `"questionVariant": "${type === 'grammar_multi' ? 'multi' : 'single'}"`)
    .replace('"question": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"', `"question": "${question}"`)
    .replace('"variantTag": "G-103"', `"variantTag": "${variantTag || 'G-auto'}"`);

  if (type === 'grammar_multi') {
    blueprint = blueprint.replace('"correctAnswer": 3,', '"correctAnswers": [2,4], // 1-based indexes of all correct options');
  } else {
    blueprint = blueprint.replace('"correctAnswer": 3,', '"correctAnswer": 3, // 1-based index of the incorrect option');
  }

  const requirements = [
    '- Keep the original passage intact; underline exactly five distinct segments using <u>...</u>.',
    '- Provide exactly five options labelled with circled digits (①-⑤) and ensure each underlined option segment is an exact character-for-character copy of the corresponding passage text (same spacing, punctuation, and casing).',
    '- Fill the "status" field with "correct" or "incorrect" so that only the erroneous option(s) are marked incorrect.',
    '- Supply a Korean "reason" sentence for every option (정답 포함) explaining why it is correct or incorrect.',
    '- Explanation must be written in Korean with at least three sentences detailing the 핵심 논리, 정답 근거, 그리고 두 개 이상의 오답 결함.',
    '- Source label must start with "출처│" and avoid placeholder text.',
    '- Respond with raw JSON only (no Markdown fences).'
  ];

  if (type === 'grammar_multi') {
    requirements.push('- Ensure the number of incorrect options matches the size of "correctAnswers".');
  } else {
    requirements.push('- Exactly one option must be incorrect (정답).');
  }

  const directivesSection = Array.isArray(extraDirectives) && extraDirectives.length
    ? ['Additional fixes based on the previous attempt:', ...extraDirectives, '']
    : [];

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
    'Return raw JSON only with this structure:',
    blueprint,
    '',
    'Generation requirements:',
    ...requirements,
    '',
    ...directivesSection
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
  validateGrammarProblem,
  GRAMMAR_MIN_EXPLANATION_LENGTH,
  GRAMMAR_MIN_EXPLANATION_SENTENCES
};
