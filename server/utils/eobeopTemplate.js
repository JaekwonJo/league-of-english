const fs = require('fs');
const path = require('path');

const SPEC_PATH = path.join(__dirname, '..', '..', 'docs', 'problem-templates', 'eobeop-grammar.md');
const BASE_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?';
const MULTI_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 옳은 것을 모두 고르시오.';
const MULTI_INCORRECT_QUESTION = '다음 글의 밑줄 친 부분 중, 어법상 틀린 것을 모두 고르시오.';
const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤'];
const GRAMMAR_MIN_EXPLANATION_LENGTH = 120;
const GRAMMAR_MIN_EXPLANATION_SENTENCES = 3;

const GRAMMAR_JSON_BLUEPRINT = `{
  "type": "grammar",
  "questionVariant": "single",
  "question": "${BASE_QUESTION}",
  "passage": "... *segment* ...",
  "options": [
    {"label": "①", "text": "*segment*", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"},
    {"label": "②", "text": "*segment*", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"},
    {"label": "③", "text": "*segment*", "status": "incorrect", "reason": "한국어 오류 설명", "tag": "주어-동사 수 일치"},
    {"label": "④", "text": "*segment*", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"},
    {"label": "⑤", "text": "*segment*", "status": "correct", "reason": "한국어 근거", "tag": "정상 용법"}
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
  manualExcerpt = '',
  variantTag = '',
  desiredAnswerIndex = null,
  extraDirectives = [],
  questionText = BASE_QUESTION,
  answerMode = 'incorrect',
  targetIncorrectCount = 1,
  targetCorrectCount = 1
}) {
  const label = (docTitle && String(docTitle).trim()) || `Passage ${passageIndex + 1}`;
  const specSnippet = getSpecExcerpt();
  const totalSegments = CIRCLED_DIGITS.length;
  const manualSnippet = manualExcerpt || '';
  const clippedPassage = clip(passage, 1600);
  const question = questionText || (answerMode === 'correct' ? MULTI_QUESTION : (targetIncorrectCount === 1 ? BASE_QUESTION : MULTI_INCORRECT_QUESTION));
  const type = (answerMode === 'incorrect' && targetIncorrectCount === 1) ? 'grammar' : 'grammar_multi';

  let blueprint = GRAMMAR_JSON_BLUEPRINT
    .replace('"type": "grammar"', `"type": "${type}"`)
    .replace('"questionVariant": "single"', `"questionVariant": "${type === 'grammar_multi' ? 'multi' : 'single'}"`)
    .replace('"question": "${BASE_QUESTION}"', `"question": "${question}"`)
    .replace('"variantTag": "G-103"', `"variantTag": "${variantTag || 'G-auto'}"`);

  blueprint = blueprint.replace('"correctAnswer": 3,', '"correctAnswer": 3, // 1-based index of the answer(s)');

  const desiredIndex = Number.isInteger(desiredAnswerIndex)
    ? Math.min(Math.max(desiredAnswerIndex, 1), totalSegments)
    : null;
  const desiredMarker = desiredIndex ? CIRCLED_DIGITS[desiredIndex - 1] : null;

  const incorrectCount = answerMode === 'correct'
    ? Math.max(0, totalSegments - targetCorrectCount)
    : targetIncorrectCount;
  const correctCount = answerMode === 'correct'
    ? targetCorrectCount
    : Math.max(0, totalSegments - targetIncorrectCount);

  const editInstruction = (() => {
    if (answerMode === 'correct') {
      if (correctCount === 1) {
        return '- 네 개의 밑줄은 문법 오류가 드러나도록 변형하고, 단 하나의 밑줄만 원문과 완전히 동일하게 유지해 주세요.';
      }
      return `- ${totalSegments - correctCount}개의 밑줄에 문법 오류를 만들고, ${correctCount}개의 밑줄은 원문과 완전히 동일하게 유지해 주세요.`;
    }
    if (incorrectCount === 1) {
      return '- 한 개의 밑줄에만 고급 문법 오류를 삽입하고, 나머지 네 개 밑줄은 원문과 1글자도 다르게 만들지 마세요.';
    }
    return `- ${incorrectCount}개의 밑줄에 문법 오류를 만들고, 나머지 ${totalSegments - incorrectCount}개의 밑줄은 원문과 완전히 동일하게 유지해 주세요.`;
  })();

  const answerInstruction = (() => {
    if (answerMode === 'correct') {
      if (correctCount === 1) {
        return '- 정답 배열(correctAnswers)에 유일한 올바른 밑줄 번호만 포함시키고, 해당 보기의 status는 "correct"로, 나머지는 모두 "incorrect"로 표시하세요.';
      }
      return '- 올바른 밑줄 번호를 모두 correctAnswers 배열에 포함시키고, 해당 보기들의 status를 "correct"로 유지하세요.';
    }
    if (incorrectCount === 1) {
      return '- 정답 필드(correctAnswer 또는 correctAnswers)에는 유일한 오류 밑줄 번호만 넣고, 그 보기의 status를 "incorrect"로, 나머지는 "correct"로 유지하세요.';
    }
    return '- 오류 밑줄 번호를 모두 correctAnswers 배열에 포함시키고, 해당 보기들의 status를 "incorrect"로 유지하세요.';
  })();

  const requirements = [
    '- Copy the passage and underline exactly five distinct segments by wrapping them with * (예: *동사구*).',
    '- Grammar errors must mirror 실제 수능/모의고사 난이도로, 맥락상 자연스러운 고급 오류만 만들고 "you is" 같은 초급 표현은 금지합니다.',
    editInstruction,
    '- Provide exactly five options labelled with circled digits (①-⑤) and ensure 각 보기의 밑줄 구간이 지문과 문자 하나까지 완전히 일치하도록 하세요.',
    '- Fill the "status" field with "correct" or "incorrect" so that 각 보기의 상태가 정답 요구와 정확히 일치하도록 하세요.',
    '- 각 reason 문장은 보기의 상태에 맞는 필수 키워드를 포함해야 합니다. 오류 보기에는 반드시 "오류", "틀림", "잘못" 등 부정 표현을 넣고, 정상 보기에는 "정상", "맞다", "문법적" 등 긍정 표현을 포함하며, 관련 문법 규칙명을 명시하세요.',
    '- Supply a Korean "reason" sentence for every option (정답 포함) explaining 왜 문법적으로 맞거나 틀렸는지, 반드시 관련 문법 규칙 이름(예: 가정법, 수일치)을 언급하세요.',
    '- Explanation must be written in Korean with at least three sentences detailing the 글의 핵심, 정답 근거, 그리고 두 개 이상 오답의 결함.',
    '- Source label must start with "출처│" and avoid placeholder text.',
    '- Respond with raw JSON only (no Markdown fences).',
    answerInstruction
  ];

  if (desiredMarker) {
    requirements.push(`- Make option ${desiredMarker} the designated 답안으로 유지하고, 다른 밑줄 변형은 이 지시에 어긋나지 않도록 관리하세요.`);
  }

  const directivesSection = Array.isArray(extraDirectives) && extraDirectives.length
    ? ['Additional fixes based on the previous attempt:', ...extraDirectives, '']
    : [];

  return [
    'You are an experienced CSAT (K-SAT) English grammar item writer.',
    'Produce exactly ONE problem that mirrors official Korean 수능/모의고사 formatting.',
    '',
    `Passage title: ${label}`,
    `Passage (retain line breaks):
${clippedPassage}`,
    '',
    'Template guidance (Korean, authoritative):',
    specSnippet || '(spec unavailable – rely on instructions below)',
    '',
    manualSnippet ? `Handbook (full text):
${manualSnippet}
` : '',
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
  MULTI_INCORRECT_QUESTION,
  CIRCLED_DIGITS,
  buildGrammarPrompt,
  validateGrammarProblem,
  GRAMMAR_MIN_EXPLANATION_LENGTH,
  GRAMMAR_MIN_EXPLANATION_SENTENCES
};
