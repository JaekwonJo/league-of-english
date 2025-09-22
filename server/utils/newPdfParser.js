const HANGUL_REGEX = /[\u3131-\uD79D]/;
const BANNER_REGEXES = [
  /^고\d.+/i,
  /^Q\./i,
  /^본문해석지/i,
  /읽기영역/,
  /^Reading\s+(?:Passage|Comprehension)/i,
  /^\d+\s*page$/i,
  /^-\s*\d+\s*-$/
];

const PROBLEM_HEADING_REGEX = /^\d+\.\s*p[\w~-]+(?:-?no\.?\d+)?/i;
const DAY_REGEX = /^Day\s+\d+/i;
const WINDOW_SIZE = 5;
const MIN_SENTENCES_REQUIRED = 5;
const CONNECTOR_WORDS = [
  'and',
  'but',
  'because',
  'however',
  'therefore',
  'nonetheless',
  'nevertheless',
  'furthermore',
  'moreover',
  'additionally',
  'yet',
  'so',
  'still',
  'then',
  'thus',
  'this',
  'these',
  'those'
];

const PRIORITY_WORDS = [
  'thus',
  'therefore',
  'because',
  'this',
  'these',
  'those',
  'however',
  'but',
  'and',
  'so',
  'yet',
  'still',
  'then',
  'furthermore',
  'moreover',
  'additionally',
  'nonetheless',
  'nevertheless'
];

class NewPDFParser {
  constructor() {
    this.debugMode = false;
  }

  normalize(rawText) {
    if (!rawText) return '';
    return String(rawText)
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/-\n(?=[a-z])/gi, '')
      .replace(/[\t ]+/g, (match) => (match.includes('\n') ? match : ' '))
      .trim();
  }

  parseStructured(lines) {
    const passages = [];
    const sources = [];
    const sentenceMap = [];

    let currentHeading = null;
    let currentLines = [];

    const flushCurrent = () => {
      if (!currentHeading || !currentLines.length) {
        currentHeading = null;
        currentLines = [];
        return;
      }

      const passageText = currentLines.join(' ').replace(/\s+/g, ' ').trim();
      if (passageText) {
        passages.push(passageText);
        sources.push(currentHeading);
        sentenceMap.push(this.splitSentences(passageText));
      }

      currentHeading = null;
      currentLines = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.replace(/\f/g, '').trim();

      if (!line) {
        continue;
      }

      if (PROBLEM_HEADING_REGEX.test(line)) {
        flushCurrent();
        currentHeading = line;
        continue;
      }

      if (!currentHeading) continue;

      const cleaned = rawLine.replace(/\s+/g, ' ').trim();
      if (cleaned) currentLines.push(cleaned);
    }

    flushCurrent();

    return { passages, sources, sentenceMap };
  }

  parseUnstructured(lines) {
    const passages = [];
    const sources = [];

    let currentDay = null;
    let current = null;

    const flushCurrent = () => {
      if (!current || !current.lines.length) return;
      const text = this.buildPassageText(current.lines);
      if (!text) return;
      passages.push(text);
      const labelParts = [];
      if (current.day) labelParts.push(current.day);
      if (current.heading) labelParts.push(current.heading);
      const label = labelParts.join(' - ') || current.heading || `Passage ${passages.length}`;
      sources.push(label);
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (this.isDayHeader(line)) {
        flushCurrent();
        currentDay = line;
        continue;
      }

      if (this.isHeading(line)) {
        flushCurrent();
        current = {
          day: currentDay,
          heading: line,
          lines: []
        };
        continue;
      }

      if (this.shouldSkipLine(line)) continue;

      if (!current) {
        current = {
          day: currentDay,
          heading: null,
          lines: []
        };
      }

      current.lines.push(line);
    }

    flushCurrent();

    return { passages, sources };
  }

  isDayHeader(line) {
    return DAY_REGEX.test(line);
  }

  isHeading(line) {
    return PROBLEM_HEADING_REGEX.test(line);
  }

  shouldSkipLine(line) {
    if (!line) return true;
    if (BANNER_REGEXES.some((regex) => regex.test(line))) return true;
    if (HANGUL_REGEX.test(line)) return true;
    return false;
  }

  buildPassageText(lines) {
    if (!lines.length) return '';
    let text = lines
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;!?])/g, '$1')
      .replace(/([\(\[])\s+/g, '$1')
      .replace(/\s+([)\]])/g, '$1')
      .replace(/\s+'\s+/g, " '");
    return text.trim();
  }

  extractTitleFromSources(sources, passages) {
    if (sources && sources.length) {
      const candidate = sources[0];
      if (candidate) return candidate.slice(0, 120);
    }
    if (passages && passages.length) {
      return passages[0].slice(0, 120) || 'Document';
    }
    return 'Document';
  }

  splitSentences(text) {
    if (!text) return [];
    return text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  fallbackBlocks(normalized) {
    return normalized
      .split(/\n{2,}/)
      .map((block) => block.replace(/\s+/g, ' ').trim())
      .filter((block) => block.length > 0 && !HANGUL_REGEX.test(block));
  }

  static startsWithConnector(sentence) {
    return CONNECTOR_WORDS.some((word) => sentence.startsWith(`${word} `) || sentence.startsWith(`${word},`));
  }

  static getPriorityScore(sentence) {
    for (let i = 0; i < PRIORITY_WORDS.length; i++) {
      if (sentence.startsWith(`${PRIORITY_WORDS[i]} `) || sentence.startsWith(`${PRIORITY_WORDS[i]},`)) {
        return PRIORITY_WORDS.length - i;
      }
    }
    return 0;
  }

  selectGapIndex(sentences) {
    const total = sentences.length;
    const candidates = sentences
      .map((sentence, index) => ({ sentence: sentence.trim().toLowerCase(), index }))
      .filter(({ sentence, index }) => index > 0 && index < total - 1 && NewPDFParser.startsWithConnector(sentence))
      .map(({ index }) => index);

    if (candidates.length) {
      const bestCandidate = candidates.reduce((best, index) => {
        const sentence = sentences[index].trim().toLowerCase();
        const priority = NewPDFParser.getPriorityScore(sentence);
        const distance = Math.min(index, total - 1 - index);
        const score = priority * 100 + distance;

        if (!best || score > best.score) {
          return { index, score };
        }
        return best;
      }, null);
      return bestCandidate ? bestCandidate.index : candidates[0];
    }

    if (total <= MIN_SENTENCES_REQUIRED) {
      return null;
    }

    const minIndex = 1;
    const maxIndex = total - 2;
    return Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
  }

  buildWindow(sentences, gapIndex, windowSize) {
    const total = sentences.length;
    let start = gapIndex - 2;
    let end = gapIndex + 2;

    if (start < 0) {
      end += -start;
      start = 0;
    }
    if (end > total - 1) {
      start -= end - (total - 1);
      end = total - 1;
      if (start < 0) start = 0;
    }

    let segments = sentences.slice(start, end + 1);
    let gapWithin = gapIndex - start;

    while (segments.length < windowSize) {
      if (end < total - 1) {
        end += 1;
        segments.push(sentences[end]);
      } else if (start > 0) {
        start -= 1;
        segments.unshift(sentences[start]);
        gapWithin += 1;
      } else {
        segments.push('');
      }
    }

    if (segments.length > windowSize) {
      const overflow = segments.splice(windowSize);
      segments[windowSize - 1] += ' ' + overflow.join(' ');
    }

    if (segments.length < windowSize) {
      return null;
    }

    return { segments, gapWithin };
  }

  createTextWithGap(segments, gapIndex) {
    let result = '';
    segments.forEach((sentence, index) => {
      const marker = String.fromCharCode(9312 + index);
      const line = index === gapIndex ? marker : `${marker} ${sentence}`;
      result += index === 0 ? line : `\n${line}`;
    });
    return result;
  }

  async parse(rawText) {
    const normalized = this.normalize(rawText);
    const lines = normalized.split('\n');

    let passages = [];
    let sources = [];
    let sentenceMap = [];

    const structuredCount = lines.filter((line) => PROBLEM_HEADING_REGEX.test(line.trim())).length;

    if (structuredCount > 0) {
      const structured = this.parseStructured(lines);
      if (structured.passages.length) {
        passages = structured.passages;
        sources = structured.sources;
        sentenceMap = structured.sentenceMap;
      }
    }

    if (!passages.length) {
      const unstructured = this.parseUnstructured(lines);
      passages = unstructured.passages;
      sources = unstructured.sources;
    }

    if (!passages.length) {
      const fallback = this.fallbackBlocks(normalized);
      if (fallback.length) {
        passages.push(...fallback);
        fallback.forEach((_, idx) => sources.push(`Passage ${idx + 1}`));
      }
    }

    if (!passages.length) {
      const single = normalized.replace(/\s+/g, ' ').trim();
      if (single) {
        passages.push(single);
        sources.push('Passage 1');
      }
    }

    const title = this.extractTitleFromSources(sources, passages);

    return {
      title,
      passages,
      sources,
      totalContent: passages.join('\n\n'),
      totalPassages: passages.length,
      totalSources: sources.length,
      metadata: {
        totalPassages: passages.length,
        totalSources: sources.length,
        headings: sources,
        sentenceMap,
        extractedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = NewPDFParser;
