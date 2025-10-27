'use strict';

// Usage: node server/scripts/import-vocabulary-pdf.js <pdfPath> [title]

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const database = require('../models/database');

async function main() {
  const pdfPath = process.argv[2];
  const customTitle = process.argv[3];
  if (!pdfPath) {
    console.error('Usage: node server/scripts/import-vocabulary-pdf.js <pdfPath> [title]');
    process.exit(1);
  }
  if (!fs.existsSync(pdfPath)) {
    console.error('File not found:', pdfPath);
    process.exit(1);
  }
  await database.connect();
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  const text = data.text || '';

  // Use same parser as upload route
  const VocabularyParser = require('../utils/vocabularyParser');
  const parser = new VocabularyParser();
  const result = parser.parse(text);
  if (!result || !Array.isArray(result.days) || result.days.length === 0) {
    console.error('Parser failed to extract vocabulary days');
    process.exit(2);
  }
  const content = JSON.stringify({
    vocabulary: {
      days: result.days,
      totalDays: result.totalDays,
      totalWords: result.totalWords,
      sourceFilename: path.basename(pdfPath)
    }
  });

  const title = customTitle || path.basename(pdfPath, path.extname(pdfPath));
  const insert = await database.run(
    `INSERT INTO documents (title, content, type, category, school, grade, created_by)
     VALUES (?, ?, 'vocabulary', '보카', '전체', NULL, 1)`,
    [title, content]
  );
  console.log('Inserted vocabulary document id:', insert.id, 'title:', title, 'days:', result.totalDays, 'words:', result.totalWords);
  await database.close();
}

main().catch(async (e) => { console.error('Import failed:', e); try { await database.close(); } catch {}; process.exit(1); });

