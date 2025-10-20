const wordnet = require('wordnet');
const { CIRCLED_DIGITS, escapeRegex } = require('../services/ai-problem/shared');

let wordnetReady = null;
let wordnetWarmupPromise = null;

const WORDNET_WARMUP_SEEDS = ['education', 'develop', 'improve', 'support', 'student', 'community'];

const MAX_GRAMMAR_ATTEMPTS_PER_PASSAGE = 12;
const MAX_VOCAB_ATTEMPTS_PER_PASSAGE = 18;
const MIN_SENTENCE_LENGTH = 18;
const REQUIRED_SEGMENTS = 5;

const STOP_WORDS = new Set([
  'the','and','that','with','from','this','which','have','will','would','could','should','into','about','over','under','while','because','their','there','they','them','when','what','your','yours','ours','were','been','being','than','then','after','before','such','where','who','whom','whose','each','many','most','some','any','much','very','just','even','also','both','either','neither','ever','never','once','twice','upon','among','toward','against'
]);

const GLOSS_TRANSLATIONS = [
  { regex: /(available|optional).*(not required)/i, meaning: '필수는 아니지만 사용할 수 있는' },
  { regex: /(draw|attract).*(attention)/i, meaning: '관심을 끌다' },
  { regex: /(state|condition).*(uncertainty)/i, meaning: '불확실한 상태' },
  { regex: /(cause|make).*(delay)/i, meaning: '지연을 일으키다' },
  { regex: /(leisurely|unhurried)/i, meaning: '느긋한, 여유 있는' },
  { regex: /(remarkable|striking).*(coincidence)/i, meaning: '놀라운 우연의 일치' },
  { regex: /(hindrance|obstacle)/i, meaning: '방해물, 장애물' },
  { regex: /(hesitate|pause).*(uncertainty)/i, meaning: '주저하다, 망설이다' },
  { regex: /(eventually|finally)/i, meaning: '결국, 마침내' },
  { regex: /(barely|scarcely)/i, meaning: '간신히, 겨우' },
  { regex: /(reluctant|unwilling)/i, meaning: '마음 내키지 않는, 꺼리는' },
  { regex: /(ancient|very old)/i, meaning: '아주 오래된, 고대의' },
  { regex: /(support|bolster)/i, meaning: '지지하다, 뒷받침하다' }
];

const SIMPLE_WORD_TRANSLATIONS = new Map([
  ['available', '사용 가능한'],
  ['required', '필수인'],
  ['delay', '지연'],
  ['relaxed', '느긋한'],
  ['random', '무작위의'],
  ['minor', '사소한'],
  ['stagnant', '정체된'],
  ['casual', '가볍고 즉흥적인'],
  ['luxury', '사치'],
  ['confusion', '혼란'],
  ['hindrance', '방해물'],
  ['ignore', '무시하다'],
  ['neglect', '소홀히 하다'],
  ['relax', '긴장을 풀다'],
  ['hesitate', '주저하다'],
  ['slowly', '천천히'],
  ['rarely', '드물게'],
  ['eventually', '결국'],
  ['barely', '간신히'],
  ['swift', '재빠른'],
  ['prompt', '재빠른'],
  ['immediate', '즉각적인'],
  ['borrow', '빌리다'],
  ['meticulous', '세심한'],
  ['thorough', '철저한'],
  ['robust', '튼튼한'],
  ['resilient', '회복력이 강한'],
  ['inspect', '면밀히 조사하다'],
  ['benevolent', '친절한'],
  ['candid', '솔직한']
]);

function formatSourceLabel(docTitle, variantIndex) {
  const baseTitle = docTitle && String(docTitle).trim() ? docTitle.trim() : '업로드 문서';
  const index = Number.isInteger(variantIndex) ? variantIndex + 1 : null;
  return `출처│${baseTitle}${index ? ` - No.${index}` : ''}`;
}

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

  const passageStr = String(passage);

  const highlights = [];

  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\\]\\]/g, '\$&');
  const collectWordMatches = (slice) => {
    const results = [];
    const regex = /\b[A-Za-z][A-Za-z'\-]*\b/g;
    let match;
    while ((match = regex.exec(slice)) !== null) {
      results.push({ match: match[0], index: match.index });
    }
    return results;
  };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const isWordChar = (ch) => /[A-Za-z']/i.test(ch || '');

  const expandByWords = (start, end, before = 1, after = 1) => {
    let expandedStart = start;
    let expandedEnd = end;

    for (let b = 0; b < before; b += 1) {
      let cursor = expandedStart;
      while (cursor > 0 && !isWordChar(passageStr[cursor - 1])) {
        cursor -= 1;
      }
      while (cursor > 0 && isWordChar(passageStr[cursor - 1])) {
        cursor -= 1;
      }
      if (cursor === expandedStart) break;
      expandedStart = cursor;
    }

    for (let a = 0; a < after; a += 1) {
      let cursor = expandedEnd;
      while (cursor < passageStr.length && !isWordChar(passageStr[cursor])) {
        cursor += 1;
      }
      while (cursor < passageStr.length && isWordChar(passageStr[cursor])) {
        cursor += 1;
      }
      if (cursor === expandedEnd) break;
      expandedEnd = cursor;
    }

    return { start: expandedStart, end: expandedEnd };
  };

  const buildNeutralHighlight = (segment) => {
    const slice = String(segment.slice || passageStr.slice(segment.start, segment.end));
    const words = collectWordMatches(slice);
    if (!words.length) {
      return null;
    }
    let startWordIndex = 0;
    for (let idx = 0; idx < words.length; idx += 1) {
      if (words[idx].match.length > 2) {
        startWordIndex = idx;
        break;
      }
    }
    const endWordIndex = clamp(startWordIndex + 2, startWordIndex, words.length - 1);
    const start = segment.start + words[startWordIndex].index;
    const end = segment.start + words[endWordIndex].index + words[endWordIndex].match.length;
    const original = passageStr.slice(start, end);
    return {
      start,
      end,
      original,
      display: original
    };
  };

  const buildMutatedHighlight = (segment, rule) => {
    const slice = String(segment.slice || passageStr.slice(segment.start, segment.end));
    const words = collectWordMatches(slice);
    const targetLower = rule.original.toLowerCase();
    let targetWordIndex = words.findIndex((entry) => entry.match.toLowerCase() === targetLower);
    let start;
    let end;
    if (targetWordIndex !== -1) {
      const startWordIndex = clamp(targetWordIndex - 1, 0, words.length - 1);
      const endWordIndex = clamp(targetWordIndex + 1, 0, words.length - 1);
      start = segment.start + words[startWordIndex].index;
      end = segment.start + words[endWordIndex].index + words[endWordIndex].match.length;
    } else {
      const regex = new RegExp(escapeRegExp(rule.original), 'i');
      const match = regex.exec(slice);
      if (!match) {
        return null;
      }
      const preliminaryStart = segment.start + match.index;
      const preliminaryEnd = preliminaryStart + match[0].length;
      const expanded = expandByWords(preliminaryStart, preliminaryEnd, 1, 1);
      start = expanded.start;
      end = expanded.end;
    }
    const originalSnippet = passageStr.slice(start, end);
    const regex = new RegExp(escapeRegExp(rule.original), 'i');
    const mutatedSnippet = originalSnippet.replace(regex, rule.incorrect);
    if (originalSnippet === mutatedSnippet) {
      return null;
    }
    return {
      start,
      end,
      original: originalSnippet,
      display: mutatedSnippet
    };
  };

  ordered.forEach((segment, idx) => {
    const isMutated = segment.start === mutated.start;
    let highlight = null;
    if (isMutated) {
      highlight = buildMutatedHighlight(segment, segment.rule);
    } else {
      highlight = buildNeutralHighlight(segment);
    }
    if (!highlight) {
      const fallbackOriginal = passageStr.slice(segment.start, segment.end);
      highlight = {
        start: segment.start,
        end: segment.end,
        original: fallbackOriginal,
        display: isMutated ? segment.incorrectContent : fallbackOriginal
      };
    }
    highlights.push({
      ...highlight,
      marker: CIRCLED_DIGITS[idx],
      isMutated,
      rule: segment.rule
    });
  });

  highlights.sort((a, b) => a.start - b.start);

  const optionReasons = {};
  const optionTags = {};
  let answerIndex = 1;

  const replacements = highlights.map((item, index) => {
    if (item.isMutated) {
      answerIndex = index + 1;
      optionReasons[item.marker] = item.rule.reason;
      optionTags[item.marker] = item.rule.tag;
    } else {
      optionReasons[item.marker] = '원문의 표현을 그대로 유지해 문법적으로 자연스럽습니다.';
      optionTags[item.marker] = '정상 용법';
    }
    return {
      start: item.start,
      end: item.end,
      marker: item.marker,
      display: item.display
    };
  });

  const options = replacements.map((item) => `${item.marker} <u>${item.display}</u>`);

  const sortedForInsertion = [...replacements].sort((a, b) => b.start - a.start);
  let mainText = passageStr;
  sortedForInsertion.forEach((rep) => {
    mainText = `${mainText.slice(0, rep.start)}<u>${rep.display}</u>${mainText.slice(rep.end)}`;
  });
  const answerMarker = CIRCLED_DIGITS[answerIndex - 1];
  const otherMarkers = highlights
    .map((item) => item.marker)
    .filter((marker) => marker !== answerMarker)
    .join(', ');

  const explanationSentences = [
    `${docTitle || '이 지문'}의 밑줄 구간 가운데 ${answerMarker}번이 문법상 오류를 드러냅니다.`,
    `${answerMarker}번은 '${mutated.rule.original}'을 '${mutated.rule.incorrect}'로 바꾸어 ${mutated.rule.tag} 오류가 발생했습니다.`,
    `${otherMarkers}번은 원문과 동일해 자연스러운 문장 구조를 보존합니다.`,
    '따라서 오류가 있는 구문을 정확히 찾아 교정하면 시험 수준의 어법 판단이 가능합니다.'
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
    sourceLabel: formatSourceLabel(docTitle, variantIndex)
  };
}

async function ensureWordnetReady() {
  if (!wordnetReady) {
    wordnetReady = wordnet.init();
  }
  return wordnetReady;
}

async function warmupWordnet() {
  if (!wordnetWarmupPromise) {
    wordnetWarmupPromise = (async () => {
      try {
        await ensureWordnetReady();
        // Warm up sequentially to avoid hammering the disk first time.
        /* eslint-disable no-await-in-loop */
        for (const seed of WORDNET_WARMUP_SEEDS) {
          try {
            await wordnet.lookup(seed);
          } catch (lookupError) {
            // eslint-disable-next-line no-console
            console.warn('[doc-fallback] warmup lookup failed', seed, lookupError?.message || lookupError);
          }
        }
        /* eslint-enable no-await-in-loop */
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[doc-fallback] wordnet warmup error', error?.message || error);
      }
    })();
  }
  return wordnetWarmupPromise;
}

const NODE_ENV = (process.env.NODE_ENV || '').toLowerCase();
if (!['test', 'ci'].includes(NODE_ENV)) {
  warmupWordnet();
}

const CUSTOM_WORDNET_OVERRIDES = new Map([
  ['patient', {
    synsetType: 'n',
    gloss: 'a person who requires medical care',
    words: ['patient'],
    pointers: []
  }],
  ['boundary', {
    synsetType: 'n',
    gloss: 'a line or limit that marks the edge of an area or concept',
    words: ['boundary'],
    pointers: []
  }],
  ['mentor', {
    synsetType: 'n',
    gloss: 'a trusted guide who gives advice or training',
    words: ['mentor'],
    pointers: []
  }],
  ['checklist', {
    synsetType: 'n',
    gloss: 'a list of tasks to be completed or points to be considered',
    words: ['checklist'],
    pointers: []
  }],
  ['reminder', {
    synsetType: 'n',
    gloss: 'an item or note that prompts the memory of something',
    words: ['reminder'],
    pointers: []
  }],
  ['expression', {
    synsetType: 'n',
    gloss: 'a word or phrase that conveys an idea',
    words: ['expression'],
    pointers: []
  }],
  ['student', {
    synsetType: 'n',
    gloss: 'a learner who attends a school or studies under a teacher',
    words: ['student'],
    pointers: []
  }],
  ['focus', {
    synsetType: 'n',
    gloss: 'the concentration of attention or energy on something',
    words: ['focus'],
    pointers: []
  }]
]);

const WORDNET_WARNING_CACHE = new Set();

const WORDNET_LEMMA_OVERRIDES = new Map([
  ['self-boundaries', 'boundary'],
  ['selfboundaries', 'boundary'],
  ['health-related', 'health'],
  ['healthrelated', 'health'],
  ['cannot', 'can'],
  ['seen', 'see'],
  ['makes', 'make'],
  ['helps', 'help'],
  ['looks', 'look']
]);

function buildOverrideDefinition(key) {
  const override = CUSTOM_WORDNET_OVERRIDES.get(key);
  if (!override) return [];
  return [{
    gloss: override.gloss,
    glossary: override.gloss,
    def: override.gloss,
    meta: {
      synsetType: [override.synsetType],
      words: (override.words || []).map((word) => ({ word })),
      pointers: override.pointers || []
    }
  }];
}

function generateWordnetVariants(raw = '') {
  const word = String(raw || '').trim();
  const variants = new Set();
  if (!word) return [];
  const lower = word.toLowerCase();
  variants.add(lower);
  variants.add(lower.replace(/-/g, ' '));
  variants.add(lower.replace(/-/g, ''));
  if (WORDNET_LEMMA_OVERRIDES.has(lower)) {
    variants.add(WORDNET_LEMMA_OVERRIDES.get(lower));
  }
  if (lower.includes('-')) {
    lower.split('-').forEach((part) => { if (part) variants.add(part); });
  }
  if (lower.endsWith('ies')) {
    variants.add(`${lower.slice(0, -3)}y`);
  }
  if (lower.endsWith('ves')) {
    variants.add(`${lower.slice(0, -3)}f`);
    variants.add(`${lower.slice(0, -3)}fe`);
  }
  if (lower.endsWith('s')) {
    variants.add(lower.slice(0, -1));
  }
  if (lower.endsWith('es')) {
    variants.add(lower.slice(0, -2));
  }
  if (lower.endsWith('ing')) {
    variants.add(lower.slice(0, -3));
  }
  if (lower.endsWith('ed')) {
    variants.add(lower.slice(0, -2));
  }
  return Array.from(variants).filter(Boolean);
}

async function lookupWordnet(word) {
  await ensureWordnetReady();
  const candidates = generateWordnetVariants(word);
  for (const candidate of candidates) {
    try {
      const definitions = await wordnet.lookup(candidate);
      if (definitions && definitions.length) {
        return definitions;
      }
    } catch (error) {
      // swallow error; we may succeed with overrides below
    }
  }

  for (const candidate of candidates) {
    const override = buildOverrideDefinition(candidate);
    if (override.length) {
      return override;
    }
  }

  if (!WORDNET_WARNING_CACHE.has(word)) {
    console.warn('[doc-fallback] wordnet lookup miss', word); // eslint-disable-line no-console
    WORDNET_WARNING_CACHE.add(word);
  }
  return [];
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

function translateGlossToKorean(gloss = '') {
  const trimmed = gloss.trim();
  if (!trimmed) return '';

  const direct = GLOSS_TRANSLATIONS.find((entry) => entry.regex.test(trimmed));
  if (direct) {
    return direct.meaning;
  }

  const simplified = trimmed
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const translatedWords = simplified
    .map((word) => SIMPLE_WORD_TRANSLATIONS.get(word))
    .filter(Boolean);

  if (translatedWords.length >= 2) {
    return translatedWords.join(' ');
  }
  if (translatedWords.length === 1) {
    return `${translatedWords[0]} 의미`;
  }
  return '';
}

function buildOptionReason(marker, word, gloss, korean, isCorrect, targetWord, targetMeaning) {
  const glossKorean = korean || translateGlossToKorean(gloss);
  const glossDisplay = glossKorean || (gloss ? `"${gloss}" 의미` : '문맥에 맞지 않는 의미');
  if (isCorrect) {
    const meaningText = targetMeaning ? `${targetMeaning} 의미` : '같은 의미';
    return `${marker}번 ${word}은 ${glossDisplay}라서 ${meaningText}를 공유합니다.`;
  }
  return `${marker}번 ${word}은 ${glossDisplay}라 ${targetWord}의 뜻과 다릅니다.`;
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

function applyUnderlinesWithReplacement(passage, selections = []) {
  if (!Array.isArray(selections) || selections.length !== 5) {
    return null;
  }
  const used = new Array(passage.length).fill(false);
  const segments = [];

  const locate = (word) => {
    const pattern = new RegExp(`\b${escapeRegex(word)}\b`, 'gi');
    let match;
    while ((match = pattern.exec(passage)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      let overlaps = false;
      for (let idx = start; idx < end; idx += 1) {
        if (used[idx]) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        for (let idx = start; idx < end; idx += 1) {
          used[idx] = true;
        }
        return { start, end, text: match[0] };
      }
    }
    return null;
  };

  for (const selection of selections) {
    const match = locate(selection.original);
    if (!match) {
      return null;
    }
    segments.push({
      ...match,
      kind: selection.kind,
      replacement: selection.kind === 'incorrect' ? selection.replacement : match.text,
      gloss: selection.gloss || ''
    });
  }

  segments.sort((a, b) => a.start - b.start);

  let updatedText = passage;
  const orderedSegments = [];
  let incorrectIndex = -1;

  for (let idx = segments.length - 1; idx >= 0; idx -= 1) {
    const segment = segments[idx];
    updatedText = `${updatedText.slice(0, segment.start)}<u>${segment.replacement}</u>${updatedText.slice(segment.end)}`;
  }

  const underlinePattern = /<u[\s\S]*?<\/u>/gi;
  let match;
  let cursor = 0;
  while ((match = underlinePattern.exec(updatedText)) !== null) {
    const snippet = match[0].replace(/<\/?.*?>/g, '') || '';
    const segment = segments[cursor];
    orderedSegments.push({ text: snippet, gloss: segment.gloss, kind: segment.kind });
    if (segment.kind === 'incorrect') {
      incorrectIndex = cursor;
    }
    cursor += 1;
  }

  if (orderedSegments.length !== selections.length) {
    return null;
  }

  return {
    updatedText,
    orderedSegments,
    incorrectIndex
  };
}

async function buildVocabularyProblemFromPassage(passage, docTitle, variantIndex = 0, reasonTag = 'doc_fallback') {
  if (!passage) return null;
  const candidates = extractCandidateWords(passage).filter((word, idx, arr) => arr.indexOf(word) === idx);
  if (candidates.length < 5) {
    return null;
  }

  for (let attempt = 0; attempt < candidates.length; attempt += 1) {
    const targetWord = candidates[attempt];
    try {
      const definitions = await lookupWordnet(targetWord);
      if (!definitions.length) continue;
      const viable = definitions
        .map((def) => {
          const part = def.meta?.synsetType ? def.meta.synsetType[0] : 'n';
          const gloss = def.glossary || def.gloss || '';
          const distractors = selectDistractors(mapPos(part), 3, new Set([targetWord.toLowerCase()]));
          return {
            part,
            gloss,
            distractors
          };
        })
        .filter((entry) => entry.distractors.length);
      if (!viable.length) continue;

      const chosen = viable[0];
      const incorrectEntry = chosen.distractors[0];
      const incorrectWord = incorrectEntry.word;
      if (!incorrectWord || incorrectWord.toLowerCase() === targetWord.toLowerCase()) {
        continue;
      }

      const fillerWords = candidates.filter((word) => word !== targetWord).slice(0, 4);
      if (fillerWords.length < 4) {
        continue;
      }

      const selections = [
        { kind: 'incorrect', original: targetWord, replacement: incorrectWord, gloss: incorrectEntry.gloss || chosen.gloss },
        ...fillerWords.map((word) => ({ kind: 'correct', original: word }))
      ];

      const applied = applyUnderlinesWithReplacement(passage, selections);
      if (!applied) {
        continue;
      }

      const { updatedText, orderedSegments, incorrectIndex } = applied;
      if (orderedSegments.length !== 5 || incorrectIndex === -1) {
        continue;
      }

      const options = orderedSegments.map((segment, idx) => `${CIRCLED_DIGITS[idx]} <u>${segment.text}</u>`);
      const answerValue = String(incorrectIndex + 1);
      const incorrectMarker = CIRCLED_DIGITS[incorrectIndex];
      const correctionWord = selections[0].original;
      const incorrectText = selections[0].replacement;
      const gloss = selections[0].gloss || '';
      const glossKorean = translateGlossToKorean(gloss);
      const glossDisplay = glossKorean || (gloss ? `"${gloss}" 의미` : '문맥에 어울리지 않는 의미');
      const otherMarkers = orderedSegments
        .map((segment, idx) => ({ segment, idx }))
        .filter((entry) => entry.idx !== incorrectIndex)
        .map((entry) => CIRCLED_DIGITS[entry.idx])
        .join(', ');

      const explanationSentences = [
        `${docTitle || '이 지문'}은 상황을 설명하며 대부분의 밑줄 표현이 문맥에 맞습니다.`,
        `${incorrectMarker}번 ${incorrectText}는 ${glossDisplay}라서 ${correctionWord}로 고쳐야 자연스럽습니다.`,
        `${otherMarkers}번 표현은 원문의 의미와 흐름에 맞는 자연스러운 어휘입니다.`
      ];

      const optionReasons = {};
      optionReasons[incorrectMarker] = `${incorrectText}는 ${glossDisplay}라서 ${correctionWord}로 수정해야 합니다.`;
      orderedSegments.forEach((segment, idx) => {
        const marker = CIRCLED_DIGITS[idx];
        if (marker === incorrectMarker) return;
        optionReasons[marker] = `${segment.text}는 문맥에 자연스럽게 어울립니다.`;
      });

      const metadata = {
        generator: 'doc-fallback',
        fallbackReason: reasonTag,
        documentTitle: docTitle,
        vocabularyUsage: true,
        incorrectIndex: incorrectIndex + 1,
        incorrectSnippet: incorrectText,
        optionReasons,
        optionStatuses: orderedSegments.map((_, idx) => (idx === incorrectIndex ? 'incorrect' : 'correct')),
        underlinedSegments: orderedSegments.map((segment) => segment.text),
        lexicalNote: {
          targetWord: incorrectText,
          partOfSpeech: mapPos(chosen.part),
          correction: correctionWord,
          meaning: glossKorean || gloss || '문맥과 맞지 않는 어휘입니다.',
          reason: glossDisplay
        },
        correction: {
          replacement: correctionWord,
          reason: glossKorean
            ? `${incorrectText}는 ${glossKorean}라 부적절하므로 ${correctionWord}로 바꿔야 합니다.`
            : gloss
            ? `${incorrectText}는 ${gloss} 의미라 부적절하므로 ${correctionWord}로 바꿔야 합니다.`
            : `${incorrectText} 대신 ${correctionWord}를 사용해야 자연스럽습니다.`
        }
      };

      return {
        id: `vocab_doc_fallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'vocabulary',
        question: '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
        mainText: updatedText,
        text: updatedText,
        options,
        answer: answerValue,
        correctAnswer: answerValue,
        explanation: explanationSentences.join(' '),
        difficulty: 'csat-advanced',
        metadata,
        sourceLabel: docTitle ? `출처│${docTitle}` : '출처│업로드 문서'
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[doc-fallback] vocabulary generation failed for', targetWord, error?.message || error);
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
  buildVocabularyFallbackProblems,
  // Exposed for tests so we can verify Korean gloss conversion logic.
  translateGlossToKorean,
  warmupWordnet,
  formatSourceLabel,
  __wordnetTest: {
    lookupWordnet
  }
};
