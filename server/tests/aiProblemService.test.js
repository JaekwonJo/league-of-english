const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '..', '..', 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const dbFile = `ai-service-test-${Date.now()}.sqlite`;
process.env.DB_PATH = path.join('tmp', dbFile);

const database = require('../models/database');
const aiService = require('../services/aiProblemService');
const { coerceSummaryProblem } = require('../utils/summaryTemplate');
const { BASE_QUESTION, CIRCLED_DIGITS } = require('../utils/eobeopTemplate');

let userId;
let documentId;

const SUMMARY_OPTIONS = [
  '\u2460 adjust \u2013 baseline',
  '\u2461 sustain \u2013 routine',
  '\u2462 restore \u2013 balance',
  '\u2463 elevate \u2013 performance',
  '\u2464 reduce \u2013 variance'
];

const GRAMMAR_PASSAGE = [
  'Despite the forecast, the event continued with <u>Despite of</u> courage.',
  'He relaxed only after <u>Having finished</u> the assignment.',
  'The bell rang just as <u>Scarcely had</u> the class begun.',
  'The plan proceeds only if <u>Provided that</u> the data remain stable.',
  'The manager insisted that <u>The manager demanded</u> the report be submitted today.'
].join(' ');

const GRAMMAR_PASSAGE_MISSING = [
  'Despite the forecast, the event continued with <u>Despite of</u> courage.',
  'He relaxed only after Having finished the assignment.',
  'The bell rang just as Scarcely had the class begun.',
  'The plan proceeds only if Provided that the data remain stable.',
  'The manager insisted that The manager demanded the report be submitted today.'
].join(' ');

const GRAMMAR_PASSAGE_VARIANT = [
  'The mentor advised that the plan should remain flexible.',
  'However, she noted that execution must stay precise.',
  'Finally, the team agreed that documentation would be thorough.',
  'During reviews, observers confirmed the method was sound.',
  'Consequently, leadership concluded the rollout could proceed.'
].join(' ');

const GRAMMAR_OPTIONS = [
  `${CIRCLED_DIGITS[0]} <u>Despite of</u>`,
  `${CIRCLED_DIGITS[1]} <u>Having finished</u>`,
  `${CIRCLED_DIGITS[2]} <u>Scarcely had</u>`,
  `${CIRCLED_DIGITS[3]} <u>Provided that</u>`,
  `${CIRCLED_DIGITS[4]} <u>The manager demanded</u>`
];

const GRAMMAR_OPTIONS_VARIANT = [
  `${CIRCLED_DIGITS[0]} <u>The mentor advised</u>`,
  `${CIRCLED_DIGITS[1]} <u>She Noted</u>`,
  `${CIRCLED_DIGITS[2]} <u>documentation would be thorough</u>`,
  `${CIRCLED_DIGITS[3]} <u>observers confirmed the method</u>`,
  `${CIRCLED_DIGITS[4]} <u>Leadership concluded the rollout could proceed.</u>`
];

const SOURCE_PREFIX = '\ucd9c\ucc98';

test.before(async () => {
  await database.connect();

  const userResult = await database.run(
    'INSERT INTO users (username, password_hash, email, name, school, grade) VALUES (?, ?, ?, ?, ?, ?)',
    ['test_student', 'hash', 'student@example.com', 'Test Student', 'Test High', 1]
  );
  userId = userResult.id;

  const content = JSON.stringify({ passages: ['The quick brown fox jumps over the lazy dog.'] });
  const documentResult = await database.run(
    'INSERT INTO documents (title, content, type, created_by) VALUES (?, ?, ?, ?)',
    ['Mock Document', content, 'pdf', userId]
  );
  documentId = documentResult.id;
});

test.beforeEach(async () => {
  await database.run('DELETE FROM problem_exposures');
  await database.run('DELETE FROM problems');
});

test.after(async () => {
  await database.close();
  const absolutePath = path.join(__dirname, '..', '..', process.env.DB_PATH);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
});

test('saveProblems caches fully-labelled options and fetchCached honours exposures', async () => {
  const saved = await aiService.saveProblems(
    documentId,
    'summary',
    [
      {
        question: 'Choose the option that best completes (A) and (B).',
        summarySentence: '(A) adjustments lead to improvements, and (B) consistency safeguards progress.',
        options: SUMMARY_OPTIONS,
        correctAnswer: 1,
        explanation: 'Consistent adjustments protect long-term stability.',
        sourceLabel: `${SOURCE_PREFIX}: simulation`,
        mainText: 'Sample passage for summary question.'
      }
    ],
    { docTitle: 'Mock Document' }
  );

  assert.equal(saved.length, 1);
  assert.ok(saved[0].options[0].startsWith('\u2460'));

  const fetched = await aiService.fetchCached(documentId, 'summary', 1, { userId });
  assert.equal(fetched.length, 1);
  assert.ok(fetched[0].options[0].startsWith('\u2460'));

  const numericId = Number(fetched[0].id);
  assert.ok(Number.isInteger(numericId));

  await aiService.markExposures(userId, [numericId]);
  const afterExposure = await aiService.fetchCached(documentId, 'summary', 1, { userId });
  assert.equal(afterExposure.length, 0);
});

test('coerceSummaryProblem keeps circled digits and leading characters', () => {
  const raw = {
    summarySentence: '(A) innovations (B) resilience',
    options: SUMMARY_OPTIONS,
    correctAnswer: 2,
    explanation: 'Reasoning explained for learners.',
    sourceLabel: `${SOURCE_PREFIX}: Mock Source`,
    passage: 'Innovation builds resilience across systems.'
  };

  const problem = coerceSummaryProblem(raw, {
    index: 0,
    docTitle: 'Mock Document',
    passage: 'Innovation builds resilience across systems.'
  });

  assert.ok(problem);
  assert.equal(problem.answer, '2');
  assert.ok(problem.options.every((option, index) => option.startsWith(CIRCLED_DIGITS[index])));
});

test('formatGrammarProblem preserves circled digits and source label', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE,
      options: GRAMMAR_OPTIONS,
      correctAnswer: 2,
      explanation: '\uc815\ub2f5\uc740 \ubb38\ubc95\uc0c1 \uc62c\uc2b5\ub2c8\ub2e4.',
      sourceLabel: `${SOURCE_PREFIX}: Mock Grammar`,
      grammarPoint: 'subject-verb agreement'
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE,
      index: 0
    }
  );

  assert.ok(formatted);
  assert.ok(formatted.options.every((option, index) => option.startsWith(CIRCLED_DIGITS[index])));
  assert.ok(formatted.sourceLabel.startsWith(SOURCE_PREFIX));
});
test('formatGrammarProblem retains leading letters within underlined choices', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE,
      options: [
        'A. <u>Adjust</u> baseline',
        'B) <u>Extending</u> opportunities',
        '(C) <u>Maintain</u> routines',
        'D: <u>Restore</u> balance',
        'E <u>Elevate</u> performance'
      ],
      correctAnswer: 1,
      explanation: '보기의 밑줄 단어 첫 글자를 그대로 보여 줍니다.',
      sourceLabel: `${SOURCE_PREFIX}: Enumerated Grammar`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE,
      index: 0
    }
  );

  assert.ok(formatted);
  assert.equal(formatted.options[0], `${CIRCLED_DIGITS[0]} <u>Adjust</u> baseline`);
  assert.equal(formatted.options[1], `${CIRCLED_DIGITS[1]} <u>Extending</u> opportunities`);
  assert.equal(formatted.options[2], `${CIRCLED_DIGITS[2]} <u>Maintain</u> routines`);
  assert.equal(formatted.options[3], `${CIRCLED_DIGITS[3]} <u>Restore</u> balance`);
  assert.equal(formatted.options[4], `${CIRCLED_DIGITS[4]} <u>Elevate</u> performance`);
});

test('formatGrammarProblem rebuilds missing underlines using options', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE_MISSING,
      options: GRAMMAR_OPTIONS,
      correctAnswer: 2,
      explanation: '누락된 밑줄을 자동으로 복원합니다.',
      sourceLabel: `${SOURCE_PREFIX}: Missing Underlines`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_MISSING,
      index: 0
    }
  );

  assert.ok(formatted);
  const underlineMatches = formatted.mainText.match(/<u[\s\S]*?<\/u>/g) || [];
  assert.equal(underlineMatches.length, 5);
  assert.ok(formatted.options.every((option, index) => option.startsWith(CIRCLED_DIGITS[index])));
});

test('formatGrammarProblem rebuild handles case and punctuation differences', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE_VARIANT,
      options: GRAMMAR_OPTIONS_VARIANT,
      correctAnswer: 4,
      explanation: '대소문자와 문장부호 차이가 있어도 복원됩니다.',
      sourceLabel: `${SOURCE_PREFIX}: Variant Underlines`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_VARIANT,
      index: 0
    }
  );

  assert.ok(formatted);
  const underlineMatches = formatted.mainText.match(/<u[\s\S]*?<\/u>/g) || [];
  assert.equal(underlineMatches.length, 5);
  assert.ok(formatted.options.every((option, index) => option.startsWith(CIRCLED_DIGITS[index])));
});

test('fetchCached skips non-openai grammar problems', async () => {
  const ruleOptions = JSON.stringify([
    `${CIRCLED_DIGITS[0]} <u>Sample</u> sentence`,
    `${CIRCLED_DIGITS[1]} <u>Sample</u> sentence`,
    `${CIRCLED_DIGITS[2]} <u>Sample</u> sentence`,
    `${CIRCLED_DIGITS[3]} <u>Sample</u> sentence`,
    `${CIRCLED_DIGITS[4]} <u>Sample</u> sentence`
  ]);

  await database.run(
    'INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      documentId,
      'grammar',
      BASE_QUESTION,
      ruleOptions,
      '1',
      'Legacy rule-based item.',
      'basic',
      JSON.stringify({ generator: 'rule', sourceLabel: `${SOURCE_PREFIX}: Legacy` })
    ]
  );

  const saved = await aiService.saveProblems(
    documentId,
    'grammar',
    [
      {
        question: BASE_QUESTION,
        passage: GRAMMAR_PASSAGE,
        options: GRAMMAR_OPTIONS,
        correctAnswer: 2,
        explanation: 'API 문제 예시입니다.',
        sourceLabel: `${SOURCE_PREFIX}: OpenAI Grammar`
      }
    ],
    { docTitle: 'Grammar Doc' }
  );

  assert.equal(saved.length, 1);
  assert.equal(saved[0].metadata.generator, 'openai');

  const fetched = await aiService.fetchCached(documentId, 'grammar', 5, { userId });
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].metadata.generator, 'openai');
  assert.ok(fetched[0].sourceLabel.startsWith(SOURCE_PREFIX));
});
