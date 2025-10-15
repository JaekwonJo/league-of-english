const fs = require('fs');
const path = require('path');
const assert = require('assert');
const test = require('node:test');

const {
  readGrammarManual
} = require('../services/ai-problem/internal/manualLoader');
const {
  buildGrammarPrompt
} = require('../utils/eobeopTemplate');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PRIMARY_MANUAL_PATH = path.join(ROOT_DIR, 'chatgpt5 전용 어법 문제 제작 통합 메뉴얼.md');
const MIRROR_PATHS = [
  path.join(ROOT_DIR, 'grammar_problem_manual.md'),
  path.join(ROOT_DIR, 'problem manual', 'grammar_problem_manual.md')
];

test('grammar manuals stay in sync and are non-truncated', () => {
    const source = fs.readFileSync(PRIMARY_MANUAL_PATH, 'utf8');
    assert.ok(source.length > 15000, 'source manual seems too short');

    const loaderManual = readGrammarManual();
    assert.strictEqual(loaderManual, source, 'manualLoader returns full manual text');

    MIRROR_PATHS.forEach((mirrorPath) => {
      const mirror = fs.readFileSync(mirrorPath, 'utf8');
      assert.strictEqual(mirror, source, `mirror file out of sync: ${mirrorPath}`);
    });
});

test('grammar prompts embed the full manual text', () => {
  const manual = readGrammarManual();
  const normalizedManual = manual.replace(/\r/g, '');
  const prompt = buildGrammarPrompt({
    passage: 'Students *are studying* hard for the exam and it ① keeps them motivated.',
    docTitle: 'Sample Passage',
    passageIndex: 0,
    manualExcerpt: manual,
    variantTag: 'test-manual-prompt'
  });

  const promptNormalized = prompt.replace(/\r/g, '');
  const nonEmptyLines = normalizedManual
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = nonEmptyLines[0];
  const lastLine = nonEmptyLines[nonEmptyLines.length - 1];

  assert.ok(promptNormalized.includes('Handbook (full text):'), 'prompt should label the manual section');
  assert.ok(promptNormalized.includes(firstLine), 'prompt should include the beginning of the manual');
  assert.ok(promptNormalized.includes(lastLine), 'prompt should include the end of the manual');
});
