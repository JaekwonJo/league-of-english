const test = require('node:test');
const assert = require('node:assert/strict');

const translationHelperPath = require.resolve('../utils/translationHelper');
const translationHelper = require(translationHelperPath);
translationHelper.translateText = async (text) => `번역:${text}`;

const fallbackPath = require.resolve('../utils/documentProblemFallback');
const fallbackModule = require(fallbackPath);
fallbackModule.translateGlossToKorean = (gloss) => (gloss ? `뜻:${gloss}` : '');

delete require.cache[require.resolve('../utils/documentAnalyzer')];
const DocumentAnalyzer = require('../utils/documentAnalyzer');
const fallbackDocModule = require('../utils/documentProblemFallback');
const { buildVocabularyFallbackProblems } = fallbackDocModule;

function hasHangul(text) {
  return /[가-힣]/.test(String(text || ''));
}

test('fallback analysis variant fills every field richly', async () => {
  const analyzer = new DocumentAnalyzer();
  const passage = 'Mentors model calm directions for anxious students. They remind everyone to keep feedback gentle and specific so confidence grows.';
  const variant = await analyzer.analyzeIndividualPassage(passage, 1);

  assert.ok(Array.isArray(variant.sentenceAnalysis) && variant.sentenceAnalysis.length >= 2, 'sentenceAnalysis should contain each sentence');

  variant.sentenceAnalysis.forEach((entry, idx) => {
    assert.ok(hasHangul(entry.korean), `sentence ${idx + 1} needs Korean translation`);
    assert.ok(entry.korean.startsWith('*** 한글 해석:'), `sentence ${idx + 1} Korean line should start with required prefix`);
    assert.ok(entry.analysis && entry.analysis.length >= 60, `sentence ${idx + 1} needs long-form analysis`);
    assert.ok(entry.analysis.startsWith('*** 분석:'), `sentence ${idx + 1} analysis should start with required prefix`);
    assert.ok(entry.background && entry.background.length >= 40, `sentence ${idx + 1} needs background knowledge`);
    assert.ok(entry.background.startsWith('*** 이 문장에 필요한 배경지식:'), `sentence ${idx + 1} background should start with required prefix`);
    assert.ok(entry.example && entry.example.length >= 40, `sentence ${idx + 1} needs real-life example`);
    assert.ok(entry.example.startsWith('*** 이 문장에 필요한 사례:'), `sentence ${idx + 1} example should start with required prefix`);
    assert.ok(entry.grammar && entry.grammar.length >= 40, `sentence ${idx + 1} needs grammar explanation`);
    assert.ok(/어법\s*포인트/.test(entry.grammar), `sentence ${idx + 1} grammar should mention 어법 포인트`);
    assert.ok(entry.vocabulary?.intro && entry.vocabulary.intro.startsWith('*** 어휘 포인트:'), `sentence ${idx + 1} vocabulary intro missing required prefix`);
    assert.ok(Array.isArray(entry.vocabulary?.words) && entry.vocabulary.words.length >= 2, `sentence ${idx + 1} needs at least two vocabulary words`);
    entry.vocabulary.words.forEach((word, wordIdx) => {
      assert.ok(word.synonyms?.length >= 2, `sentence ${idx + 1} vocab ${wordIdx + 1} requires synonyms`);
      assert.ok(word.antonyms?.length >= 1, `sentence ${idx + 1} vocab ${wordIdx + 1} requires antonyms`);
      assert.ok(word.note && word.note.length >= 8, `sentence ${idx + 1} vocab ${wordIdx + 1} note must be informative`);
    });
  });

  assert.ok(Array.isArray(variant.meta?.modernApplications) && variant.meta.modernApplications.length >= 3, 'modernApplications should list three ideas');
  assert.ok(hasHangul(variant.meta?.koreanMainIdea), 'koreanMainIdea must be present');
  assert.ok(hasHangul(variant.meta?.authorsClaim), 'authorsClaim must be present');
  assert.ok(variant.meta?.englishSummary && variant.meta.englishSummary.length >= 20, 'englishSummary should not be empty');
  assert.ok(hasHangul(variant.meta?.englishSummaryKorean), 'englishSummaryKorean should contain Hangul');
});

test('WordNet override returns fallback definitions for pluralised words', async () => {
  const lookup = fallbackDocModule.__wordnetTest.lookupWordnet;
  const result = await lookup('patients');
  assert.ok(Array.isArray(result) && result.length > 0, 'patients should resolve via override');
  const mentorResult = await lookup('mentors');
  assert.ok(Array.isArray(mentorResult) && mentorResult.length > 0, 'mentors should resolve via override');
});
