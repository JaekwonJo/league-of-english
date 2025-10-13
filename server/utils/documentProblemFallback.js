const wordnet = require('wordnet');
const { CIRCLED_DIGITS } = require('../services/ai-problem/shared');

let wordnetReady = null;

const MAX_GRAMMAR_ATTEMPTS_PER_PASSAGE = 12;
const MAX_VOCAB_ATTEMPTS_PER_PASSAGE = 18;
const MIN_SENTENCE_LENGTH = 18;
const REQUIRED_SEGMENTS = 5;

const STOP_WORDS = new Set([
  'the','and','that','with','from','this','which','have','will','would','could','should','into','about','over','under','while','because','their','there','they','them','when','what','your','yours','ours','were','been','being','than','then','after','before','such','where','who','whom','whose','each','many','most','some','any','much','very','just','even','also','both','either','neither','ever','never','once','twice','upon','among','toward','against'
]);

const GENERIC_DISTRACTORS = {
  adjective: [
    { word: 'optional', gloss: 'available but not required', korean: '선택적인' },
    { word: 'leisurely', gloss: 'unhurried and relaxed', korean: '느긋한' },
    { word: 'random', gloss: 'lacking a definite plan or pattern', korean: '무작위의' },
    { word: 'minor', gloss: 'relatively small or unimportant', korean: '사소한' },
    { word: 'stagnant', gloss: 'not advancing or developing', korean: '정체된' },
    { word: 'casual', gloss: 'done without serious intention', korean: '가볍고 즉흥적인' }
  ],
  noun: [
    { word: 'luxury', gloss: 'something adding to pleasure or comfort but not absolutely necessary', korean: '사치' },
    { word: 'delay', gloss: 'the act of postponing or slowing down', korean: '지연' },
    { word: 'coincidence', gloss: 'a remarkable concurrence of events', korean: '우연의 일치' },
    { word: 'confusion', gloss: 'a state of mental uncertainty', korean: '혼란' },
    { word: 'trivia', gloss: 'unimportant matters', korean: '사소한 일들' },
    { word: 'hindrance', gloss: 'something that impedes or is burdensome', korean: '방해물' }
  ],
  verb: [
    { word: 'postpone', gloss: 'to delay or defer to a future time', korean: '연기하다' },
    { word: 'ignore', gloss: 'to refuse to take notice of', korean: '무시하다' },
    { word: 'neglect', gloss: 'to fail to give proper attention', korean: '소홀히 하다' },
    { word: 'relax', gloss: 'to make less tense', korean: '긴장을 풀다' },
    { word: 'distract', gloss: 'to draw away the mind', korean: '산만하게 하다' },
    { word: 'hesitate', gloss: 'to pause because of uncertainty', korean: '주저하다' }
  ],
  adverb: [
    { word: 'slowly', gloss: 'at a low speed', korean: '천천히' },
    { word: 'casually', gloss: 'without definite or serious intention', korean: '대수롭지 않게' },
    { word: 'rarely', gloss: 'not often', korean: '드물게' },
    { word: 'eventually', gloss: 'at an unspecified later time', korean: '결국' },
    { word: 'loosely', gloss: 'in a relaxed manner', korean: '느슨하게' },
    { word: 'barely', gloss: 'by the smallest margin', korean: '간신히' }
  ]
};

const GRAMMAR_RULES = [
  {
    key: 'are_is',
    description: '주어-동사 수 일치',
    apply(sentence) {
      const regex = /\bare\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Is' : 'is';
      return {
        original,
        incorrect,
        reason: `'${original}'는 복수 주어에 맞는 동사인데 '${incorrect}'로 바꾸면 주어-동사 수 일치가 무너집니다.`,
        tag: '주어-동사 수 일치'
      };
    }
  },
  {
    key: 'is_are',
    description: '주어-동사 수 일치',
    apply(sentence) {
      const regex = /\bis\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Are' : 'are';
      return {
        original,
        incorrect,
        reason: `'${original}'는 단수 주어에 맞는 동사인데 '${incorrect}'로 바꾸면 주어-동사 수 일치가 어긋납니다.`,
        tag: '주어-동사 수 일치'
      };
    }
  },
  {
    key: 'has_have',
    description: '주어-동사 수 일치',
    apply(sentence) {
      const regex = /\bhas\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Have' : 'have';
      return {
        original,
        incorrect,
        reason: `'${original}'는 단수 주어에 알맞은 형태이므로 '${incorrect}'로 쓰면 수 일치 오류가 발생합니다.`,
        tag: '주어-동사 수 일치'
      };
    }
  },
  {
    key: 'have_has',
    description: '주어-동사 수 일치',
    apply(sentence) {
      const regex = /\bhave\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Has' : 'has';
      return {
        original,
        incorrect,
        reason: `'${original}'는 복수 주어에 맞고, '${incorrect}'로 쓰면 주어-동사 수 일치가 틀립니다.`,
        tag: '주어-동사 수 일치'
      };
    }
  },
  {
    key: 'was_were',
    description: '시제·수 일치',
    apply(sentence) {
      const regex = /\bwas\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Were' : 'were';
      return {
        original,
        incorrect,
        reason: `'${original}'은 단수 주어에 맞는 형태인데 '${incorrect}'로 바꾸면 시제/수 일치가 맞지 않습니다.`,
        tag: '시제/수 일치'
      };
    }
  },
  {
    key: 'were_was',
    description: '시제·수 일치',
    apply(sentence) {
      const regex = /\bwere\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Was' : 'was';
      return {
        original,
        incorrect,
        reason: `'${original}'은 복수 주어/가정법에 맞는 형태인데 '${incorrect}'로 쓰면 문법이 틀립니다.`,
        tag: '시제/수 일치'
      };
    }
  },
  {
    key: 'their_there',
    description: '대명사 사용',
    apply(sentence) {
      const regex = /\btheir\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'There' : 'there';
      return {
        original,
        incorrect,
        reason: `'${original}'은 소유 대명사인데 '${incorrect}'로 바꾸면 지시 부사로 변해 의미가 틀어집니다.`,
        tag: '대명사 용법'
      };
    }
  },
  {
    key: 'there_their',
    description: '대명사 사용',
    apply(sentence) {
      const regex = /\bthere\b/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = isCapitalized(original) ? 'Their' : 'their';
      return {
        original,
        incorrect,
        reason: `'${original}'은 장소/존재를 나타내는데 '${incorrect}'로 바꿔 소유를 뜻하게 하면 문맥이 어긋납니다.`,
        tag: '대명사 용법'
      };
    }
  },
  {
    key: 'an_a',
    description: '관사 사용',
    apply(sentence) {
      const regex = /\ban\s+([a-z])/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const nextChar = match[1];
      if (!/^[aeiou]/i.test(nextChar)) return null;
      const incorrect = original.replace(/an/i, isCapitalized(original[0]) ? 'A' : 'a');
      return {
        original,
        incorrect,
        reason: `'${original}'은 모음 발음 앞에 쓰는 관사인데 '${incorrect}'로 바꾸면 관사 사용이 잘못됩니다.`,
        tag: '관사 용법'
      };
    }
  },
  {
    key: 'a_an',
    description: '관사 사용',
    apply(sentence) {
      const regex = /\ba\s+([aeiou][a-z]*)/i;
      const match = regex.exec(sentence);
      if (!match) return null;
      const original = match[0];
      const incorrect = original.replace(/a/i, isCapitalized(original[0]) ? 'An' : 'an');
      return {
        original,
        incorrect,
        reason: `'${original}'은 자음 발음 앞에 쓰는 관사인데 '${incorrect}'로 바꾸면 발음 규칙에 어긋납니다.`,
        tag: '관사 용법'
      };
    }
  }
];

function isCapitalized(token = '') {
  return token && token[0] === token[0].toUpperCase();
}

function extractSegmentsWithIndices(passage = '') {
  const text = String(passage || '');
  const segments = [];
  let startIndex = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (startIndex === null && !/\s/.test(char)) {
      startIndex = i;
    }
    if (startIndex !== null && /[.!?]/.test(char)) {
      let end = i + 1;
      while (end < text.length && /[\"')\]]/.test(text[end])) {
        end += 1;
      }
      const slice = text.slice(startIndex, end);
      const trimmed = slice.trim();
      if (trimmed.length >= MIN_SENTENCE_LENGTH) {
        segments.push({
          start: startIndex,
          end,
          slice,
          content: trimmed
        });
      }
      startIndex = null;
    }
  }
  if (startIndex !== null && startIndex < text.length) {
    const slice = text.slice(startIndex);
    const trimmed = slice.trim();
    if (trimmed.length >= MIN_SENTENCE_LENGTH) {
      segments.push({ start: startIndex, end: text.length, slice, content: trimmed });
    }
  }
  return segments;
}

function expandSegments(segments, passage) {
  let current = [...segments];
  while (current.length < REQUIRED_SEGMENTS) {
    const longest = current.reduce((acc, seg, idx) => {
      if (!acc || seg.content.length > acc.content.length) {
        return { ...seg, index: idx };
      }
      return acc;
    }, null);
    if (!longest || longest.content.length < MIN_SENTENCE_LENGTH * 2) break;
    const commas = [];
    const relativeStart = longest.start;
    for (let i = 0; i < longest.slice.length; i += 1) {
      if (longest.slice[i] === ',') {
        commas.push(i);
      }
    }
    if (!commas.length) break;
    const splitAt = commas[Math.floor(commas.length / 2)];
    const firstSlice = longest.slice.slice(0, splitAt).trim();
    const secondSlice = longest.slice.slice(splitAt + 1).trim();
    if (firstSlice.length < MIN_SENTENCE_LENGTH / 2 || secondSlice.length < MIN_SENTENCE_LENGTH / 2) break;
    current.splice(longest.index, 1, {
      start: longest.start,
      end: longest.start + splitAt,
      slice: passage.slice(longest.start, longest.start + splitAt),
      content: firstSlice
    }, {
      start: longest.start + splitAt + 1,
      end: longest.end,
      slice: passage.slice(longest.start + splitAt + 1, longest.end),
      content: secondSlice
    });
  }
  return current;
}

function buildGrammarProblemFromPassage(passage, docTitle, variantIndex = 0, reasonTag = 'doc_fallback') {
  if (!passage) return null;
  let segments = extractSegmentsWithIndices(passage);
  if (!segments.length) return null;
  if (segments.length < REQUIRED_SEGMENTS) {
    segments = expandSegments(segments, passage);
  }
  if (segments.length < REQUIRED_SEGMENTS) {
    return null;
  }
  const chosen = segments.slice(0, REQUIRED_SEGMENTS).map((seg, idx) => ({ ...seg, order: idx }));
  let mutated = null;
  for (let attempt = 0; attempt < Math.min(MAX_GRAMMAR_ATTEMPTS_PER_PASSAGE, segments.length); attempt += 1) {
    const candidate = segments[attempt % segments.length];
    for (const rule of GRAMMAR_RULES) {
      const outcome = rule.apply(candidate.content);
      if (!outcome) continue;
      const incorrectContent = candidate.content.replace(outcome.original, outcome.incorrect);
      mutated = {
        ...candidate,
        index: attempt % segments.length,
        incorrectContent,
        rule: outcome
      };
      break;
    }
    if (mutated) break;
  }
  if (!mutated) {
    return null;
  }
  const selectedSet = new Set(chosen.map((seg) => seg.start));
  if (!selectedSet.has(mutated.start)) {
    chosen[chosen.length - 1] = { ...mutated, order: chosen.length - 1 };
  }
  const ordered = chosen
    .map((seg) => (seg.start === mutated.start ? { ...mutated, order: seg.order } : seg))
    .sort((a, b) => a.start - b.start);

  const optionReasons = {};
  const optionTags = {};
  const options = [];
  let answerIndex = 1;
  let optionCounter = 0;

  const parts = [];
  let cursor = 0;
  const passageStr = String(passage);

  ordered.forEach((segment) => {
    const marker = CIRCLED_DIGITS[optionCounter];
    const segmentText = segment.start === mutated.start ? mutated.incorrectContent : segment.content;
    const originalSnippet = passageStr.slice(segment.start, segment.end);
    parts.push(passageStr.slice(cursor, segment.start));
    parts.push(`<u>${segmentText}</u>`);
    cursor = segment.end;

    const optionText = `${marker} <u>${segmentText}</u>`;
    options.push(optionText);

    if (segment.start === mutated.start) {
      answerIndex = optionCounter + 1;
      optionReasons[marker] = segment.rule.reason;
      optionTags[marker] = segment.rule.tag;
    } else {
      optionReasons[marker] = '원문의 표현을 그대로 유지해 문법적으로 자연스럽습니다.';
      optionTags[marker] = '정상 용법';
    }

    optionCounter += 1;
  });
  parts.push(passageStr.slice(cursor));
  const mainText = parts.join('');
  const answerMarker = CIRCLED_DIGITS[answerIndex - 1];
  const otherMarkers = ordered
    .map((_, idx) => CIRCLED_DIGITS[idx])
    .filter((marker) => marker !== answerMarker)
    .join(', ');

  const explanationSentences = [
    `${docTitle || '이 지문'}의 밑줄 문장 가운데 ${answerMarker}번이 문법상 오류를 드러냅니다.`,
    `${answerMarker}번은 '${mutated.rule.original}'을 '${mutated.rule.incorrect}'로 바꾸어 ${mutated.rule.tag} 오류가 발생했습니다.`,
    `${otherMarkers}번은 원문과 동일해 자연스러운 문장 구조를 유지합니다.`,
    '따라서 오류가 있는 구문을 찾아 교정하면 원문의 논지를 정확히 이해할 수 있습니다.'
  ];

  const explanation = explanationSentences.join(' ');

  return {
    id: `grammar_doc_fallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'grammar',
    question: '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?',
    questionVariant: 'single',
    mainText,
    text: mainText,
    options,
    answers: [answerIndex],
    answer: String(answerIndex),
    correctAnswer: String(answerIndex),
    explanation,
    difficulty: 'csat-advanced',
    metadata: {
      generator: 'doc-fallback',
      fallbackReason: reasonTag,
      documentTitle: docTitle,
      answerMarkers: [answerMarker],
      optionReasons,
      optionTags,
      grammarPoint: mutated.rule.tag
    },
    sourceLabel: docTitle ? `출처│${docTitle}` : '출처│업로드 문서'
  };
}

async function ensureWordnetReady() {
  if (!wordnetReady) {
    wordnetReady = wordnet.init();
  }
  return wordnetReady;
}

async function lookupWordnet(word) {
  await ensureWordnetReady();
  try {
    const definitions = await wordnet.lookup(word);
    return definitions || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[doc-fallback] wordnet lookup error', word, error?.message || error);
    return [];
  }
}

function normalizeSynonym(word) {
  return word.replace(/_/g, ' ').trim();
}

function extractCandidateWords(passage = '') {
  const seen = new Set();
  const results = [];
  const matches = passage.match(/[A-Za-z][A-Za-z\-']*/g) || [];
  matches.forEach((raw) => {
    const lower = raw.toLowerCase();
    if (lower.length < 4) return;
    if (STOP_WORDS.has(lower)) return;
    if (seen.has(lower)) return;
    seen.add(lower);
    results.push(lower);
  });
  return results;
}

function selectDistractors(pos, count, usedWords = new Set()) {
  const pool = GENERIC_DISTRACTORS[pos] || GENERIC_DISTRACTORS.adjective;
  const chosen = [];
  for (const item of pool) {
    if (chosen.length >= count) break;
    if (usedWords.has(item.word.toLowerCase())) continue;
    chosen.push(item);
    usedWords.add(item.word.toLowerCase());
  }
  return chosen;
}

function buildOptionReason(marker, word, gloss, korean, isCorrect, targetWord, targetMeaning) {
  if (isCorrect) {
    const meaningText = targetMeaning ? `${targetMeaning} 의미` : '같은 의미';
    return `${marker}번 ${word}은 WordNet 정의가 "${gloss}"로, ${meaningText}를 공유합니다.`;
  }
  return `${marker}번 ${word}은 "${gloss}"(=${korean}) 의미라 ${targetWord}의 뜻과 다릅니다.`;
}

const KOREAN_MEANING_PATTERNS = [
  { regex: /(speedy|quick|rapid|swift|prompt|immediate)/i, meaning: '빠른, 즉각적인' },
  { regex: /(temporary|borrow|brief)/i, meaning: '임시의, 잠시 사용하는' },
  { regex: /(careful|meticulous|thorough|painstaking)/i, meaning: '세심한, 꼼꼼한' },
  { regex: /(strong|resilient|robust|hardy)/i, meaning: '튼튼한, 회복력이 강한' },
  { regex: /(support|bolster|back)/i, meaning: '지지하다, 힘을 보태다' },
  { regex: /(inspect|examine|scrutinize)/i, meaning: '면밀히 조사하다' },
  { regex: /(friendly|kind|benevolent|candid)/i, meaning: '친절한, 솔직한' },
  { regex: /(reluctant|hesitant|unwilling)/i, meaning: '꺼리는, 주저하는' },
  { regex: /(ancient|old|historic)/i, meaning: '오래된, 고대의' },
  { regex: /(borrow)/i, meaning: '빌리다' },
  { regex: /(joyful|happy|elated|overjoyed)/i, meaning: '기쁜, 환희에 찬' }
];

function deriveKoreanMeaning(word = '', gloss = '') {
  const matches = new Set();
  const lowerWord = String(word || '').toLowerCase();
  KOREAN_MEANING_PATTERNS.forEach(({ regex, meaning }) => {
    if (regex.test(gloss) || regex.test(lowerWord)) {
      matches.add(meaning);
    }
  });
  if (matches.size) {
    return Array.from(matches).join(', ');
  }
  return '';
}

function buildLexicalNote(targetWord, pos, synonym, gloss, koreanMeaning) {
  const normalizedGloss = deriveKoreanMeaning(targetWord, gloss) || koreanMeaning;
  let example;
  switch (pos) {
    case 'noun':
      example = `The passage highlights the importance of ${targetWord}.`;
      break;
    case 'verb':
      example = `Teachers encourage students to ${targetWord} when they see a problem.`;
      break;
    case 'adverb':
      example = `They acted ${targetWord} to prevent further issues.`;
      break;
    default:
      example = `The report demands a ${targetWord} response.`;
  }
  return {
    targetWord,
    partOfSpeech: pos,
    synonyms: [synonym].filter(Boolean),
    antonyms: [],
    meaning: normalizedGloss ? `${normalizedGloss}${gloss ? ` (${gloss})` : ''}` : gloss,
    nuance: `문맥에서 ${targetWord}는 ${(normalizedGloss || gloss || '').split('(')[0] || '핵심 의미'} 뉘앙스를 강조합니다.`,
    example
  };
}

function wrapUnderlinedWord(passage, word) {
  const regex = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b)`, 'i');
  return passage.replace(regex, '<u>$1</u>');
}

async function buildVocabularyProblemFromPassage(passage, docTitle, variantIndex = 0, reasonTag = 'doc_fallback') {
  if (!passage) return null;
  const candidates = extractCandidateWords(passage);
  for (let attempt = 0; attempt < Math.min(candidates.length, MAX_VOCAB_ATTEMPTS_PER_PASSAGE); attempt += 1) {
    const word = candidates[attempt];
    try {
      const definitions = await lookupWordnet(word);
      if (!definitions.length) continue;
      const viable = definitions
        .map((def) => {
          const rawSynonyms = (def.meta?.words || []).map((entry) => normalizeSynonym(entry.word));
          const synonyms = rawSynonyms.filter((syn) => syn.toLowerCase() !== word.toLowerCase() && /^[A-Za-z][A-Za-z\s-]{1,20}$/.test(syn));
          return {
            pos: def.meta?.synsetType ? def.meta.synsetType[0] : 'n',
            gloss: def.glossary || def.gloss || '',
            synonyms
          };
        })
        .filter((def) => def.synonyms.length > 0);
      if (!viable.length) continue;
      const sense = viable[0];
      const synonym = sense.synonyms[0];
      const pos = mapPos(sense.pos);
      const distractors = selectDistractors(pos, 4, new Set([word.toLowerCase(), synonym.toLowerCase()]));
      if (distractors.length < 4) continue;
      const underlinedPassage = wrapUnderlinedWord(passage, word);
      if (underlinedPassage === passage) {
        continue;
      }
      const koreanMeaning = deriveKoreanMeaning(word, sense.gloss);
      const optionsPool = [
        {
          marker: null,
          word: synonym,
          gloss: sense.gloss,
          korean: koreanMeaning,
          correct: true
        },
        ...distractors.map((item) => ({
          marker: null,
          word: item.word,
          gloss: item.gloss,
          korean: item.korean,
          correct: false
        }))
      ];
      shuffle(optionsPool, variantIndex + attempt);
      const options = [];
      const optionReasons = {};
      const targetMeaningKo = koreanMeaning || sense.gloss;
      const usedMarkers = [];
      let answerIndex = 1;
      optionsPool.forEach((entry, idx) => {
        const marker = CIRCLED_DIGITS[idx];
        entry.marker = marker;
        options.push(`${marker} ${entry.word}`);
        optionReasons[marker] = buildOptionReason(marker, entry.word, entry.gloss, entry.korean, entry.correct, word, targetMeaningKo);
        if (entry.correct) {
          answerIndex = idx + 1;
        }
        usedMarkers.push(marker);
      });
      const answerMarker = CIRCLED_DIGITS[answerIndex - 1];
      const otherMarkers = usedMarkers.filter((mk) => mk !== answerMarker).join(', ');

      const explanationSentences = [
        `${docTitle || '이 지문'}에서 밑줄 친 ${word}는 "${sense.gloss}" 의미로 쓰였습니다.`,
        `${answerMarker}번 ${optionsPool[answerIndex - 1].word}이 ${targetMeaningKo} 의미 영역이라 정답입니다.`,
        `${otherMarkers}번은 각각 ${optionsPool
          .filter((entry) => !entry.correct)
          .map((entry) => `${entry.word}("${entry.gloss}")`)
          .join(', ')} 뜻이라 문맥과 어긋납니다.`,
        '밑줄 단어의 의미 차이를 판별하면 지문의 논지를 더욱 정확히 파악할 수 있습니다.'
      ];

      const explanation = explanationSentences.join(' ');

      return {
        id: `vocab_doc_fallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'vocabulary',
        question: '밑줄 친 단어와 의미가 가장 가까운 것을 고르시오.',
        mainText: underlinedPassage,
        text: underlinedPassage,
        options,
        answer: String(answerIndex),
        correctAnswer: String(answerIndex),
        explanation,
        difficulty: 'csat-advanced',
        metadata: {
          generator: 'doc-fallback',
          fallbackReason: reasonTag,
          documentTitle: docTitle,
          targetWord: word,
          targetLemma: word,
          targetMeaning: targetMeaningKo,
          optionReasons,
          vocabularyFocus: '문맥 어휘',
          lexicalNote: buildLexicalNote(word, pos, synonym, sense.gloss, targetMeaningKo)
        },
        sourceLabel: docTitle ? `출처│${docTitle}` : '출처│업로드 문서'
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[doc-fallback] wordnet lookup failed for', word, error?.message || error);
    }
  }
  return null;
}

function mapPos(pos) {
  switch (pos) {
    case 'n':
      return 'noun';
    case 'v':
      return 'verb';
    case 'r':
      return 'adverb';
    default:
      return 'adjective';
  }
}

function shuffle(array, seed = Date.now()) {
  let currentIndex = array.length;
  let randomIndex;
  let mutableSeed = seed;
  while (currentIndex !== 0) {
    mutableSeed = (mutableSeed * 9301 + 49297) % 233280;
    const rnd = mutableSeed / 233280;
    randomIndex = Math.floor(rnd * currentIndex);
    currentIndex -= 1;
    const temp = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temp;
  }
  return array;
}

async function buildGrammarFallbackProblems({ passages = [], count = 1, docTitle, reasonTag }) {
  const problems = [];
  if (!Array.isArray(passages) || !passages.length) {
    return problems;
  }
  let pointer = 0;
  while (problems.length < count && pointer < passages.length * 3) {
    const passage = passages[pointer % passages.length];
    const problem = buildGrammarProblemFromPassage(passage, docTitle, pointer, reasonTag);
    if (problem) {
      problems.push(problem);
    }
    pointer += 1;
  }
  return problems;
}

async function buildVocabularyFallbackProblems({ passages = [], count = 1, docTitle, reasonTag }) {
  const problems = [];
  if (!Array.isArray(passages) || !passages.length) {
    return problems;
  }
  let pointer = 0;
  while (problems.length < count && pointer < passages.length * 4) {
    const passage = passages[pointer % passages.length];
    // eslint-disable-next-line no-await-in-loop
    const problem = await buildVocabularyProblemFromPassage(passage, docTitle, pointer, reasonTag);
    if (problem) {
      problems.push(problem);
    }
    pointer += 1;
  }
  return problems;
}

module.exports = {
  buildGrammarFallbackProblems,
  buildVocabularyFallbackProblems
};
