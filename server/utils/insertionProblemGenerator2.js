const ProblemGenerationUtils = require('./problemGenerationUtils');

const WINDOW_SIZE = 5;
const MIN_SENTENCES_REQUIRED = 5;

const CONNECTOR_WORDS = [
  'thus',
  'therefore',
  'because',
  'however',
  'moreover',
  'furthermore',
  'additionally',
  'this',
  'these',
  'those',
  'and',
  'but',
  'so',
  'yet',
  'still',
  'then'
];

const PRIORITY_ORDER = [
  'thus',
  'therefore',
  'because',
  'however',
  'moreover',
  'furthermore',
  'additionally',
  'this',
  'these',
  'those',
  'and',
  'but',
  'so',
  'yet',
  'still',
  'then'
];

class InsertionProblemGenerator {
  static generateInsertionProblems(passages, count, options = {}, document, parsedContent) {
    const problems = [];
    if (!Array.isArray(passages) || passages.length === 0) {
      return problems;
    }

    const sentenceMap = parsedContent?.metadata?.sentenceMap || [];
    const shuffledIndexes = ProblemGenerationUtils.shuffleArray([...Array(passages.length).keys()]);
    let attemptCount = 0;
    let passageIndex = 0;

    while (problems.length < count && attemptCount < passages.length * 2) {
      const sourceIndex = shuffledIndexes[passageIndex % shuffledIndexes.length];
      const passage = passages[sourceIndex];
      const precomputedSentences = Array.isArray(sentenceMap[sourceIndex]) ? sentenceMap[sourceIndex] : null;

      const problem = this.createInsertionProblem(
        passage,
        WINDOW_SIZE,
        sourceIndex + 1,
        document,
        parsedContent,
        precomputedSentences
      );

      if (problem) {
        problems.push(problem);
      }

      passageIndex++;
      attemptCount++;
    }

    return problems;
  }

  static createInsertionProblem(passage, windowSize, originalPageNumber, document, parsedContent, precomputedSentences) {
    const rawSentences = Array.isArray(precomputedSentences)
      ? precomputedSentences
      : ProblemGenerationUtils.splitSentences(passage);

    const sentences = rawSentences.map((sentence) => (sentence || '').trim()).filter(Boolean);
    if (sentences.length < MIN_SENTENCES_REQUIRED) {
      return null;
    }

    const gapIndex = this.selectGapIndex(sentences);
    if (gapIndex === null) {
      return null;
    }

    const givenSentence = sentences[gapIndex];
    if (!givenSentence) {
      return null;
    }

    const displaySentences = sentences
      .filter((_, idx) => idx !== gapIndex)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const displayLength = displaySentences.length;
    if (displayLength < MIN_SENTENCES_REQUIRED - 1) {
      return null;
    }

    const answerBoundary = Math.min(gapIndex, displayLength);
    const targetChoices = Math.max(Math.min(windowSize, displayLength + 1), 3);
    const boundarySet = new Set([answerBoundary]);

    let offset = 1;
    while (boundarySet.size < targetChoices && (answerBoundary - offset >= 0 || answerBoundary + offset <= displayLength)) {
      if (answerBoundary - offset >= 0) {
        boundarySet.add(answerBoundary - offset);
      }
      if (boundarySet.size >= targetChoices) break;
      if (answerBoundary + offset <= displayLength) {
        boundarySet.add(answerBoundary + offset);
      }
      offset++;
    }

    const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
    if (!boundaries.length) {
      return null;
    }

    const boundaryToMarker = new Map();
    boundaries.forEach((boundary, idx) => boundaryToMarker.set(boundary, `(${idx + 1})`));

    const displayLines = [];
    for (let i = 0; i <= displayLength; i++) {
      if (boundaryToMarker.has(i)) {
        displayLines.push(boundaryToMarker.get(i));
      }
      if (i < displayLength) {
        displayLines.push(displaySentences[i]);
      }
    }

    const answerIndex = boundaries.indexOf(answerBoundary);
    if (answerIndex === -1) {
      return null;
    }

    const CIRCLE_START = 9312;
    const circledText = displayLines
      .map((entry) => {
        const match = entry.match(/^(\()(\d+)(\))$/);
        if (match) {
          const num = Number(match[2]);
          if (Number.isInteger(num) && num >= 1 && num <= 20) {
            return String.fromCharCode(CIRCLE_START + num - 1);
          }
        }
        return entry;
      })
      .join('\n');

    const choices = boundaries.map((_, idx) => ({
      number: idx + 1,
      symbol: String.fromCharCode(CIRCLE_START + idx),
      value: (idx + 1).toString()
    }));

    const documentTitle = document ? document.title : 'Document';
    const sourceLabel = parsedContent?.sources?.[originalPageNumber - 1] || `page-${originalPageNumber}`;

    return {
      type: 'insertion',
      givenSentence,
      mainText: circledText,
      multipleChoices: choices,
      answer: (answerIndex + 1).toString(),
      explanation: `주어진 문장은 ${String.fromCharCode(CIRCLE_START + answerIndex)} 위치에 들어갑니다.`,
      is_ai_generated: false,
      metadata: {
        originalTitle: documentTitle,
        problemNumber: sourceLabel,
        source: sourceLabel,
        difficulty: 'basic',
        originalPageNumber,
        correctPosition: answerIndex + 1
      }
    };
  }
  static selectGapIndex(sentences) {
    const total = sentences.length;
    const candidates = sentences
      .map((sentence, index) => ({ sentence: this.normalizeSentenceStart(sentence), index }))
      .filter(({ sentence, index }) => index > 0 && index < total - 1 && this.startsWithConnector(sentence))
      .map(({ sentence, index }) => ({
        index,
        priority: this.getPriorityScore(sentence),
        distance: Math.min(index, total - 1 - index)
      }));

    if (candidates.length) {
      const best = candidates.reduce((bestCandidate, current) => {
        if (!bestCandidate) return current;
        if (current.priority > bestCandidate.priority) return current;
        if (current.priority === bestCandidate.priority && current.distance > bestCandidate.distance) return current;
        if (current.priority === bestCandidate.priority && current.distance === bestCandidate.distance && current.index > bestCandidate.index) return current;
        return bestCandidate;
      }, null);
      return best ? best.index : null;
    }

    if (total < MIN_SENTENCES_REQUIRED) {
      return null;
    }

    const mid = Math.floor(total / 2);
    return Math.min(Math.max(mid, 1), total - 2);
  }
  static buildDisplay(sentences, gapIndex, windowSize) {
    const displaySentences = sentences.filter((_, idx) => idx !== gapIndex).map((sentence) => sentence.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const displayLength = displaySentences.length;
    const answerBoundary = Math.min(gapIndex, displayLength);

    const targetChoices = Math.max(Math.min(windowSize, displayLength + 1), 3);
    const boundarySet = new Set([answerBoundary]);

    let offset = 1;
    while (boundarySet.size < targetChoices && (answerBoundary - offset >= 0 || answerBoundary + offset <= displayLength)) {
      if (answerBoundary - offset >= 0) {
        boundarySet.add(answerBoundary - offset);
      }
      if (boundarySet.size >= targetChoices) break;
      if (answerBoundary + offset <= displayLength) {
        boundarySet.add(answerBoundary + offset);
      }
      offset++;
    }

    const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
    if (!boundaries.length) {
      return null;
    }

    const boundaryToMarker = new Map();
    boundaries.forEach((boundary, idx) => {
      boundaryToMarker.set(boundary, `(${idx + 1})`);
    });

    const builder = [];
    for (let i = 0; i <= displayLength; i++) {
      if (boundaryToMarker.has(i)) {
        builder.push(boundaryToMarker.get(i));
      }
      if (i < displayLength) {
        builder.push(displaySentences[i]);
      }
    }

    const answerIndex = boundaries.indexOf(answerBoundary);
    if (answerIndex === -1) {
      return null;
    }

    const choices = boundaries.map((_, idx) => ({
      number: idx + 1,
      symbol: `(${idx + 1})`,
      value: (idx + 1).toString()
    }));

    return {
      text: builder.join('\n'),
      choices,
      answer: answerIndex + 1
    };
  }

  static normalizeSentenceStart(sentence) {
    let normalized = sentence.trim().toLowerCase();
    const removablePrefixes = ['and', 'but', 'so', 'yet', 'still', 'then'];

    while (true) {
      const parts = normalized.split(' ');
      if (parts.length < 2) break;
      const [first, second] = parts;
      if (removablePrefixes.includes(first) && CONNECTOR_WORDS.includes(second)) {
        normalized = parts.slice(1).join(' ');
        continue;
      }
      if (removablePrefixes.includes(first)) {
        normalized = parts.slice(1).join(' ');
        continue;
      }
      break;
    }

    return normalized;
  }

  static startsWithConnector(sentence) {
    return CONNECTOR_WORDS.some((word) => sentence.startsWith(`${word} `) || sentence.startsWith(`${word},`));
  }

  static getPriorityScore(sentence) {
    const index = PRIORITY_ORDER.findIndex((word) => sentence.startsWith(`${word} `) || sentence.startsWith(`${word},`));
    if (index === -1) return 0;
    return PRIORITY_ORDER.length - index;
  }
}

module.exports = InsertionProblemGenerator;
