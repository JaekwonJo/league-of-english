function toCleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function splitSentences(text) {
  return toCleanString(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function pickRandom(array) {
  if (!Array.isArray(array) || array.length === 0) return null;
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function buildOptions(baseSentences, distractSentences) {
  const options = [];
  const pool = [...baseSentences];
  while (options.length < 3 && pool.length > 0) {
    const candidate = pool.shift();
    if (candidate && !options.includes(candidate)) options.push(candidate);
  }
  while (options.length < 3) {
    options.push('This sentence is intentionally left blank.');
  }

  const distractor = pickRandom(distractSentences) || 'This sentence refers to an unrelated topic.';
  const insertIndex = Math.floor(Math.random() * 4);
  const finalOptions = [...options];
  finalOptions.splice(insertIndex, 0, distractor);
  return { finalOptions, answer: String(insertIndex + 1) };
}

function generateIrrelevantProblems(passages, count = 1, document = {}, parsed = {}) {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);
  if (!Array.isArray(passages) || passages.length === 0 || safeCount === 0) return [];

  const sentenceBuckets = passages
    .map((passage, index) => ({
      passageIndex: index,
      sentences: splitSentences(passage)
    }))
    .filter((bucket) => bucket.sentences.length > 0);

  if (sentenceBuckets.length === 0) return [];

  const distractPool = sentenceBuckets.flatMap((bucket) =>
    bucket.sentences.map((sentence) => ({
      passageIndex: bucket.passageIndex,
      text: sentence
    }))
  );

  const problems = [];

  for (let i = 0; i < safeCount; i += 1) {
    const base = sentenceBuckets[i % sentenceBuckets.length];
    const baseSentences = base.sentences.slice(0, 6);
    const others = distractPool.filter((item) => item.passageIndex !== base.passageIndex);
    const { finalOptions, answer } = buildOptions(baseSentences, others.map((item) => item.text));

    problems.push({
      id: `irrelevant_${Date.now()}_${i}`,
      type: 'irrelevant',
      question: 'Which sentence does not belong in the passage?',
      options: finalOptions,
      answer,
      explanation: 'The highlighted sentence introduces content that does not match the passage context.',
      difficulty: 'basic',
      mainText: toCleanString(parsed.mainText || document.content || ''),
      metadata: {
        documentTitle: toCleanString(document.title || ''),
        passageNumber: base.passageIndex + 1
      }
    });
  }

  return problems;
}

module.exports = { generateIrrelevantProblems };