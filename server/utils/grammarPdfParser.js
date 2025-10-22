const { CIRCLED_DIGITS } = require('../services/ai-problem/shared');

const END_SENTENCE_PATTERN = /[.!?]/;
const FOOTER_PATTERNS = [
  /^202\d년도\s*\d+월\s*.*모의고사$/,
  /^-\s*\d+\s*-$/,
  /^진진영어$/
];

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function shouldDropLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^\d+\.$/.test(trimmed)) return true;
  if (/^\[조건\]/.test(trimmed)) return true;
  if (/^\[보기\]/.test(trimmed)) return true;
  if (/^다음 글/.test(trimmed)) return true;
  return FOOTER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function splitProblemBlocks(rawText) {
  const sanitized = rawText.replace(/\r/g, '').replace(/\u00a0/g, ' ');
  const lines = sanitized.split('\n');
  const blocks = [];
  let current = [];

  const hasMarker = (entries) => entries.some((entry) => /\[[0-9]+\]/.test(entry));

  for (const line of lines) {
    const normalized = line.replace(/\u00a0/g, ' ');
    const trimmed = normalized.trim();
    if (!trimmed) continue;

    if (/^202\d년도/.test(trimmed) || /^진진영어$/.test(trimmed) || /^-\s*\d+\s*-$/.test(trimmed)) {
      if (!hasMarker(current)) {
        current = [];
      }
      continue;
    }

    const questionStart = /^다음 글/.test(trimmed);
    const lineHasMarker = /\[[0-9]+\]/.test(trimmed);

    if ((questionStart || lineHasMarker) && hasMarker(current)) {
      blocks.push(current);
      current = [];
    }

    if (questionStart && !lineHasMarker && current.length && !hasMarker(current)) {
      current = [];
    }

    current.push(normalized);
  }

  if (current.length) {
    blocks.push(current);
  }

  const normalizedBlocks = blocks.map((blockLines) => (
    blockLines
      .filter((line) => !FOOTER_PATTERNS.some((pattern) => pattern.test(line.trim())))
      .join('\n')
      .trim()
  ));

  return normalizedBlocks.filter((block) => /\[[0-9]+\]/.test(block));
}

function extractCoreSegment(segmentRaw) {
  if (!segmentRaw) {
    throw new Error('empty segment');
  }

  let index = 0;
  while (index < segmentRaw.length && /\s/.test(segmentRaw[index])) {
    index += 1;
  }

  let endIndex = segmentRaw.length;
  for (let i = index; i < segmentRaw.length; i += 1) {
    if (END_SENTENCE_PATTERN.test(segmentRaw[i])) {
      endIndex = i + 1;
      break;
    }
  }

  const core = segmentRaw.slice(index, endIndex).trim();
  const remainder = segmentRaw.slice(endIndex);

  if (!core) {
    throw new Error(`unable to extract core from segment: ${segmentRaw.slice(0, 60)}`);
  }

  return { core, remainder, leadingOffset: index };
}

function buildUnderlinedPassage(rawPassage) {
  const markerRegex = /[①②③④⑤]/g;
  const markers = [];
  let match;
  while ((match = markerRegex.exec(rawPassage)) !== null) {
    markers.push({ index: match.index });
  }
  if (markers.length !== 5) {
    throw new Error(`expected 5 markers but found ${markers.length}`);
  }

  let rebuilt = '';
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < markers.length; i += 1) {
    const { index } = markers[i];
    const nextIndex = i + 1 < markers.length ? markers[i + 1].index : rawPassage.length;
    rebuilt += rawPassage.slice(cursor, index);

    const segmentRaw = rawPassage.slice(index + 1, nextIndex);
    const leadingSpacesMatch = segmentRaw.match(/^\s*/);
    const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0] : '';
    const { core, remainder } = extractCoreSegment(segmentRaw);

    rebuilt += `${leadingSpaces}<u>${core}</u>${remainder}`;
    segments.push(core);
    cursor = nextIndex;
  }

  rebuilt += rawPassage.slice(cursor);

  const underlineMatches = rebuilt.match(/<u>[\s\S]*?<\/u>/g) || [];
  if (underlineMatches.length !== 5) {
    throw new Error(`expected 5 underlined segments but found ${underlineMatches.length}`);
  }

  const options = underlineMatches.map((segment, idx) => `${CIRCLED_DIGITS[idx]} ${segment}`);
  return {
    rebuiltText: rebuilt.trim(),
    options
  };
}

function cleanBodyLines(lines) {
  const filtered = [];
  for (const line of lines) {
    if (shouldDropLine(line)) continue;
    filtered.push(line.replace(/\u00a0/g, ' '));
  }
  return filtered.join('\n');
}

function parseAnswerEntries(rawText) {
  if (!rawText) return [];
  const sanitized = rawText.replace(/\r/g, '').replace(/\u00a0/g, ' ');
  const lines = sanitized.split('\n');
  const entries = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^(\d+) 번 -\s*(.+)$/);
    if (match) {
      if (current) {
        entries.push(current);
      }
      current = { number: parseInt(match[1], 10), text: match[2].trim() };
    } else if (current) {
      current.text += ` ${line}`;
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries.map((entry) => {
    const normalized = entry.text.replace(/\s+/g, ' ').trim();
    const prefixMatch = normalized.match(/^([①②③④⑤0-9](?:\s*,\s*[①②③④⑤0-9])*)/);
    let answerSegment = '';
    let remainderText = normalized;
    if (prefixMatch) {
      answerSegment = prefixMatch[1];
      remainderText = normalized.slice(answerSegment.length).trim();
    } else {
      let answerMatch = normalized.match(/^([①②③④⑤0-9,\s]+?)\s{2,}(.*)$/);
      if (!answerMatch) {
        answerMatch = normalized.match(/^([①②③④⑤0-9,\s]+)\s+(.*)$/);
      }
      if (!answerMatch) {
        return {
          number: entry.number,
          markers: [],
          explanation: normalized
        };
      }
      answerSegment = answerMatch[1];
      remainderText = answerMatch[2].trim();
    }
    const answerPart = answerSegment
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        if (/^[1-5]$/.test(token)) {
          const index = parseInt(token, 10) - 1;
          return CIRCLED_DIGITS[index] || token;
        }
        return token;
      })
      .filter((token) => CIRCLED_DIGITS.includes(token));
    const explanation = remainderText;
    return {
      number: entry.number,
      markers: answerPart,
      explanation
    };
  });
}

function parseProblemBlocks(rawText) {
  const blocks = splitProblemBlocks(rawText);
  return blocks.map((block, idx) => {
    const lines = block.split('\n');
    const promptParts = [];
    let bodyStartIndex = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const segment = lines[i].trim();
      if (!segment) continue;
      promptParts.push(segment);
      if (/\[[0-9]+\]/.test(segment)) {
        bodyStartIndex = i + 1;
        break;
      }
    }

    const promptLine = promptParts.join(' ').trim();
    const bodyLines = lines.slice(bodyStartIndex);
    const body = cleanBodyLines(bodyLines);
    const markerCount = (body.match(/[①②③④⑤]/g) || []).length;
    return {
      index: idx,
      raw: block,
      promptLine,
      body,
      markerCount
    };
  });
}

function buildGrammarDataset({
  problemText,
  answerText,
  docTitle = '2022년 9월 고2 모의고사',
  idPrefix = 'wolgo-2022-09-grammar',
  sourceLabelBase = '2022년 9월 고2 모의고사'
}) {
  const questions = parseProblemBlocks(problemText);
  const answers = parseAnswerEntries(answerText);
  const dataset = [];

  let answerCursor = 0;

  for (const question of questions) {
    const currentAnswer = answers[answerCursor] || null;
    answerCursor += 1;

    if (question.markerCount !== 5) {
      continue;
    }

    if (/\[조건\]/.test(question.body) || /\[보기\]/.test(question.body)) {
      continue;
    }

    if (!currentAnswer || !currentAnswer.markers.length) {
      continue;
    }

    const { rebuiltText, options } = buildUnderlinedPassage(question.body);
    const markerIndices = currentAnswer.markers
      .map((marker) => CIRCLED_DIGITS.indexOf(marker))
      .filter((index) => index >= 0)
      .map((index) => index + 1);

    if (!markerIndices.length) {
      continue;
    }

    const bracketMatch = question.promptLine.match(/\[(\d+)\]\s*$/);
    const sourceNumber = bracketMatch ? parseInt(bracketMatch[1], 10) : question.index + 1;
    let questionText = question.promptLine.replace(/\s*\[(\d+)\]\s*$/, '').trim();
    questionText = questionText.replace(/시\s+오\./g, '시오.');

    const type = markerIndices.length > 1 ? 'grammar_multi' : 'grammar';
    const answerValue = markerIndices.join(',');

    dataset.push({
      id: `${idPrefix}-${String(sourceNumber).padStart(2, '0')}`,
      type,
      question: questionText,
      questionVariant: type === 'grammar_multi' ? 'multi' : 'single',
      mainText: rebuiltText,
      options,
      answers: markerIndices,
      answerMarkers: currentAnswer.markers,
      answer: answerValue,
      correctAnswer: answerValue,
      explanation: normalizeSpaces(currentAnswer.explanation),
      docTitle,
      sourceLabel: `출처│${sourceLabelBase} no${String(dataset.length + 1)}`,
      grammarPoint: '기출 어법'
    });
  }

  return dataset;
}

module.exports = {
  splitProblemBlocks,
  parseAnswerEntries,
  buildUnderlinedPassage,
  buildGrammarDataset
};
