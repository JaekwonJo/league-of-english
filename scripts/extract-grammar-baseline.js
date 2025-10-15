#!/usr/bin/env node
/**
 * Extract structured grammar problems from the Wolgo 2024 PDF so that
 * prompts and validators can rely on an authoritative baseline.
 */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'server', 'utils', 'data');
const DEFAULT_OUTPUT = path.join(DATA_DIR, 'wolgo-2024-03-grammar-baseline.json');
const SOURCE_LABEL = '2024년 3월 고2 모의고사 어법 100문제 (월고)';

const CIRCLED_TO_INDEX = {
  '①': 1,
  '②': 2,
  '③': 3,
  '④': 4,
  '⑤': 5
};

const INDEX_TO_CIRCLED = Object.fromEntries(Object.entries(CIRCLED_TO_INDEX).map(([k, v]) => [v, k]));

function parseArgs() {
  const args = process.argv.slice(2);
  let pdfPath = null;
  let outputPath = DEFAULT_OUTPUT;

  for (const arg of args) {
    if (arg.startsWith('--pdf=')) {
      pdfPath = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    } else if (!pdfPath) {
      pdfPath = arg;
    }
  }

  const candidates = [
    pdfPath,
    process.env.LOE_GRAMMAR_BASELINE_PDF,
    '/mnt/c/Users/jaekw/Documents/웹앱문서샘플/2024년월고모의고사어법샘플100문제.pdf',
    '/mnt/c/Users/jaekw/Documents/웹앱/문서샘플/2024년3월고2모의고사_어법샘플100문제.pdf'
  ].filter(Boolean);

  const resolvedPdf = candidates.find((candidate) => {
    try {
      return candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    } catch (error) {
      return false;
    }
  });

  if (!resolvedPdf) {
    throw new Error('PDF source not found. Use --pdf=<path> to provide the manual.');
  }

  const absoluteOutput = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(ROOT_DIR, outputPath);

  return { pdfPath: resolvedPdf, outputPath: absoluteOutput };
}

function normalise(text) {
  return text.replace(/\r\n?/g, '\n');
}

function sanitiseLines(block) {
  return block
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !/^\-\s*\d+\s*-$/.test(line) && line !== '진진영어')
    .join('\n')
    .trim();
}

function extractQuestionBlocks(text) {
  const blocks = [];
  const pattern = /(다음 글의 밑줄[\s\S]*?\[[0-9]+\][\s\S]*?)(?=\n\s*다음 글의 밑줄|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const cleaned = sanitiseLines(match[1]);
    if (cleaned) {
      blocks.push(cleaned);
    }
  }
  return blocks;
}

function splitPassageAndFootnotes(body) {
  const lines = body.split('\n');
  const footnotes = [];
  const passageLines = [];
  for (const line of lines) {
    if (line.trim().startsWith('*')) {
      footnotes.push(line.trim());
    } else {
      passageLines.push(line);
    }
  }
  return {
    passage: passageLines.join('\n').trim(),
    footnotes
  };
}

function parseSegments(passage) {
  const segments = [];
  const segmentRegex = /(①|②|③|④|⑤)([\s\S]*?)(?=(①|②|③|④|⑤)|$)/g;
  let match;
  while ((match = segmentRegex.exec(passage)) !== null) {
    const raw = match[2].replace(/\s+/g, ' ').trim();
    const trimmed = trimSegment(raw);
    segments.push({ label: match[1], text: trimmed, raw });
  }
  return segments;
}

function trimSegment(text) {
  if (!text) return text;
  const boundary = text.match(/(.+?)([.,!?;:])\s+[A-Za-z가-힣0-9"']/);
  if (boundary) {
    return boundary[1].trim();
  }
  return text.trim();
}

function parseQuestions(blocks) {
  return blocks.map((block, index) => {
    const headerMatch = block.match(/다음 글의 밑줄[\s\S]*?\[[0-9]+\]/);
    if (!headerMatch) {
      throw new Error(`Failed to parse header for block #${index + 1}`);
    }
    const rawHeader = headerMatch[0];
    const headerLine = rawHeader.replace(/\s+/g, ' ').trim();
    const sourceNumberMatch = headerLine.match(/\[([0-9]+)\]/);
    const sourceNumber = sourceNumberMatch ? Number(sourceNumberMatch[1]) : null;

    const body = block.slice(block.indexOf(rawHeader) + rawHeader.length).trim();
    const { passage, footnotes } = splitPassageAndFootnotes(body);
    const segments = parseSegments(passage);

    if (segments.length !== 5) {
      console.warn(`[extract-grammar-baseline] ⚠️ Question #${index + 1} has ${segments.length} segments.`);
    }

    return {
      order: index + 1,
      header: headerLine,
      sourceNumber,
      passage,
      footnotes,
      segments
    };
  });
}

function markerToIndex(marker) {
  const trimmed = marker.replace(/\s+/g, '').trim();
  if (CIRCLED_TO_INDEX[trimmed]) return CIRCLED_TO_INDEX[trimmed];
  const numeric = parseInt(trimmed, 10);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric;
  }
  throw new Error(`Unknown answer marker: ${marker}`);
}

function parseAnswers(text) {
  const answers = new Map();
  const pattern = /(\d+)\s*번\s*-\s*([①②③④⑤12345])([\s\S]*?)(?=\n\s*\d+\s*번\s*-\s*[①②③④⑤12345]|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const order = Number(match[1]);
    const answerIndex = markerToIndex(match[2]);
    const explanation = match[3]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    answers.set(order, { answerIndex, explanation });
  }
  return answers;
}

async function extract(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const parsed = await pdfParse(buffer);
  const text = normalise(parsed.text);
  const answerIndex = text.indexOf('정답지');
  if (answerIndex === -1) {
    throw new Error('Failed to locate answer section ("정답지") in PDF.');
  }

  const questionText = text.slice(0, answerIndex);
  const answerText = text.slice(answerIndex);

  const questionBlocks = extractQuestionBlocks(questionText);
  const questions = parseQuestions(questionBlocks);
  const answers = parseAnswers(answerText);

  const items = questions.map((question) => {
    const answerEntry = answers.get(question.order);
    if (!answerEntry) {
      throw new Error(`Missing answer for question #${question.order}`);
    }
    return {
      order: question.order,
      sourceNumber: question.sourceNumber,
      header: question.header,
      passage: question.passage,
      footnotes: question.footnotes,
      segments: question.segments,
      answer: answerEntry.answerIndex,
      answerMarker: INDEX_TO_CIRCLED[answerEntry.answerIndex] || String(answerEntry.answerIndex),
      explanation: answerEntry.explanation
    };
  });

  return {
    source: {
      label: SOURCE_LABEL,
      pdfPath,
      questionCount: items.length,
      extractedAt: new Date().toISOString()
    },
    items
  };
}

function writeOutput(outputPath, payload) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

(async () => {
  try {
    const { pdfPath, outputPath } = parseArgs();
    console.log('[extract-grammar-baseline] 📥 PDF:', pdfPath);
    console.log('[extract-grammar-baseline] 📤 Output:', outputPath);
    const payload = await extract(pdfPath);
    writeOutput(outputPath, payload);
    console.log(`[extract-grammar-baseline] ✅ Extracted ${payload.items.length} questions.`);
  } catch (error) {
    console.error('[extract-grammar-baseline] ❌ Error:', error.message || error);
    process.exit(1);
  }
})();
