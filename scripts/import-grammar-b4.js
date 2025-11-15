#!/usr/bin/env node
/**
 * B4 어법 복습자료(PDF) → 워크북 Step 11(어법 틀린 것 찾기) 일괄 등록 스크립트
 * 사용: NODE_PATH=/path/to/repo node scripts/import-grammar-b4.js \
 *          "/mnt/c/Users/jaekw/Documents/웹앱/league-of-english/B4어법자료"
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const database = require('../server/models/database');

async function readPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return String(data.text || '').replace(/\r/g, '');
}

function splitQuestions(raw) {
  // 매우 단순한 분리: 번호로 시작하는 라인 기준 1) ~ 30)
  const lines = raw.split('\n');
  const groups = [];
  let cur = [];
  const isStart = (line) => /^\s*(\d{1,3})[).]/.test(line);
  lines.forEach((line) => {
    if (isStart(line)) {
      if (cur.length) groups.push(cur.join('\n'));
      cur = [line];
    } else {
      cur.push(line);
    }
  });
  if (cur.length) groups.push(cur.join('\n'));
  return groups;
}

function extractAnswer(block) {
  // 정답 표기 패턴: 정답: ③ / [정답] 3 / 정답 3 등
  const m = block.match(/정답\s*[:：]?\s*([①-⑤1-5])/);
  if (!m) return null;
  const token = m[1];
  const map = { '①':1,'②':2,'③':3,'④':4,'⑤':5 };
  return map[token] || Number(token);
}

function sanitize(text){
  return String(text||'').replace(/\s+/g,' ').trim();
}

function buildStep11Cards(questionBlocks) {
  const cards = [];
  questionBlocks.forEach((block, idx) => {
    const answer = extractAnswer(block);
    const stem = sanitize(block.replace(/정답[\s\S]*/,'').replace(/\(\s*\d\s*\)/g,''));
    const label = `[어법 틀린 것 찾기 ${idx+1}]`;
    const front = `${label}\n${stem}`;
    const back = `정답: ${answer ? answer : '확인 필요'}\n쉬운 해설: 원문 문장 중 오답인 부분(형태/일치/시제 등)을 근거 문장과 함께 설명해 보세요.`;
    cards.push({ type: 'grammar-review', front, back, answer: String(answer||'') });
  });
  return cards;
}

async function upsertWorkbookFromPdf(filePath) {
  const title = path.basename(filePath);
  const content = await readPdf(filePath);
  const questions = splitQuestions(content);
  if (!questions.length) {
    console.log('[SKIP] 문항을 찾지 못함:', title);
    return null;
  }
  // documents에 임시 문서를 만들고 해당 문서 1번 지문으로 워크북을 구성
  const insertDoc = await database.run(
    'INSERT INTO documents (title, content, type, category, created_by) VALUES (?, ?, ?, ?, ?)',
    [title, content, 'text', '어법', 1]
  );
  const documentId = insertDoc.id;
  const passageNumber = 1;
  const steps = [];
  const cards = buildStep11Cards(questions);
  steps.push({
    step: 11,
    label: 'STEP 11 - 어법 틀린 것 찾기',
    title: '어법 틀린 것 찾기',
    mood: 'focus',
    intro: '문장을 읽고 틀린 부분을 찾으세요. 근거 문장을 표시하고 올바른 형태로 고쳐봅시다.',
    mission: '규칙을 떠올리며 오답 이유를 한 줄로 적어 보세요.',
    cards,
    takeaways: ['근거 문장을 확인', '규칙명/형태를 정확히']
  });

  const stepsJson = JSON.stringify(steps);
  const metaJson = JSON.stringify({ source: 'import-grammar-b4', file: title });
  await database.run(
    `INSERT INTO workbook_sets (document_id, passage_number, title, description, cover_emoji, steps_json, meta_json, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
    [documentId, passageNumber, `Workbook · ${title}`, 'B4 복습자료 자동 등록', '📘', stepsJson, metaJson, 1]
  );
  console.log('[OK] 워크북 등록:', title);
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('사용법: node scripts/import-grammar-b4.js "/path/to/B4어법자료"');
    process.exit(1);
  }
  const files = fs.readdirSync(folder)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => path.join(folder, f));
  if (!files.length) {
    console.error('PDF 파일이 없습니다:', folder);
    process.exit(1);
  }
  for (const file of files) {
    try {
      await upsertWorkbookFromPdf(file);
    } catch (e) {
      console.warn('[WARN] 처리 실패:', path.basename(file), e.message || e);
    }
  }
  console.log('완료. 관리자에서 워크북 목록을 확인하세요.');
}

main();

