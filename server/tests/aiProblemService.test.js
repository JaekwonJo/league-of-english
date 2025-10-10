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
const { coerceSummaryProblem, SUMMARY_QUESTION } = require('../utils/summaryTemplate');
const { BASE_QUESTION, CIRCLED_DIGITS } = require('../utils/eobeopTemplate');
const studyService = require('../services/studyService');

let userId;
let documentId;

const SUMMARY_OPTIONS = [
  '\u2460 adjust \u2013 baseline',
  '\u2461 sustain \u2013 routine',
  '\u2462 restore \u2013 balance',
  '\u2463 elevate \u2013 performance',
  '\u2464 reduce \u2013 variance'
];

const GRAMMAR_PASSAGE_ORIGINAL = [
  'Despite the forecast, the event continued with admirable courage.',
  'He relaxed only after having finished the assignment.',
  'The bell rang just as scarcely had the class begun.',
  'The plan proceeds only if provided that the data remain stable.',
  'The manager insisted that the report be submitted today.'
].join(' ');

const GRAMMAR_PASSAGE_WITH_ERROR = [
  'Despite the forecast, the event continued with <u>Despite of</u> courage.',
  'He relaxed only after <u>having finished</u> the assignment.',
  'The bell rang just as <u>scarcely had</u> the class begun.',
  'The plan proceeds only if <u>provided that</u> the data remain stable.',
  'The manager insisted that <u>the report be submitted</u> today.'
].join(' ');

const GRAMMAR_PASSAGE = GRAMMAR_PASSAGE_WITH_ERROR;

const GRAMMAR_PASSAGE_MISSING = [
  'Despite the forecast, the event continued with <u>Despite of</u> courage.',
  'He relaxed only after Having finished the assignment.',
  'The bell rang just as Scarcely had the class begun.',
  'The plan proceeds only if Provided that the data remain stable.',
  'The manager insisted that The manager demanded the report be submitted today.'
].join(' ');

const GRAMMAR_PASSAGE_VARIANT_ORIGINAL = [
  'The mentor advised that the plan should remain flexible.',
  'However, she noted that execution must stay precise.',
  'Finally, the team agreed that documentation would be thorough.',
  'During reviews, observers confirmed the method was sound.',
  'Consequently, leadership concluded the rollout could proceed.'
].join(' ');

const GRAMMAR_PASSAGE_VARIANT_WITH_ERROR = [
  '<u>The mentor advised</u> that the plan should remain flexible.',
  'However, <u>She Noted</u> that execution must stay precise.',
  'Finally, the team agreed that <u>documentation would be thorough</u>.',
  'During reviews, observers confirmed <u>the method was sound</u>.',
  'Consequently, leadership concluded <u>the rollout could proceed.</u>'
].join(' ');

const GRAMMAR_PASSAGE_VARIANT = GRAMMAR_PASSAGE_VARIANT_WITH_ERROR;

const GRAMMAR_PASSAGE_HYPHEN_WITH_ERROR = [
  'The institute is committed to pro-\nviding resources that allow schools to focus on equity.',
  'Stakeholders highlight ongoing monitoring across departments.',
  'Teachers remain engaged during feedback cycles and collaboration.',
  'Policies adapt whenever new evaluation data emerges.'
].join(' ');

const GRAMMAR_PASSAGE_HYPHEN_ORIGINAL = GRAMMAR_PASSAGE_HYPHEN_WITH_ERROR;

const GRAMMAR_PASSAGE_HYPHEN = GRAMMAR_PASSAGE_HYPHEN_WITH_ERROR;

const LONG_GRAMMAR_EXPLANATION = [
  '이 지문은 상황에 맞는 문법 구조를 검증하도록 설계되었습니다.',
  '정답으로 지정된 보기에서는 도치 구조가 어색하게 사용되어 본문 논리와 충돌합니다.',
  '나머지 보기는 의미와 문법이 모두 자연스러워 본문의 흐름을 지탱합니다.'
].join(' ');

const GRAMMAR_INCORRECT_REASONS = [
  '①번은 전치사 of가 중복되어 어법 오류입니다.',
  '②번은 완료 분사 대신 다른 구조를 써야 해서 어법 오류입니다.',
  '③번은 도치 구문을 무너뜨려 어법 오류입니다.',
  '④번은 조건절 접속사가 잘못 사용되어 오류입니다.',
  '⑤번은 동사 목적절 구조가 깨져서 어법 오류입니다.'
];

const GRAMMAR_CORRECT_REASONS = [
  '①번은 문맥과 형태가 모두 자연스러워 문법적으로 옳습니다.',
  '②번은 완료분사구가 시간 관계를 정확히 드러내서 문법적으로 옳습니다.',
  '③번은 도치 구문이 자연스러워 문법적으로 옳습니다.',
  '④번은 조건절 접속사가 문맥에 적절하여 문법적으로 맞습니다.',
  '⑤번은 요구 동사의 목적절 구조가 정상이라 문법적으로 옳습니다.'
];

const VOCAB_PASSAGE = [
  'A perfectly competitive market motivates participants to reveal what they know through immediate action.',
  'Whenever preferences or circumstances shift, prices adjust quickly and individuals either stop selling failing products or redirect their effort toward better opportunities.',
  'Markets can be brutal, but they relentlessly signal when denial is no longer sustainable.'
].join(' ');

const VOCAB_OPTIONS = [
  '① markets swiftly reveal when a product no longer satisfies demand',
  '② participants stop selling items that fail to generate optimal gains',
  '③ competitive prices expose whether individuals must adjust their plans',
  '④ producers can safely ignore the market verdict and keep their old routines',
  '⑤ denial about demand vanishing is eventually confronted by the market'
];

const VOCAB_EXPLANATION = [
  '본문은 경쟁 시장이 참여자들에게 변화에 맞추어 행동을 조정하도록 신속하게 신호를 보낸다고 설명합니다.',
  '④번 선택지는 시장 판결을 무시해도 안전하다고 주장해 본문과 정면으로 충돌하므로 가장 거리가 먼 진술입니다.',
  '다른 보기들은 수요 부재를 인정하고 행동을 고쳐야 한다는 본문의 메시지를 충실히 반영합니다.',
  '따라서 ④번이 정답이며, 나머지는 본문 내용과 일치합니다.'
].join(' ');

const VOCAB_DISTRACTOR_REASONS = [
  { label: '①', reason: '수요가 사라지면 시장이 즉시 드러낸다는 설명과 연결돼요.' },
  { label: '②', reason: '최적 이익이 나지 않으면 판매를 멈춘다는 본문 진술과 일치해요.' },
  { label: '⑤', reason: '현실 부정을 시장이 바로잡는다는 문장과 맞먹습니다.' }
];

function buildGrammarOption(index, text, status = 'correct', reasonOverride, tagOverride) {
  const marker = CIRCLED_DIGITS[index];
  const reason = reasonOverride
    || (status === 'incorrect' ? GRAMMAR_INCORRECT_REASONS[index] : GRAMMAR_CORRECT_REASONS[index]);
  const tag = tagOverride || (status === 'incorrect' ? '문법 오류' : '정상 용법');
  return {
    label: marker,
    text,
    status,
    reason,
    tag
  };
}

const BLANK_ORIGINAL_PASSAGE = [
  'A great strength of the market mechanism is that there are incentives for individuals to reveal their knowledge through their behavior.',
  'This stands in contrast to many strategic situations — for example, in political negotiations — in which it is wise not to let the other side know what one\'s true preferences or production capacities are.',
  'A perfectly competitive market that clears on the spot leaves no room for such strategies.',
  'If prices are not sticky — as many models assume — individuals adapt their behavior instantaneously, whenever their preferences or the circumstances change.',
  'They stop buying items that do not satisfy their needs and stop selling items that do not provide them with optimal gains, maybe switching to the production of other items.',
  'If they have motivational problems, for example, falling into denial about the fact that there is no demand for their products, markets reveal to them, sometimes in quite brutal ways, that they better accept this market verdict.'
].join(' ');

const BLANK_TARGET = 'market verdict';

const BLANK_OPTIONS = [
  { label: '①', text: 'stubborn devotion to outdated plans' },
  { label: '②', text: 'unrestrained price expansions' },
  { label: '③', text: 'complete disregard for buyer signals' },
  { label: '④', text: 'habitual downplaying of misfit evidence' },
  { label: '⑤', text: 'full acceptance of the market verdict' }
];

const BLANK_EXPLANATION = [
  '시장 메커니즘은 수요가 없다는 사실을 즉시 드러내 줘요.',
  '정답은 시장의 판결을 받아들이고 전략을 고쳐야 한다는 메시지를 담고 있어요.',
  '다른 선택지는 신호를 무시하거나 현실을 회피하는 내용이라 본문 흐름과 어긋나요.'
].join(' ');

const BLANK_DISTRACTOR_REASONS = [
  { label: '①', reason: '옛 계획에 집착하면 본문처럼 시장 신호를 확인할 수 없어요.' },
  { label: '②', reason: '무작정 가격을 올리는 것은 시장의 경고를 정면으로 거스르는 행동이에요.' },
  { label: '③', reason: '구매자 신호를 무시하면 본문에서 말한 조정 능력이 사라집니다.' },
  { label: '④', reason: '증거를 축소하면 현실 부정이 계속되어 시장이 알려주는 교훈을 회피하게 돼요.' }
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
  await database.run('DELETE FROM study_records');
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
        question: SUMMARY_QUESTION,
        summarySentence: '(A) incremental adjustments across the system reinforce shared goals, and (B) consistent execution steadily safeguards long-term progress for every stakeholder portfolio.',
        options: SUMMARY_OPTIONS,
        correctAnswer: 1,
        explanation: '이 선택지는 지문이 강조한 조정과 일관성의 선순환을 그대로 반영합니다. 다른 보기들은 세부 사례에만 머물거나 범위를 벗어나 지문의 주장과 맞지 않아요.',
        sourceLabel: '출처│simulation mock',
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
      options: [
        buildGrammarOption(0, '<u>Despite of</u>', 'incorrect', '①번은 전치사가 중복되어 잘못된 표현입니다.', '전치사 중복'),
        buildGrammarOption(1, '<u>Having finished</u>'),
        buildGrammarOption(2, '<u>Scarcely had</u>'),
        buildGrammarOption(3, '<u>Provided that</u>'),
        buildGrammarOption(4, '<u>the report be submitted</u>')
      ],
      correctAnswer: 1,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Mock Grammar`,
      grammarPoint: 'subject-verb agreement'
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE,
      index: 0,
      enforceOriginalComparison: false
    }
  );

  assert.ok(formatted);
  assert.ok(formatted.options.every((option, index) => option.startsWith(CIRCLED_DIGITS[index])));
  assert.ok(formatted.sourceLabel.startsWith(SOURCE_PREFIX));
});

test('formatGrammarProblem enforces divergence for incorrect underline when original provided', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE_WITH_ERROR,
      options: [
        buildGrammarOption(0, '<u>Despite of</u>', 'incorrect', '①번은 전치사 of가 중복되어 어법 오류입니다.', '전치사 중복'),
        buildGrammarOption(1, '<u>having finished</u>'),
        buildGrammarOption(2, '<u>scarcely had</u>'),
        buildGrammarOption(3, '<u>provided that</u>'),
        buildGrammarOption(4, '<u>the report be submitted</u>')
      ],
      correctAnswer: 1,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Divergence`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_ORIGINAL,
      index: 0,
      enforceOriginalComparison: true
    }
  );

  assert.ok(formatted);
  assert.equal(formatted.answer, '1');
});

test('formatGrammarProblem rejects unchanged incorrect segment when comparison enforced', () => {
  const failureReasons = [];
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE_ORIGINAL,
      options: [
        buildGrammarOption(0, '<u>admirable courage</u>', 'incorrect', '①번은 오류라고 표시했지만 실제로는 원문과 동일합니다.', '검증 실패'),
        buildGrammarOption(1, '<u>having finished</u>'),
        buildGrammarOption(2, '<u>scarcely had</u>'),
        buildGrammarOption(3, '<u>provided that</u>'),
        buildGrammarOption(4, '<u>the report be submitted</u>')
      ],
      correctAnswer: 1,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Invalid`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_ORIGINAL,
      index: 0,
      enforceOriginalComparison: true,
      failureReasons
    }
  );

  assert.equal(formatted, null);
  assert.ok(failureReasons.some((reason) => reason.includes('unchanged from original')));
});
test('formatGrammarProblem retains leading letters within underlined choices', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE,
      options: [
        buildGrammarOption(0, 'A. <u>Adjust</u> baseline', 'incorrect', '①번은 조정이라는 동사가 문맥상 타당하지만 오류가 있다는 설정입니다.', '표기 오류'),
        buildGrammarOption(1, 'B) <u>Extending</u> opportunities'),
        buildGrammarOption(2, '(C) <u>Maintain</u> routines'),
        buildGrammarOption(3, 'D: <u>Restore</u> balance'),
        buildGrammarOption(4, 'E <u>Elevate</u> performance')
      ],
      correctAnswer: 1,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Enumerated Grammar`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE,
      index: 0,
      enforceOriginalComparison: false
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
      options: [
        buildGrammarOption(0, '<u>Despite of</u>'),
        buildGrammarOption(1, '<u>Having finished</u>', 'incorrect', '②번은 완료 분사 대신 다른 구조를 써야 해서 어법 오류입니다.', '분사 구문 오류'),
        buildGrammarOption(2, '<u>Scarcely had</u>'),
        buildGrammarOption(3, '<u>Provided that</u>'),
        buildGrammarOption(4, '<u>the report be submitted</u>')
      ],
      correctAnswer: 2,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Missing Underlines`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_MISSING,
      index: 0,
      enforceOriginalComparison: false
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
      options: [
        buildGrammarOption(0, '<u>The mentor advised</u>'),
        buildGrammarOption(1, '<u>She Noted</u>', 'incorrect', '②번은 대소문자 오류와 동사 형태 문제가 있어 정답입니다.', '대문자 오류'),
        buildGrammarOption(2, '<u>documentation would be thorough</u>'),
        buildGrammarOption(3, '<u>observers confirmed the method</u>'),
        buildGrammarOption(4, '<u>Leadership concluded the rollout could proceed.</u>')
      ],
      correctAnswer: 2,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Variant Underlines`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_VARIANT,
      index: 0,
      enforceOriginalComparison: false
    }
  );

  assert.ok(formatted);
  const underlineMatches = formatted.mainText.match(/<u[\s\S]*?<\/u>/g) || [];
  assert.equal(underlineMatches.length, 5);
  assert.ok(formatted.options.every((option, index) => option.startsWith(CIRCLED_DIGITS[index])));
});

test('formatGrammarProblem rebuilds underlines across hyphenated line breaks', () => {
  const formatted = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE_HYPHEN,
      options: [
        buildGrammarOption(0, '<u>providing</u>'),
        buildGrammarOption(1, '<u>to focus</u>'),
        buildGrammarOption(2, '<u>monitoring</u>'),
        buildGrammarOption(3, '<u>remain engaged</u>', 'incorrect', '④번은 동사 원형이 필요한 자리에서 부정사가 와서 오류입니다.', '동사 형태 오류'),
        buildGrammarOption(4, '<u>Policies adapt</u>')
      ],
      correctAnswer: 4,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Hyphen Grammar`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_HYPHEN,
      index: 0,
      enforceOriginalComparison: false
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

  const generatedProblem = aiService.formatGrammarProblem(
    {
      question: BASE_QUESTION,
      passage: GRAMMAR_PASSAGE,
      options: [
        buildGrammarOption(0, '<u>Despite of</u>', 'incorrect', '①번은 전치사가 중복되어 오류가 됩니다.', '전치사 중복'),
        buildGrammarOption(1, '<u>Having finished</u>'),
        buildGrammarOption(2, '<u>Scarcely had</u>'),
        buildGrammarOption(3, '<u>Provided that</u>'),
        buildGrammarOption(4, '<u>the report be submitted</u>')
      ],
      correctAnswer: 1,
      explanation: LONG_GRAMMAR_EXPLANATION,
      sourceLabel: `${SOURCE_PREFIX}: Generated`
    },
    {
      docTitle: 'Grammar Doc',
      passage: GRAMMAR_PASSAGE_ORIGINAL,
      index: 0,
      enforceOriginalComparison: true
    }
  );

  assert.ok(generatedProblem);

  const saved = await aiService.saveProblems(
    documentId,
    'grammar',
    [generatedProblem],
    { docTitle: 'Grammar Doc' }
  );

  assert.equal(saved.length, 1);
  assert.equal(saved[0].metadata.generator, 'openai');

  const fetched = await aiService.fetchCached(documentId, 'grammar', 5, { userId });
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].metadata.generator, 'openai');
  assert.ok(fetched[0].sourceLabel.startsWith(SOURCE_PREFIX));
});

test('recordStudySession stores results, updates points, and aggregates stats', async () => {
  const firstProblem = await database.run(
    'INSERT INTO problems (document_id, type, question, options, answer) VALUES (?, ?, ?, ?, ?)',
    [documentId, 'blank', 'Q1', JSON.stringify(['① option', '② option']), '1']
  );
  const secondProblem = await database.run(
    'INSERT INTO problems (document_id, type, question, options, answer) VALUES (?, ?, ?, ?, ?)',
    [documentId, 'order', 'Q2', JSON.stringify(['①', '②', '③', '④', '⑤']), '2']
  );

  const outcome = await studyService.recordStudySession(userId, [
    { problemId: firstProblem.id, isCorrect: true, userAnswer: '1', timeSpent: 12 },
    { problemId: secondProblem.id, isCorrect: false, userAnswer: '3', timeSpent: 15 }
  ]);

  assert.equal(outcome.summary.total, 2);
  assert.equal(outcome.summary.correct, 1);
  assert.equal(outcome.summary.incorrect, 1);
  assert.equal(outcome.summary.pointsDelta, 5);
  assert.equal(outcome.summary.totalPoints, 5);
  assert.ok(outcome.stats);
  assert.equal(outcome.stats.totalProblems, 2);
  assert.equal(outcome.stats.totalCorrect, 1);
  const blankStats = outcome.stats.perType.find((entry) => entry.type === 'blank');
  assert.ok(blankStats);
  assert.equal(blankStats.correct, 1);

  const userRow = await database.get('SELECT points, tier FROM users WHERE id = ?', [userId]);
  assert.equal(Number(userRow.points), 5);
  assert.equal(userRow.tier, 'Iron');

  assert.ok(outcome.rank);
  assert.equal(outcome.rank.points, 5);
  assert.equal(outcome.updatedUser.points, 5);

  const stats = await studyService.getUserStats(userId);
  assert.equal(stats.totalProblems, 2);
  assert.equal(stats.totalCorrect, 1);
});

test('recordStudySession handles negative deltas and duplicate submissions safely', async () => {
  await database.run('UPDATE users SET points = 50 WHERE id = ?', [userId]);

  const blankProblem = await database.run(
    'INSERT INTO problems (document_id, type, question, options, answer) VALUES (?, ?, ?, ?, ?)',
    [documentId, 'blank', 'Q3', JSON.stringify(['① phr', '② phr']), '1']
  );
  const savedVocab = await aiService.saveProblems(
    documentId,
    'vocabulary',
    [
      {
        question: '다음 글의 내용과 가장 거리가 먼 것은?',
        passage: VOCAB_PASSAGE,
        options: VOCAB_OPTIONS,
        correctAnswer: 4,
        explanation: VOCAB_EXPLANATION,
        sourceLabel: '출처│Mock Vocabulary',
        distractorReasons: VOCAB_DISTRACTOR_REASONS
      }
    ],
    { docTitle: 'Mock Document' }
  );
  const vocabProblemId = Number(savedVocab[0].id);

  const outcome = await studyService.recordStudySession(userId, [
    { problemId: blankProblem.id, isCorrect: false, userAnswer: '2', timeSpent: 9 },
    { problemId: vocabProblemId, isCorrect: false, userAnswer: '1', timeSpent: 11 },
    { problemId: blankProblem.id, isCorrect: false, userAnswer: '2', timeSpent: 9 }
  ]);

  assert.equal(outcome.summary.total, 2);
  assert.equal(outcome.summary.correct, 0);
  assert.equal(outcome.summary.incorrect, 2);
  assert.equal(outcome.summary.pointsDelta, -10);
  assert.equal(outcome.summary.totalPoints, 40);

  const records = await database.all('SELECT problem_id FROM study_records WHERE user_id = ?', [userId]);
  assert.equal(records.length, 2);

  const stats = await studyService.getUserStats(userId);
  assert.equal(stats.totalProblems, 2);
  assert.equal(stats.totalCorrect, 0);
  const blankEntry = stats.perType.find((entry) => entry.type === 'blank');
  const vocabEntry = stats.perType.find((entry) => entry.type === 'vocabulary');
  assert.ok(blankEntry);
  assert.ok(vocabEntry);
  assert.equal(blankEntry.total, 1);
  assert.equal(blankEntry.correct, 0);
  assert.equal(vocabEntry.total, 1);
  assert.equal(vocabEntry.correct, 0);

  await database.run('UPDATE users SET points = 0 WHERE id = ?', [userId]);
});

test('normalizeBlankPayload preserves original passage metadata and passes acceptance checks', () => {
  const blankText = BLANK_ORIGINAL_PASSAGE.replace(BLANK_TARGET, '____');
  const payload = {
    questionFamily: 'C-1',
    question: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    text: blankText,
    targetExpression: BLANK_TARGET,
    strategy: 'paraphrasing',
    options: BLANK_OPTIONS,
    correctAnswer: 5,
    explanation: BLANK_EXPLANATION,
    sourceLabel: '출처│Mock 1-25-9',
    distractorReasons: BLANK_DISTRACTOR_REASONS
  };

  const normalized = aiService._normalizeBlankPayload(payload, {
    docTitle: 'Mock Document',
    passage: BLANK_ORIGINAL_PASSAGE
  });

  const normalizedOriginal = BLANK_ORIGINAL_PASSAGE.replace(/\s+/g, ' ').trim();
  assert.equal(normalized.metadata.originalPassageLength, normalizedOriginal.length);
  assert.ok(normalized.metadata.originalSentenceCount >= 5);
  assert.equal((normalized.text.match(/____/g) || []).length, 1);
  assert.equal(normalized.metadata.blankFamily, 'C-1');
  assert.equal(normalized.metadata.blankStrategy, 'paraphrasing');
  assert.ok(aiService._acceptCachedProblem('blank', normalized));
});

test('normalizeVocabularyPayload validates five-choice vocabulary items', () => {
  const payload = {
    question: '다음 글의 내용과 가장 거리가 먼 것은?',
    passage: VOCAB_PASSAGE,
    options: VOCAB_OPTIONS,
    correctAnswer: 4,
    explanation: VOCAB_EXPLANATION,
    sourceLabel: '출처│Mock Vocabulary 2025 모의',
    distractorReasons: VOCAB_DISTRACTOR_REASONS
  };

  const normalized = aiService._normalizeVocabularyPayload(payload, {
    docTitle: 'Mock Document',
    documentCode: 'MD-001'
  });

  assert.equal(normalized.options.length, 5);
  assert.equal(normalized.answer, '4');
  assert.equal(normalized.sourceLabel, '출처│Mock Vocabulary 2025 모의');
  assert.ok(normalized.metadata?.distractorReasons?.['①']);
  assert.ok(aiService._acceptCachedProblem('vocabulary', normalized));
});

test('acceptCachedProblem rejects truncated blank passages', () => {
  const blankText = BLANK_ORIGINAL_PASSAGE.replace(BLANK_TARGET, '____');
  const payload = {
    questionFamily: 'C-1',
    question: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    text: blankText,
    targetExpression: BLANK_TARGET,
    strategy: 'paraphrasing',
    options: BLANK_OPTIONS,
    correctAnswer: 5,
    explanation: BLANK_EXPLANATION,
    sourceLabel: '출처│Mock 1-25-9',
    distractorReasons: BLANK_DISTRACTOR_REASONS
  };

  const normalized = aiService._normalizeBlankPayload(payload, {
    docTitle: 'Mock Document',
    passage: BLANK_ORIGINAL_PASSAGE
  });

  const truncated = {
    ...normalized,
    mainText: '이 문장은 ____ 을 보여 줍니다.',
    text: '이 문장은 ____ 을 보여 줍니다.',
    metadata: {
      ...normalized.metadata
    }
  };

  assert.ok(aiService._acceptCachedProblem('blank', normalized));
  assert.equal(aiService._acceptCachedProblem('blank', truncated), false);
});

test('listReviewQueueForUser surfaces only recent incorrect blanks', async () => {
  const blankText = BLANK_ORIGINAL_PASSAGE.replace(BLANK_TARGET, '____');
  const payload = {
    questionFamily: 'C-1',
    question: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    text: blankText,
    targetExpression: BLANK_TARGET,
    strategy: 'paraphrasing',
    options: BLANK_OPTIONS,
    correctAnswer: 5,
    explanation: BLANK_EXPLANATION,
    sourceLabel: '출처│Mock 1-25-9',
    distractorReasons: BLANK_DISTRACTOR_REASONS
  };

  const normalized = aiService._normalizeBlankPayload(payload, {
    docTitle: 'Mock Document',
    passage: BLANK_ORIGINAL_PASSAGE
  });

  const savedProblems = await aiService.saveProblems(documentId, 'blank', [normalized, normalized], { docTitle: 'Mock Document' });
  assert.equal(savedProblems.length, 2);

  const firstId = Number(savedProblems[0].id);
  const secondId = Number(savedProblems[1].id);
  assert.ok(Number.isInteger(firstId));
  assert.ok(Number.isInteger(secondId));

  await studyService.recordStudySession(userId, [
    { problemId: firstId, isCorrect: false, userAnswer: '1', problemType: 'blank', timeSpent: 32 },
    { problemId: secondId, isCorrect: true, userAnswer: '5', problemType: 'blank', timeSpent: 25 }
  ]);

  const queue = await aiService.listReviewQueueForUser(userId, { limit: 5 });
  assert.equal(queue.total, 1);
  assert.equal(queue.problems.length, 1);
  assert.equal(Number(queue.problems[0].id), firstId);
  assert.ok(queue.problems[0].metadata);
  assert.ok(queue.problems[0].metadata.originalPassageLength >= 100);
});

test('implicit options must be English phrases while explanations remain Korean', () => {
  const passage = 'Students realised that <u>the quiet nod</u> from the mentor signalled full approval.';
  const englishOptions = [
    '① A gentle subtle cue indicating full endorsement',
    '② A sarcastic pointed gesture masking disapproval',
    '③ A nervous little habit revealing uncertainty',
    '④ A dismissive formal motion reducing importance',
    '⑤ A token courtesy offered to close the meeting'
  ];

  const problem = {
    type: 'implicit',
    text: passage,
    options: englishOptions,
    explanation: '조용한 고개 끄덕임은 전적인 지지를 보낸다는 맥락 신호라는 점을 강조합니다. 나머지 선택지는 비꼼이나 회피로 해석해 극성과 범위를 잘못 잡은 사례예요.',
    sourceLabel: '출처│Mock Implicit 1'
  };

  assert.ok(aiService._acceptCachedProblem('implicit', problem));

  const koreanOptions = englishOptions.map((opt, index) => `${CIRCLED_DIGITS[index]} 신호를 한국어로 설명`);
  const invalid = { ...problem, options: koreanOptions };
  assert.equal(aiService._acceptCachedProblem('implicit', invalid), false);
});

test('generateImplicit restores underline when targetSpan is provided', async () => {
  const originalGetOpenAI = aiService.getOpenAI;
  const originalEnqueue = aiService._enqueueOpenAI;
  const originalOpenAI = aiService._openai;

  const IMPLICIT_QUESTION_TEXT = '다음 글에서 밑줄 친 부분이 의미하는 바로 가장 적절한 것은?';

  const stubResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            type: 'implicit',
            question: IMPLICIT_QUESTION_TEXT,
            text: 'Students realised that the quiet nod from the mentor signalled full approval.',
            targetSpan: 'The   quiet  nod  ',
            options: [
              '① A gentle subtle cue indicating full endorsement',
              '② A sarcastic pointed gesture masking disapproval',
              '③ A nervous little habit revealing uncertainty',
              '④ A dismissive formal motion reducing importance',
              '⑤ A token courtesy offered to close the meeting'
            ],
            correctAnswer: 1,
            explanation: '조용한 고개 끄덕임은 전적인 지지를 전달하는 담화 신호입니다. 나머지 선택지는 극성이나 범위를 잘못 짚은 사례예요.',
            sourceLabel: '출처│Mock 2025 10회 21번',
            implicitType: 'I-M',
            defectTags: ['focus-shift', 'polarity-flip']
          })
        }
      }
    ]
  };

  const stubOpenAI = {
    chat: {
      completions: {
        create: async () => stubResponse
      }
    }
  };

  aiService._enqueueOpenAI = (task) => task();
  aiService.getOpenAI = () => stubOpenAI;
  aiService._openai = stubOpenAI;

  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';

  try {
    const results = await aiService.generateImplicit(documentId, 1);
    assert.equal(results.length, 1);
    const [problem] = results;
    assert.ok(/<u>the quiet nod<\/u>/.test(problem.text));
    const underlineMatches = problem.text.match(/<u>([\s\S]*?)<\/u>/);
    assert.ok(underlineMatches);
    assert.equal(underlineMatches[1], 'the quiet nod');
  } finally {
    aiService.getOpenAI = originalGetOpenAI;
    aiService._enqueueOpenAI = originalEnqueue;
    aiService._openai = originalOpenAI;
    if (!originalApiKey) {
      delete process.env.OPENAI_API_KEY;
    }
  }
});
