'use strict';

const SOURCE_PREFIX_REGEX = /^\s*(?:\ucd9c\ucc98|Source)\s*[:\u2502-]?\s*/iu;
const UNDERLINE_PATTERN = /<u[\s\S]*?<\/u>/gi;
const CIRCLED_DIGITS = ['\u2460', '\u2461', '\u2462', '\u2463', '\u2464'];

function containsHangul(text = '') {
  return /[가-힣]/.test(String(text));
}

function stripTags(text = '') {
  return String(text).replace(/<[^>]+>/g, '');
}

function normalizeWhitespace(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function escapeRegex(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripJsonFences(text) {
  if (!text) return '';
  return String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
}

function clipText(text, limit = 1800) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)} \u2026`;
}

function normalizeQuestionKey(text = '') {
  return String(text || '')
    .normalize('NFC')
    .replace(/[\s\u00A0\u2028\u2029]/g, '')
    .replace(/[\u3002\uFF1F\uFF01\uFF0E\uFF1A\uFF1B\uFF0C\uFF0F.,?:;!]/g, '')
    .trim();
}

function countSentences(text = '') {
  return (String(text || '').match(/[.!?](?=\s|$)/g) || []).length;
}

const NUMBER_WORDS_UNDER_20 = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen'
];

const TENS_WORDS = {
  20: 'twenty',
  30: 'thirty',
  40: 'forty',
  50: 'fifty',
  60: 'sixty',
  70: 'seventy',
  80: 'eighty',
  90: 'ninety'
};

function spellOutNumber(num) {
  if (!Number.isFinite(num) || num < 0 || num > 999) return null;
  if (num < NUMBER_WORDS_UNDER_20.length) return NUMBER_WORDS_UNDER_20[num];
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const remainder = num % 10;
    return remainder === 0
      ? TENS_WORDS[tens]
      : `${TENS_WORDS[tens]}-${NUMBER_WORDS_UNDER_20[remainder]}`;
  }
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const hundredPart = `${NUMBER_WORDS_UNDER_20[hundreds]} hundred`;
  if (remainder === 0) return hundredPart;
  const remainderText = spellOutNumber(remainder);
  return remainderText ? `${hundredPart} ${remainderText}` : hundredPart;
}

function replaceDigitsWithWords(text = '') {
  return String(text || '').replace(/\d+/g, (match) => {
    const num = parseInt(match, 10);
    const word = spellOutNumber(num);
    return word || match;
  });
}

function countWords(text = '') {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isEnglishPhrase(text = '') {
  const cleaned = String(text || '')
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
  if (!cleaned) return false;
  return /^[A-Za-z][A-Za-z\s.,'"()\-]*$/.test(cleaned);
}

function labelToIndex(label, fallback, digits = CIRCLED_DIGITS) {
  if (label === null || label === undefined) return fallback;
  if (typeof label === 'number' && Number.isInteger(label)) {
    const idx = label - 1;
    return idx >= 0 && idx < digits.length ? idx : fallback;
  }
  const str = String(label).trim();
  if (!str) return fallback;
  const circledIdx = digits.indexOf(str);
  if (circledIdx !== -1) return circledIdx;
  if (/^[1-5]$/.test(str)) {
    const idx = parseInt(str, 10) - 1;
    return idx >= 0 && idx < digits.length ? idx : fallback;
  }
  if (/^[A-Ea-e]$/.test(str)) {
    const idx = str.toUpperCase().charCodeAt(0) - 65;
    return idx >= 0 && idx < digits.length ? idx : fallback;
  }
  const match = str.match(/(①|②|③|④|⑤)/);
  if (match) {
    const idx = digits.indexOf(match[1]);
    if (idx !== -1) return idx;
  }
  return fallback;
}

function isPlaceholderSourceLabel(label = '') {
  const clean = String(label || '').trim();
  if (!clean) return true;
  const normalized = clean
    .replace(/^[\u2502|]?\s*/, '')
    .replace(/^(?:출처|기관)\s*[\u2502|:~-]?\s*/iu, '')
    .trim();
  if (!normalized) return true;
  const placeholders = [
    /기관\s*연도\s*회차/iu,
    /pxx/iu,
    /sample/iu,
    /예시/iu,
    /기본 값/iu,
    /default/iu
  ];
  return placeholders.some((pattern) => pattern.test(normalized));
}

function ensureSourceLabel(raw, context = {}) {
  const value = String(raw || '').trim();
  const docTitle = String((context && context.docTitle) || '').trim();
  if (value) {
    const normalized = value.replace(SOURCE_PREFIX_REGEX, '출처│').trim();
    const labelBody = normalized.replace(/^출처│/iu, '').trim();
    if (labelBody && !isPlaceholderSourceLabel(labelBody)) {
      return normalized.startsWith('출처│') ? normalized : `출처│${normalized}`;
    }
  }
  return docTitle ? `출처│${docTitle}` : '출처│LoE Source';
}

module.exports = {
  CIRCLED_DIGITS,
  SOURCE_PREFIX_REGEX,
  UNDERLINE_PATTERN,
  containsHangul,
  stripTags,
  normalizeWhitespace,
  escapeRegex,
  stripJsonFences,
  clipText,
  normalizeQuestionKey,
  countSentences,
  replaceDigitsWithWords,
  countWords,
  isEnglishPhrase,
  labelToIndex,
  ensureSourceLabel,
  isPlaceholderSourceLabel
};
