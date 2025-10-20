const test = require('node:test');
const assert = require('node:assert/strict');

const grammarData = require('../utils/data/wolgo-2022-09-grammar.json');
const vocabularyData = require('../utils/data/fallback-vocabulary.json');

function countOccurrences(text, token) {
  return (String(text || '').match(new RegExp(token, 'g')) || []).length;
}

function countSentences(text) {
  return String(text || '')
    .split(/[.!?]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function hasHangul(text) {
  return /[가-힣]/.test(String(text || ''));
}

test('fallback grammar dataset integrity', () => {
  assert.ok(Array.isArray(grammarData) && grammarData.length >= 20, 'grammar fallback should include at least 20 items');
  grammarData.forEach((item, index) => {
    assert.equal(countOccurrences(item.mainText, '<u>'), 5, `grammar item ${index} should underline exactly 5 segments`);
    assert.equal(item.options.length, 5, `grammar item ${index} should have 5 options`);
    assert.ok(item.explanation && item.explanation.length > 40, `grammar item ${index} needs a non-empty explanation`);
    assert.ok(item.sourceLabel && item.sourceLabel.startsWith('출처│'), `grammar item ${index} needs a source label`);
    assert.ok(item.answer && String(item.answer).length >= 1, `grammar item ${index} needs an answer`);
    const optionReasons = item.metadata?.optionReasons || {};
    Object.entries(optionReasons).forEach(([marker, reason]) => {
      assert.ok(hasHangul(reason), `grammar item ${index} option ${marker} reason must be Korean`);
    });
  });
});

test('fallback vocabulary dataset integrity', () => {
  assert.ok(Array.isArray(vocabularyData) && vocabularyData.length >= 10, 'vocabulary fallback should include at least 10 items');
  vocabularyData.forEach((item, index) => {
    const underlineCount = countOccurrences(item.mainText, '<u>');
    assert.ok(underlineCount === 5 || underlineCount === 1, `vocabulary item ${index} should underline at least one segment`);
    assert.equal(item.options.length, 5, `vocabulary item ${index} should have 5 options`);
    assert.ok(countSentences(item.explanation) >= 3, `vocabulary item ${index} explanation should contain at least three sentences`);
    assert.ok(item.sourceLabel && item.sourceLabel.startsWith('출처│'), `vocabulary item ${index} needs a source label`);
    assert.ok(item.answer && String(item.answer).trim(), `vocabulary item ${index} needs an answer value`);
    assert.ok(item.metadata?.correction?.replacement, `vocabulary item ${index} should include correction.replacement`);
    Object.entries(item.metadata?.optionReasons || {}).forEach(([marker, reason]) => {
      assert.ok(hasHangul(reason), `vocabulary item ${index} option ${marker} reason must be Korean`);
    });
  });
});
