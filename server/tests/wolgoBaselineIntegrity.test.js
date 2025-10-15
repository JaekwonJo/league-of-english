const assert = require('assert');
const test = require('node:test');
const baseline = require('../utils/data/wolgo-2024-03-grammar-baseline.json');

test('Wolgo 2024 baseline contains 100 well-formed questions with five segments', () => {
  assert.strictEqual(baseline.source.questionCount, 100);
  assert.strictEqual(baseline.items.length, 100);

  baseline.items.forEach((item, index) => {
    assert.ok(typeof item.header === 'string' && item.header.trim().length > 0, `question ${index + 1} missing question text`);
    assert.ok(item.answer >= 1 && item.answer <= 5, `question ${index + 1} has invalid answer index`);
    assert.strictEqual(item.segments.length, 5, `question ${index + 1} should have 5 segments`);

    item.segments.forEach((segment) => {
      assert.ok(segment.text.length > 0, 'segment text should not be empty');
      assert.ok(segment.raw.length >= segment.text.length, 'raw segment should be longer or equal to trimmed segment');
      assert.ok(segment.raw.includes(segment.text), 'trimmed segment must be contained inside raw segment');
    });
  });
});
