#!/usr/bin/env node
/**
 * Sync the authoritative grammar handbook into the repository copies
 * so every runtime component reads the exact same instructions.
 *
 * Usage:
 *   node scripts/sync-grammar-manual.js [optional-path-to-manual]
 *
 * If no path is provided the script will look through a set of known
 * locations including the Windows Documents directory that the team uses.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_FILES = [
  path.join(ROOT_DIR, 'chatgpt5 전용 어법 문제 제작 통합 메뉴얼.md'),
  path.join(ROOT_DIR, 'grammar_problem_manual.md'),
  path.join(ROOT_DIR, 'problem manual', 'grammar_problem_manual.md')
];

const CANDIDATES = [
  process.argv[2],
  process.env.LOE_GRAMMAR_MANUAL_SOURCE,
  '/mnt/c/Users/jaekw/Documents/웹앱문제출제메뉴얼📘 chatgpt5 전용어법문제제작통합메뉴얼.md',
  '/mnt/c/Users/jaekw/Documents/웹앱/문제출제 메뉴얼/📘 chatgpt5 전용 어법 문제 제작 통합 메뉴얼.md'
].filter(Boolean);

function fileDigest(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function findSource() {
  for (const candidate of CANDIDATES) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        const stats = fs.statSync(candidate);
        if (stats.isFile()) {
          return candidate;
        }
      }
    } catch (error) {
      console.warn(`[sync-grammar-manual] Unable to read candidate ${candidate}:`, error.message || error);
    }
  }
  return null;
}

function main() {
  const sourcePath = findSource();
  if (!sourcePath) {
    console.error('[sync-grammar-manual] ❌ Could not locate the grammar manual file.');
    process.exit(1);
  }

  const buffer = fs.readFileSync(sourcePath);
  const hash = fileDigest(buffer);

  console.log('[sync-grammar-manual] 📄 Source:', sourcePath);
  console.log('[sync-grammar-manual] 🔐 SHA1 :', hash);
  console.log('[sync-grammar-manual] 📦 Size :', `${buffer.length} bytes`);

  for (const target of TARGET_FILES) {
    ensureDir(target);
    let needsWrite = true;
    if (fs.existsSync(target)) {
      const existing = fs.readFileSync(target);
      if (existing.equals(buffer)) {
        needsWrite = false;
      }
    }
    if (needsWrite) {
      fs.writeFileSync(target, buffer);
      console.log(`[sync-grammar-manual] ✅ Updated ${target}`);
    } else {
      console.log(`[sync-grammar-manual] ↔️  Already up-to-date: ${target}`);
    }
  }

  console.log('[sync-grammar-manual] Done.');
}

main();
