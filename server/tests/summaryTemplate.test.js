const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPrompt,
  deriveSummaryDirectives,
  CIRCLED_DIGITS
} = require('../utils/summaryTemplate');

test('deriveSummaryDirectives reacts to sentence length and option wordcount issues', () => {
  const message = 'Error: summary validation issues: summary_sentence_length,option_3_right_wordcount';
  const directives = deriveSummaryDirectives(message);

  assert.ok(Array.isArray(directives) && directives.length > 0);
  assert.ok(
    directives.some((line) => line.includes('18-32 words')),
    'should remind about summary sentence word count'
  );
  assert.ok(
    directives.some((line) => line.includes(CIRCLED_DIGITS[2])),
    'should reference option ③ for the right phrase constraint'
  );
});

test('buildPrompt includes adjustment directives when provided', () => {
  const prompt = buildPrompt({
    passage: 'Sample passage content that should be clipped as needed.',
    docTitle: 'Test Document',
    manualExcerpt: 'Manual snippet',
    variantTag: 'seed123',
    extraDirectives: ['- Ensure test directive appears']
  });

  assert.match(prompt, /Adjustments based on previous validation errors:/);
  assert.match(prompt, /Ensure test directive appears/);
});
