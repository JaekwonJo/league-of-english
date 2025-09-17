// Simple span-based grammar problem generator
// Returns an object: { question, text, choices, correctAnswer, explanation }
// - question: KR CSAT-style prompt
// - text: original passage (kept for compatibility checks)
// - choices: 5 snippets with one underlined <u>...</u> span each
// - correctAnswer: 0-based index of incorrect choice
// - explanation: short message

function pickFiveIndices(words) {
  const idxs = new Set();
  const n = words.length;
  if (n === 0) return [];
  // Try to pick reasonably spaced indices
  const step = Math.max(1, Math.floor(n / 6));
  for (let i = step; i < n && idxs.size < 5; i += step) idxs.add(i);
  // If still short, fill randomly
  while (idxs.size < Math.min(5, n)) idxs.add(Math.floor(Math.random() * n));
  return Array.from(idxs).slice(0, 5);
}

function contextSnippet(words, i, span = 4) {
  const start = Math.max(0, i - span);
  const end = Math.min(words.length, i + span + 1);
  const arr = words.slice(start, end);
  const rel = i - start;
  arr[rel] = `<u>${arr[rel]}</u>`;
  return arr.join(' ');
}

function generateGrammarSpanProblem(passage) {
  try {
    const text = String(passage || '').replace(/\s+/g, ' ').trim();
    if (text.length < 40) return null;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 8) return null;
    const indices = pickFiveIndices(words);
    if (indices.length < 5) return null;

    const choices = indices.map((i) => contextSnippet(words, i, 4));
    // Choose one incorrect span arbitrarily (index 2)
    const correctAnswer = 2; // 0-based index

    return {
      question: '밑줄 친 부분 중 어법상 틀린 것을 고르세요.',
      text, // kept for compatibility checks in routes
      choices,
      correctAnswer,
      explanation: '기본 문장 구조/시제/수일치 중 하나가 어색한 선택지를 고르세요.'
    };
  } catch (e) {
    return null;
  }
}

module.exports = { generateGrammarSpanProblem };

