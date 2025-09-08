/**
 * CSAT Grammar generators (basic/advanced)
 */

function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  return function () {
    state += 0x6D2B79F5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function underline(word) {
  return `<u>${word}</u>`;
}

// Fallback: try to inject a simple, guaranteed error highlight
function simpleInjectError(text) {
  if (typeof text !== 'string' || text.length === 0) return underline('is');
  // Prefer flipping is/are
  if (/\bis\b/i.test(text)) {
    return text.replace(/\bis\b/i, underline('are'));
  }
  if (/\bare\b/i.test(text)) {
    return text.replace(/\bare\b/i, underline('is'));
  }
  // a/an swap near a vowel/consonant start
  if (/\ba\s+([aeiouAEIOU])/i.test(text)) {
    return text.replace(/\ba\s+([aeiouAEIOU])/i, (_, v) => `${underline('an')} ${v}`);
  }
  if (/\ban\s+([bcdfghjklmnpqrstvwxyz])/i.test(text)) {
    return text.replace(/\ban\s+([bcdfghjklmnpqrstvwxyz])/i, (_, v) => `${underline('a')} ${v}`);
  }
  // Fallback: underline the first word
  const m = text.match(/\b\w+\b/);
  if (m) {
    return text.replace(m[0], underline(m[0]));
  }
  return underline('is');
}

const ADVANCED_GRAMMAR_PATTERNS = [
  {
    name: 'relative_what_that',
    find: /\b(all|everything|something|nothing|the\s+thing|things)\s+(that|which)\b/gi,
    createError: (match) => match.replace(/\b(that|which)\b/i, 'what'),
    verify: (sentence) => /\b(all|everything|something|nothing|the\s+thing)\b/i.test(sentence),
    explanation: '관계대명사 what/that 구별'
  },
  {
    name: 'participle',
    find: /\b(\w+?)(ing|ed)\b/gi,
    createError: (match, g1, g2) => match.replace(g2, g2 === 'ing' ? 'ed' : 'ing'),
    verify: (sentence) => /\b\w+(ing|ed)\b/i.test(sentence),
    explanation: '현재분사/과거분사 구별'
  },
  {
    name: 'infinitive_gerund',
    find: /\b(suggest|recommend|avoid|enjoy|finish|mind|consider|deny|admit|postpone|delay|risk|practice)\s+(to\s+\w+|\w+ing)\b/gi,
    createError: (match) => match.replace(/\b(\w+)ing\b/i, (_, v) => `to ${v}`),
    verify: (sentence) => /\b(suggest|recommend|avoid|enjoy|finish|mind)\b/i.test(sentence),
    explanation: '동명사/부정사 목적어를 취하는 동사'
  },
  {
    name: 'subjunctive',
    find: /\bIf\b.*?\b(were|was|had)\b.*?\b(would|could|might)\b/gi,
    createError: (match) => match.replace(/\bwould have\b/i, 'would'),
    verify: (sentence) => /\bIf\b/i.test(sentence),
    explanation: '가정법 시제 일치'
  },
  {
    name: 'parallelism',
    find: /\b(to\s+\w+|\w+ing)\b\s+(and|or|but)\s+\b(to\s+\w+|\w+ing)\b/gi,
    createError: (match) => match.replace(/\bto\s+(\w+)$/i, '$1ing'),
    verify: (sentence) => /\b(and|or|but)\b/i.test(sentence),
    explanation: '병렬 구조 일치'
  }
];

function findAdvancedTargets(sentence) {
  const patterns = [
    /\b(what|that|which|who|whom|whose|where|when)\b/gi,
    /\b(\w+ing|\w+ed|to\s+\w+)\b/gi,
    /\b(although|though|even\s+though|whereas|while|unless|provided|supposing)\b/gi,
    /\b(would|could|might|should)\s+(have|be)\b/gi,
    /^(\w+ing|\w+ed),/gi,
    /\b(himself|herself|itself|themselves|myself|yourself|ourselves)\b/gi,
    /\b(more|most|less|least|better|worse|further)\b/gi,
    /\b(be|been|being)\s+\w+ed\b/gi
  ];
  const targets = [];
  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(sentence)) !== null) {
      targets.push({ word: m[0], index: m.index });
    }
  }
  return targets;
}

function generateCSATGrammarProblem(passage, options = {}) {
  const rng = createRng(options.seed || Date.now());
  let sentences = (typeof passage === 'string' ? passage : String(passage || ''))
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.split(' ').length >= 7);

  // Relax constraints if nothing passes the filter
  if (sentences.length === 0) {
    sentences = (typeof passage === 'string' ? passage : String(passage || ''))
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  while (sentences.length < 5) {
    sentences.push(...sentences);
    if (sentences.length > 10) break;
  }

  let selected = shuffle(sentences, rng).slice(0, 5);
  if (selected.length === 0) {
    selected = [
      'She has a pen.',
      'They are students.',
      'He go to school every day.',
      'We were happy yesterday.',
      'It is raining now.'
    ];
  }
  const choices = selected.slice(0, 5);
  while (choices.length < 5) {
    choices.push(selected[choices.length % selected.length]);
  }
  let errorIndex = Math.floor(rng() * choices.length);
  let explanation = '문법 오류 탐지';

  let s = choices[errorIndex];
  if (typeof s !== 'string') s = String(s || 'He go to school every day.');
  const targets = findAdvancedTargets(s);
  if (targets.length > 0) {
    const t = targets[Math.floor(rng() * targets.length)];
    const before = s.slice(0, t.index);
    const after = s.slice(t.index + t.word.length);
    choices[errorIndex] = `${before}${underline(t.word)}${after}`;
  } else {
    const injected = s.replace(/\bis\b/i, underline('are'));
    choices[errorIndex] = injected === s ? simpleInjectError(s) : injected;
  }

  const labeled = choices.map((c, i) => `${i + 1}. ${c}`);
  return {
    type: 'grammar',
    question: '다음 중 밑줄 친 부분에 문법 오류가 있는 문장은?',
    choices: labeled,
    correctAnswer: errorIndex + 1,
    explanation,
    difficulty: options.difficulty === 'advanced' ? 'advanced' : 'basic',
    metadata: { pattern: options.difficulty || 'basic' }
  };
}

function generateAdvancedGrammarProblem(passage, options = {}) {
  const rng = createRng(options.seed || Date.now());
  const sentences = (typeof passage === 'string' ? passage : String(passage || ''))
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.split(' ').length >= 6);

  if (sentences.length < 3) return generateCSATGrammarProblem(passage, { difficulty: 'advanced', seed: options.seed });

  const errorCount = Math.min(4, Math.max(1, Math.floor(rng() * 3) + 1));
  const selected = shuffle(sentences, rng).slice(0, Math.max(3, errorCount));

  let injected = 0;
  const processed = selected.map((sentence) => {
    let text = sentence;
    if (injected < errorCount) {
      const targets = findAdvancedTargets(sentence);
      if (targets.length > 0) {
        const t = targets[Math.floor(rng() * targets.length)];
        const before = sentence.slice(0, t.index);
        const after = sentence.slice(t.index + t.word.length);
        text = `${before}${underline(t.word)}${after}`;
        injected++;
      }
    }
    return text;
  });

  const text = processed.join(' ');
  const choices = ['0', '1', '2', '3', '4'];
  return {
    type: 'grammar_count',
    question: '밑줄 친 부분에서 문법 오류의 개수는?',
    text,
    choices,
    correctAnswer: injected,
    explanation: `문법 오류가 총 ${injected}개입니다.`,
    difficulty: 'advanced',
    metadata: { errorCount: injected, pattern: 'multiple_errors' }
  };
}

module.exports = { generateCSATGrammarProblem, generateAdvancedGrammarProblem };

