#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const {
  buildGrammarDataset
} = require('../server/utils/grammarPdfParser');

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: node scripts/generate-fallback-grammar.js <pdf-path> [output-json] [doc-title] [id-prefix] [source-label]');
    process.exit(1);
  }
  const resolvedPdf = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPdf)) {
    console.error(`PDF not found: ${resolvedPdf}`);
    process.exit(1);
  }

  const outputPath = path.resolve(process.argv[3] || 'server/utils/data/wolgo-2022-09-grammar.json');
  const docTitleArg = process.argv[4];
  const idPrefixArg = process.argv[5];
  const sourceLabelArg = process.argv[6];

  const buffer = fs.readFileSync(resolvedPdf);
  const parsed = await pdfParse(buffer);
  const segments = parsed.text.split('(정답지)');
  const problemText = segments.shift() || '';
  const answerText = segments.length ? segments.join('(정답지)') : '';

  const docTitle = docTitleArg || '2022년 9월 고2 모의고사';
  const defaultIdPrefix = docTitleArg ? docTitleArg.replace(/\s+/g, '-') : 'wolgo-2022-09-grammar';
  const idPrefix = idPrefixArg || defaultIdPrefix;
  const sourceLabelBase = sourceLabelArg || docTitle;

  const dataset = buildGrammarDataset({
    problemText,
    answerText,
    docTitle,
    idPrefix,
    sourceLabelBase
  });

  if (!dataset.length) {
    console.error('No grammar items parsed from PDF.');
    process.exit(1);
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log(`Generated ${dataset.length} fallback grammar items -> ${outputPath}`);
}

main().catch((error) => {
  console.error('Failed to generate fallback grammar dataset:', error);
  process.exit(1);
});
