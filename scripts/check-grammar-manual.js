#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const PRIMARY_PATH = path.join(ROOT_DIR, 'chatgpt5 전용 어법 문제 제작 통합 메뉴얼.md');
const MIRROR_PATHS = [
  path.join(ROOT_DIR, 'grammar_problem_manual.md'),
  path.join(ROOT_DIR, 'problem manual', 'grammar_problem_manual.md')
];

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing manual file: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

(function main() {
  try {
    const sourceBuffer = readFile(PRIMARY_PATH);
    if (sourceBuffer.length < 15000) {
      throw new Error('Grammar manual appears truncated (less than 15kB). Run npm run sync:grammar-manual.');
    }
    const sourceHash = sha1(sourceBuffer);

    MIRROR_PATHS.forEach((mirrorPath) => {
      const mirrorBuffer = readFile(mirrorPath);
      const mirrorHash = sha1(mirrorBuffer);
      if (mirrorHash !== sourceHash) {
        throw new Error(`Manual out of sync: ${mirrorPath}. Run npm run sync:grammar-manual.`);
      }
    });

    console.log('[check-grammar-manual] ✅ manuals in sync:', sourceHash);
  } catch (error) {
    console.error('[check-grammar-manual] ❌', error.message || error);
    process.exit(1);
  }
})();
