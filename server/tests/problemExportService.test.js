const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPORT_MAX_TOTAL,
  normalizeTypes,
  computeFinalLimit
} = require('../services/problemExportService');

test('normalizeTypes handles strings, arrays, and falsy values', () => {
  assert.deepEqual(normalizeTypes([' blank ', 'grammar', '', null]), ['blank', 'grammar']);
  assert.deepEqual(normalizeTypes('order, insertion , ,summary'), ['order', 'insertion', 'summary']);
  assert.deepEqual(normalizeTypes(null), []);
  assert.deepEqual(normalizeTypes(undefined), []);
});

test('computeFinalLimit respects counts when provided', () => {
  const { finalLimit, totalFromCounts } = computeFinalLimit({
    normalizedCounts: { blank: 30, order: 10 },
    requestedLimit: 80
  });
  assert.equal(totalFromCounts, 40);
  assert.equal(finalLimit, 40);
});

test('computeFinalLimit clamps to EXPORT_MAX_TOTAL', () => {
  const { finalLimit } = computeFinalLimit({
    normalizedCounts: {},
    requestedLimit: EXPORT_MAX_TOTAL + 50
  });
  assert.equal(finalLimit, EXPORT_MAX_TOTAL);
});

test('computeFinalLimit falls back to requested limit when counts missing', () => {
  const { finalLimit, totalFromCounts } = computeFinalLimit({
    normalizedCounts: {},
    requestedLimit: 25
  });
  assert.equal(totalFromCounts, 0);
  assert.equal(finalLimit, 25);
});
