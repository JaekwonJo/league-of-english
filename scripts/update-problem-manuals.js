const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const MANUAL_DIR = path.join(process.cwd(), 'problem manual');
const MAX_MANUAL_SIZE = 6000;

const MAPPINGS = [
  { target: 'blank_problem_manual.md', keywords: ['빈칸', 'blank'] },
  { target: 'grammar_problem_manual.md', keywords: ['어법', 'grammar'] },
  { target: 'vocabulary_problem_manual.md', keywords: ['어휘', 'vocab'] },
  { target: 'summary_problem_manual.md', keywords: ['요약', 'summary'] },
  { target: 'title_problem_manual.md', keywords: ['제목', 'title'] },
  { target: 'theme_problem_manual.md', keywords: ['주제', 'theme', 'topic'] },
  { target: 'implicit_meaning_manual.md', keywords: ['함축', '암시', 'implicit'] }
];

function cleanText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function findPdfFile(keywords) {
  if (!Array.isArray(keywords) || !keywords.length) return null;
  try {
    const files = fs.readdirSync(MANUAL_DIR);
    for (const file of files) {
      if (path.extname(file).toLowerCase() !== '.pdf') continue;
      const lower = file.toLowerCase();
      if (keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
        return path.join(MANUAL_DIR, file);
      }
    }
  } catch (err) {
    console.warn('[manual] failed to scan directory:', err.message || err);
  }
  return null;
}

async function convertManual({ target, keywords }) {
  const pdfPath = findPdfFile(keywords);
  if (!pdfPath) {
    console.warn(`⚠️  PDF not found for ${target} (keywords: ${keywords.join(', ')})`);
    return;
  }

  try {
    const buffer = fs.readFileSync(pdfPath);
    const result = await pdfParse(buffer);
    const cleaned = cleanText(result?.text || '');
    const truncated = cleaned.length > MAX_MANUAL_SIZE ? cleaned.slice(0, MAX_MANUAL_SIZE) : cleaned;
    if (!truncated) {
      console.warn(`⚠️  Extracted text empty for ${pdfPath}`);
      return;
    }
    const outPath = path.join(MANUAL_DIR, target);
    fs.writeFileSync(outPath, truncated, 'utf-8');
    console.log(`✅ Updated ${target} from ${path.basename(pdfPath)} (${truncated.length} chars)`);
  } catch (err) {
    console.error(`❌ Failed to convert ${pdfPath}:`, err.message || err);
  }
}

(async () => {
  console.log('=== Converting problem manuals from PDF sources ===');
  for (const mapping of MAPPINGS) {
    await convertManual(mapping);
  }
  console.log('Done.');
})();
