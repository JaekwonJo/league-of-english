const test = require('node:test');
const assert = require('node:assert/strict');

const vocabRoutes = require('../routes/vocab.routes');
const {
  cleanupSpacing,
  parseVocabularyContent,
  buildQuizQuestions
} = vocabRoutes.__testables;

const SAMPLE_VOCAB = {
  vocabulary: {
    sourceFilename: 'sample-wordmaster.pdf',
    days: [
      {
        key: 'Day 01',
        label: 'Day 01',
        entries: [
          { term: 'focus ', meaning: ' 집중력 ' },
          { term: 'momentum', meaning: '추진력' },
          { term: 'attentive', meaning: '세심한 관심' }
        ]
      },
      {
        key: 'Day 02',
        label: 'Day 02',
        entries: [
          {
            term: 'resilient',
            meaning: '회복력이 강한 12 Day 03 composed 침착한 13 Day 03 vulnerable 연약한'
          }
        ]
      },
      {
        key: 'Day 03',
        label: 'Day 03',
        entries: [
          { term: 'composed', meaning: '침착한' },
          { term: 'vulnerable', meaning: '연약한' }
        ]
      }
    ]
  }
};

test('cleanupSpacing trims whitespace and quotes consistently', () => {
  assert.equal(cleanupSpacing('  “Hello”  world  '), '"Hello" world');
  assert.equal(cleanupSpacing("  ‘focus’   on   "), "'focus' on");
});

function buildStableQuestions(day, allDays, count) {
  const originalRandom = Math.random;
  const sequence = [
    0.1, // choose term_to_meaning
    0.8, 0.7, 0.6, 0.5, // shuffle for first options
    0.2, 0.9, 0.4, 0.3, // second question randomness
    0.3, 0.6, 0.2, 0.1 // fallback randomness for distractors
  ];
  let index = 0;
  Math.random = () => {
    const value = sequence[index] ?? 0.4;
    index += 1;
    return value;
  };
  try {
    return buildQuizQuestions(day, allDays, count);
  } finally {
    Math.random = originalRandom;
  }
}

test('parseVocabularyContent normalizes entries and counts words', () => {
  const parsed = parseVocabularyContent(JSON.stringify(SAMPLE_VOCAB));
  assert.ok(parsed);
  assert.equal(parsed.days.length, 3);
  assert.ok(parsed.totalWords >= 6);

  const day1 = parsed.days[0];
  assert.equal(day1.entries.length, 3);
  assert.equal(day1.entries[0].term, 'focus');
  assert.equal(day1.entries[0].order, 1);

  const day2 = parsed.days[1];
  const keywords = day2.entries.map((entry) => entry.term);
  assert.ok(keywords.includes('resilient'));
  assert.ok(keywords.includes('composed'));
  assert.ok(keywords.includes('vulnerable'));
});

test('buildQuizQuestions returns well-formed multiple-choice items', () => {
  const parsed = parseVocabularyContent(JSON.stringify(SAMPLE_VOCAB));
  const [firstDay] = parsed.days;

  const questions = buildStableQuestions(firstDay, parsed.days, 2);
  assert.equal(questions.length, 2);

  questions.forEach((question) => {
    assert.equal(question.options.length, 4);
    const uniqueOptions = new Set(question.options);
    assert.equal(uniqueOptions.size, question.options.length);
    assert.ok(question.answer >= 1 && question.answer <= question.options.length);
    assert.ok(/문장|단어|뜻/.test(question.prompt));
  });
});
