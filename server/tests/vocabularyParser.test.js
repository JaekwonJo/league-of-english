const test = require('node:test');
const assert = require('node:assert/strict');

const VocabularyParser = require('../utils/vocabularyParser');

const SAMPLE_TEXT = `Word Master

1Day 01
inclusive
폭넓은, 포괄적인
2Day 01
adjacent
인접한, 가까운
3Day 01
cumulative
누적되는, 누계의
31Day 02
bewilder
당황하게 하다, 어리둥절하게 만들다
32Day 02
stale
신선하지 않은, 진부한
`;

const NUMBERED_SAMPLE_TEXT = `고2 2022년 11월(경기도) - 20번 외 3개 레슨
번호
 120번
clarity
명료함, 명확함
 220번
organization
조직, 단체, 구조
 2521번
performance
수행, 성과, 성적, 공연
 2621번
motivation
동기(부여)
`;

test('VocabularyParser extracts days and word entries', () => {
  const parser = new VocabularyParser();
  const result = parser.parse(SAMPLE_TEXT);

  assert.ok(result);
  assert.equal(result.totalDays, 2);
  assert.equal(result.days.length, 2);
  assert.equal(result.days[0].entries.length, 3);
  assert.equal(result.days[0].entries[0].term, 'inclusive');
  assert.match(result.days[0].entries[0].meaning, /포괄/);
  assert.equal(result.days[1].entries[0].term, 'bewilder');
  assert.match(result.days[1].entries[1].meaning, /신선/);
  assert.equal(result.totalWords, 5);
});

test('VocabularyParser handles numbered "XX번" worksheets', () => {
  const parser = new VocabularyParser();
  const result = parser.parse(NUMBERED_SAMPLE_TEXT);

  assert.ok(result);
  assert.equal(result.totalDays, 2);
  assert.equal(result.totalWords, 4);
  assert.deepEqual(result.days.map((d) => d.label), ['no20', 'no21']);
  assert.equal(result.days[0].entries[0].term, 'clarity');
  assert.match(result.days[1].entries[1].meaning, /동기/);
});
