#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { buildGrammarDataset } = require('../server/utils/grammarPdfParser');

function normalizeQuestion(value = '') {
  return String(value || '')
    .replace(/어법상/g, '문맥상')
    .replace(/낱말의\s+쓰임/g, '낱말의 쓰임')
    .replace(/적절하지\s+않\s+은/g, '적절하지 않은')
    .replace(/\s+것은\?/g, ' 것은?')
    .trim();
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: node scripts/generate-fallback-vocabulary-from-pdf.js <pdf-path> [output-json] [doc-title] [id-prefix] [source-label]');
    process.exit(1);
  }

  const resolvedPdf = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPdf)) {
    console.error(`PDF not found: ${resolvedPdf}`);
    process.exit(1);
  }

  const outputPath = path.resolve(process.argv[3] || 'server/utils/data/fallback-vocabulary.json');
  const docTitleArg = process.argv[4];
  const idPrefixArg = process.argv[5];
  const sourceLabelArg = process.argv[6];

  const buffer = fs.readFileSync(resolvedPdf);
  const parsed = await pdfParse(buffer);
  const segments = parsed.text.split('(정답지)');
  const problemText = segments.shift() || '';
  const answerText = segments.length ? segments.join('(정답지)') : '';

  const docTitle = docTitleArg || '기출 어휘';
  const idPrefix = idPrefixArg || docTitle.replace(/\s+/g, '-');
  const sourceLabelBase = sourceLabelArg || docTitle;

  const grammarLike = buildGrammarDataset({
    problemText,
    answerText,
    docTitle,
    idPrefix: `${idPrefix}-tmp`,
    sourceLabelBase
  });

  if (!grammarLike.length) {
    console.error('No vocabulary items parsed from PDF.');
    process.exit(1);
  }

  const transformed = grammarLike.map((item, index) => ({
    id: `${idPrefix}-${String(index + 1).padStart(3, '0')}`,
    type: 'vocabulary',
    question: normalizeQuestion(item.question || ''),
    mainText: item.mainText,
    text: item.mainText,
    options: item.options,
    answer: item.answer,
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    difficulty: 'csat-advanced',
    sourceLabel: `출처│${sourceLabelBase} no${index + 1}`,
    docTitle
  }));

  fs.writeFileSync(outputPath, `${JSON.stringify(transformed, null, 2)}\n`, 'utf8');
  console.log(`Generated ${transformed.length} fallback vocabulary items -> ${outputPath}`);
}

main().catch((error) => {
  console.error('Failed to generate fallback vocabulary dataset:', error);
  process.exit(1);
});
