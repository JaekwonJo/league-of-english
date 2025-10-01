'use strict';

const {
  CIRCLED_DIGITS,
  UNDERLINE_PATTERN,
  normalizeWhitespace,
  stripTags,
  escapeRegex,
  labelToIndex
} = require('./shared');
const { CIRCLED_DIGITS: GRAMMAR_DIGITS } = require('../../utils/eobeopTemplate');

function normalizeOptionStatus(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') {
    return value ? 'correct' : 'incorrect';
  }
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (/^(?:correct|right|valid|ok|answer|정답|적절)/.test(text)) return 'correct';
  if (/incorrect|wrong|error|fault|trap|오답|어색|부적절/.test(text)) return 'incorrect';
  if (/distractor|함정/.test(text)) return 'incorrect';
  return null;
}

function normalizeUnderlinedOptions(rawOptions = [], failureReasons = null) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    throw new Error('underlined options missing');
  }

  const size = CIRCLED_DIGITS.length;
  const formatted = new Array(size).fill(null);
  const rawTexts = new Array(size).fill(null);
  const reasonMap = {};
  const tagMap = {};
  const statusList = new Array(size).fill(null);
  const available = new Set(Array.from({ length: size }, (_, i) => i));

  rawOptions.forEach((entry, rawIndex) => {
    let label;
    let rawText = '';
    let reason;
    let tag;
    let status = null;

    if (typeof entry === 'string') {
      rawText = entry.trim();
      const prefix = rawText.slice(0, 1);
      if (CIRCLED_DIGITS.includes(prefix)) {
        label = prefix;
        rawText = rawText.slice(1).trim();
      }
    } else if (entry && typeof entry === 'object') {
      label = entry.label || entry.symbol || entry.id || entry.choice || entry.option || entry.key;
      rawText = entry.text || entry.value || entry.segment || entry.snippet || entry.option || '';
      reason = entry.reason || entry.rationale || entry.comment || entry.explanation || entry.note;
      tag = entry.errorType || entry.trapType || entry.tag || entry.defect || entry.category || entry.grammarPoint || entry.vocabPoint;
      status = normalizeOptionStatus(entry.status || entry.role || entry.kind || entry.correctness);
      if (status === null && Object.prototype.hasOwnProperty.call(entry, 'isCorrect')) {
        status = entry.isCorrect ? 'correct' : 'incorrect';
      }
      if (status === null && Object.prototype.hasOwnProperty.call(entry, 'isWrong')) {
        status = entry.isWrong ? 'incorrect' : 'correct';
      }
      if (!rawText && entry.underlined) {
        rawText = `<u>${String(entry.underlined).trim()}</u>`;
      }
      if ((!rawText || !/<u[\s\S]*?<\/u>/i.test(String(rawText))) && entry.snippet) {
        const snippet = String(entry.snippet).trim();
        if (snippet) {
          rawText = `<u>${snippet}</u>`;
        }
      }
      if ((!rawText || !/<u[\s\S]*?<\/u>/i.test(String(rawText))) && entry.segment) {
        const segment = String(entry.segment).trim();
        if (segment) {
          rawText = `<u>${segment}</u>`;
        }
      }
    } else {
      throw new Error('underlined options contain invalid entry');
    }

    let index = labelToIndex(label, undefined);
    if (index === undefined || !available.has(index)) {
      index = available.size ? Math.min(...available) : rawIndex;
    }
    if (!available.has(index)) {
      throw new Error('duplicate option labels detected');
    }
    available.delete(index);

    let clean = String(rawText || '')
      .replace(/^[\u2460-\u2468]\s*/, '')
      .trim();

    if (!clean) {
      throw new Error(`option ${index + 1} missing text`);
    }

    const numericEnumerator = clean.match(/^\s*\(?\d{1,2}\s*[\).:-]\s+/);
    if (numericEnumerator) {
      clean = clean.slice(numericEnumerator[0].length).trim();
    }
    const circledEnumerator = clean.match(/^\s*[\u2460-\u2468]\s+/);
    if (circledEnumerator) {
      clean = clean.slice(circledEnumerator[0].length).trim();
    }
    const letterEnumerator = clean.match(/^\s*(?:\(?\s*[A-E]\s*[\).:-])\s+/i);
    if (letterEnumerator) {
      clean = clean.slice(letterEnumerator[0].length).trim();
    }
    const letterBeforeUnderline = clean.match(/^\s*(?:\(?\s*[A-E]\s+)(?=<u>)/i);
    if (letterBeforeUnderline) {
      clean = clean.slice(letterBeforeUnderline[0].length).trim();
    }

    if (!/<u[\s\S]*?<\/u>/.test(clean)) {
      if (failureReasons) {
        failureReasons.push(`옵션 ${index + 1}에 밑줄 구간이 없습니다.`);
      }
      throw new Error(`option ${index + 1} missing underline`);
    }

    const underlineMatches = clean.match(/<u[\s\S]*?<\/u>/gi) || [];
    if (underlineMatches.length !== 1) {
      throw new Error(`option ${index + 1} must contain exactly one underlined span`);
    }

    const circled = CIRCLED_DIGITS[index];
    formatted[index] = `${circled} ${clean}`;
    rawTexts[index] = clean;
    if (reason) {
      reasonMap[circled] = String(reason).trim();
    }
    if (tag) {
      tagMap[circled] = String(tag).trim();
    }
    statusList[index] = status;
  });

  if (formatted.some((value) => !value)) {
    throw new Error('underlined options must contain 5 entries');
  }

  return {
    formatted,
    rawTexts,
    reasons: reasonMap,
    tags: tagMap,
    statuses: statusList
  };
}

function extractOptionUnderlines(options = [], failureReasons = null) {
  if (!Array.isArray(options)) return [];
  const segments = [];
  for (let i = 0; i < options.length; i += 1) {
    const text = typeof options[i] === 'string' ? options[i] : '';
    const match = text.match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
    if (!match || !match[1]) {
      if (failureReasons) {
        failureReasons.push(`옵션 ${i + 1}에 밑줄 구간이 없음`);
      }
      return [];
    }
    segments.push(match[1]);
  }
  return segments;
}

const HYPHEN_VARIANTS = ['-', '\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2212'];
const HYPHEN_VARIANT_SET = new Set(HYPHEN_VARIANTS);
const IGNORED_NORMALIZATION_CHARS = new Set([
  ',', '.', '!', '?', ';', ':', '"', "'", '\u2018', '\u2019', '\u201c', '\u201d', '\u2026',
  '\u00a0', '\n', '\r', '\t', '\f', '\v'
]);

['\n', '\r', '\t', '\f', '\v'].forEach((ch) => IGNORED_NORMALIZATION_CHARS.add(ch));


function isAlphabetic(char) {
  return /^[A-Za-z]$/.test(char || '');
}

function rangeOverlaps(used, start, end) {
  if (!used) return false;
  for (let i = start; i < end; i += 1) {
    if (used[i]) return true;
  }
  return false;
}

function markRangeUsed(used, start, end) {
  if (!used) return;
  for (let i = start; i < end; i += 1) {
    used[i] = true;
  }
}

function expandToWordBoundaries(plain, start, end) {
  let newStart = start;
  let newEnd = end;
  while (newStart > 0 && isAlphabetic(plain[newStart - 1]) && isAlphabetic(plain[newStart])) {
    newStart -= 1;
  }
  while (newEnd < plain.length && isAlphabetic(plain[newEnd - 1]) && isAlphabetic(plain[newEnd])) {
    newEnd += 1;
  }
  return { start: newStart, end: newEnd };
}

function buildNormalizedMap(text) {
  const chars = [];
  const map = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (/\s/.test(ch)) continue;
    if (HYPHEN_VARIANT_SET.has(ch)) continue;
    if (IGNORED_NORMALIZATION_CHARS.has(ch)) continue;
    chars.push(ch.toLowerCase());
    map.push(i);
  }
  return {
    text: chars.join(''),
    map
  };
}

function findNormalizedMatch(normalized, segment, startOffset, allowSuffix = false) {
  const { text } = normalized;
  let offset = startOffset;
  while (offset <= text.length - segment.length) {
    const idx = text.indexOf(segment, offset);
    if (idx === -1) break;
    return { index: idx, length: segment.length };
  }
  if (!allowSuffix) {
    return { index: -1, length: 0 };
  }
  const suffixPattern = new RegExp(`${escapeRegex(segment)}[a-z]{1,3}`, 'i');
  const slice = text.slice(startOffset);
  const match = slice.match(suffixPattern);
  if (!match || typeof match.index !== 'number') {
    return { index: -1, length: 0 };
  }
  return {
    index: startOffset + match.index,
    length: match[0].length
  };
}

function locateSegmentRange({
  plain,
  normalized,
  normalizedCursor,
  rawSegment,
  used,
  failureReasons
}) {
  const cleaned = normalizeWhitespace(stripTags(rawSegment || ''));
  if (!cleaned) {
    if (failureReasons) failureReasons.push('옵션 밑줄이 비어 있음');
    return null;
  }

  const punctuationTrimmed = cleaned.replace(/[.,;:!?"']+$/u, '').trim();
  const candidateSegments = [cleaned];
  if (punctuationTrimmed && punctuationTrimmed !== cleaned) {
    candidateSegments.push(punctuationTrimmed);
  }

  const normalizedSegments = candidateSegments
    .map((candidate) => ({
      original: candidate,
      normalized: candidate
        .replace(/[\s]+/g, '')
        .replace(new RegExp(`[${HYPHEN_VARIANTS.join('')}]`, 'g'), '')
        .toLowerCase()
    }))
    .filter((item) => item.normalized.length > 0);

  if (!normalizedSegments.length) {
    if (failureReasons) failureReasons.push(`본문에서 "${cleaned}" 위치를 찾을 수 없음`);
    return null;
  }

  const searchOffsets = [normalizedCursor.current, 0];

  for (const segment of normalizedSegments) {
    const allowSuffix = segment.normalized.length >= 4;
    for (const baseOffset of searchOffsets) {
      let offset = baseOffset;
      while (offset <= normalized.text.length - segment.normalized.length) {
        const { index, length } = findNormalizedMatch(normalized, segment.normalized, offset, allowSuffix);
        if (index === -1) {
          break;
        }

        const plainStart = normalized.map[index];
        const plainEnd = normalized.map[index + length - 1] + 1;
        const expanded = expandToWordBoundaries(plain, plainStart, plainEnd);

        if (rangeOverlaps(used, expanded.start, expanded.end)) {
          offset = index + 1;
          continue;
        }

        markRangeUsed(used, expanded.start, expanded.end);
        normalizedCursor.current = Math.max(normalizedCursor.current, index + length);
        return {
          start: expanded.start,
          end: expanded.end
        };
      }
    }
  }

  const fallbackRange = fallbackLocateByWords({ plain, rawSegment: cleaned, used });
  if (fallbackRange) {
    markRangeUsed(used, fallbackRange.start, fallbackRange.end);
    if (failureReasons) {
      failureReasons.push(`정확 일치 실패 → fallback 으로 "${cleaned}" 근접 구간 매칭`);
    }
    return fallbackRange;
  }

  if (failureReasons) {
    failureReasons.push(`본문에서 "${cleaned}" 위치를 찾을 수 없음`);
  }
  return null;
}

function fallbackLocateByWords({ plain, rawSegment, used }) {
  if (!plain || !rawSegment) return null;
  const words = rawSegment
    .split(/\s+/)
    .map((word) => word.replace(/["'.,!?;:]+$/g, '').trim())
    .filter(Boolean);
  if (!words.length) return null;

  const plainLower = plain.toLowerCase();

  const maxWindow = Math.min(words.length, 6);
  for (let windowSize = maxWindow; windowSize >= Math.min(2, maxWindow); windowSize -= 1) {
    for (let start = 0; start <= words.length - windowSize; start += 1) {
      const piece = words.slice(start, start + windowSize).join(' ');
      if (!piece) continue;
      const pieceLower = piece.toLowerCase();
      let searchIndex = 0;
      while (searchIndex <= plainLower.length - pieceLower.length) {
        const idx = plainLower.indexOf(pieceLower, searchIndex);
        if (idx === -1) break;
        const startIdx = idx;
        const endIdx = idx + pieceLower.length;
        const expanded = expandToWordBoundaries(plain, startIdx, endIdx);
        if (!rangeOverlaps(used, expanded.start, expanded.end)) {
          return expanded;
        }
        searchIndex = idx + 1;
      }
    }
  }
  return null;
}

function rebuildUnderlinesFromOptions(mainText, options = [], failureReasons = null) {
  if (!mainText) return null;
  const segments = extractOptionUnderlines(options, failureReasons);
  if (segments.length !== 5) return null;

  const plain = String(mainText).replace(/<\/?u[^>]*>/gi, '');
  const normalized = buildNormalizedMap(plain);
  const normalizedCursor = { current: 0 };
  const used = new Array(plain.length).fill(false);
  const ranges = [];

  for (let i = 0; i < segments.length; i += 1) {
    const range = locateSegmentRange({
      plain,
      normalized,
      normalizedCursor,
      rawSegment: segments[i],
      used,
      failureReasons
    });
    if (!range) {
      return null;
    }
    ranges.push(range);
  }

  const sorted = ranges
    .map((range, index) => ({ ...range, index }))
    .sort((a, b) => a.start - b.start);

  const rebuiltParts = [];
  let cursor = 0;
  for (const item of sorted) {
    rebuiltParts.push(plain.slice(cursor, item.start));
    rebuiltParts.push(`<u>${plain.slice(item.start, item.end)}</u>`);
    cursor = item.end;
  }
  rebuiltParts.push(plain.slice(cursor));

  const rebuilt = rebuiltParts.join('');
  const rebuiltCount = (rebuilt.match(UNDERLINE_PATTERN) || []).length;
  if (rebuiltCount !== 5) {
    if (failureReasons) failureReasons.push(`복원 후에도 밑줄이 ${rebuiltCount}개`);
    return null;
  }

  const updatedOptions = ranges.map((range, index) => {
    const snippet = plain.slice(range.start, range.end);
    return `${GRAMMAR_DIGITS[index]} <u>${snippet}</u>`;
  });

  return {
    mainText: rebuilt,
    options: updatedOptions
  };
}

module.exports = {
  normalizeOptionStatus,
  normalizeUnderlinedOptions,
  rebuildUnderlinesFromOptions
};
