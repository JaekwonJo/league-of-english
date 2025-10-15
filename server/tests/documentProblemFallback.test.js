const assert = require('assert');
const test = require('node:test');
const {
  translateGlossToKorean
} = require('../utils/documentProblemFallback');

test('documentProblemFallback translates representative gloss phrases into Korean', () => {
  assert.strictEqual(
    translateGlossToKorean('available but not required'),
    '필수는 아니지만 사용할 수 있는'
  );
  assert.ok(
    translateGlossToKorean('a remarkable coincidence of events').includes('우연의 일치'),
    'should detect coincidence pattern'
  );
  assert.ok(
    translateGlossToKorean('to delay or defer to a future time').includes('지연'),
    'should map common words when direct pattern missing'
  );
});
