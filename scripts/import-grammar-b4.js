#!/usr/bin/env node
/**
 * B4 어법 복습자료(PDF) → 워크북 Step 11(어법 틀린 것 찾기) 일괄 등록 스크립트
 * 사용: NODE_PATH=/path/to/repo node scripts/import-grammar-b4.js \
 *          "/mnt/c/Users/jaekw/Documents/웹앱/league-of-english/B4어법자료"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const OpenAI = require('openai');
const database = require('../server/models/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function readPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return String(data.text || '').replace(/\r/g, '');
}

function splitQuestions(raw) {
  // 번호로 시작하는 라인 기준 1) ~ 99) 단위로 문항을 묶습니다.
  const lines = raw.split('\n');
  const groups = [];
  let cur = null;
  const isStart = (line) => /^\s*(\d{1,3})[).]/.test(line);

  lines.forEach((line) => {
    if (isStart(line)) {
      const numMatch = line.match(/^\s*(\d{1,3})[).]/);
      const number = numMatch ? Number(numMatch[1]) : null;
      
      // 같은 번호가 연속되면(예: '20.' 다음 '20)') 같은 그룹으로 취급
      if (cur && cur.number === number) {
        cur.lines.push(line);
      } else {
        if (cur && cur.lines.length) {
          groups.push({
            number: cur.number,
            text: cur.lines.join('\n')
          });
        }
        cur = {
          number,
          lines: [line]
        };
      }
    } else if (cur) {
      cur.lines.push(line);
    }
  });

  if (cur && cur.lines.length) {
    groups.push({
      number: cur.number,
      text: cur.lines.join('\n')
    });
  }

  return groups;
}

function extractAnswerMap(raw) {
  // PDF 하단의 "정답" 블록에서 `문항번호) 해설` 라인을 전부 모읍니다.
  const lines = raw.split('\n');
  const index = lines.findIndex((line) => line.includes('정답'));
  if (index === -1) return {};

  const map = {};
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const m = line.match(/^(\d{1,3})\)\s*(.+)$/);
    if (!m) continue;
    const number = Number(m[1]);
    const answerText = m[2].trim();
    if (!Number.isNaN(number) && answerText) {
      map[number] = answerText;
    }
  }
  return map;
}

function sanitize(text){
  return String(text||'')
    .replace(/^\s*\d+[).]\s*$/gm, '') // 번호만 있는 라인 제거 (예: "20.")
    .replace(/\s+/g,' ').trim();
}

async function fetchAiExplanation(stem, answerText) {
  try {
    const prompt = `
Role: 친절하고 명랑한 영어 과외 선생님 (이모지 사용 😊)
Task: 다음 어법 문제의 '틀린 부분'을 설명해주세요.
Question: "${stem}"
Answer Info: "${answerText}"

Format (JSON):
{
  "corrected": "올바르게 고친 전체 문장",
  "explanation": "왜 틀렸는지 초등학생도 이해하게 아주 쉽고 친절하게 설명 (1~2문장)",
  "point": "핵심 문법 포인트 (예: 수 일치, 관계대명사)"
}
JSON만 출력하세요.
`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);
  } catch (e) {
    console.warn('AI 해설 생성 실패:', e.message);
    return null;
  }
}

async function buildStep11Cards(questionBlocks, answerMap = {}) {
  const cards = [];
  console.log(`총 ${questionBlocks.length}개 문항에 대해 AI 해설 생성을 시작합니다... (잠시만 기다려주세요 ☕)`);

  // 순차 처리 (Rate Limit 방지 및 진행상황 표시)
  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    const number = block?.number || (i + 1);
    const rawText = block?.text || '';
    const answerText = answerMap[number] || '';
    
    const stem = sanitize(
      String(rawText)
        .replace(/정답[\s\S]*/, '')
        .replace(/\(\s*\d+\s*\)/g, '')
    );

    let aiData = null;
    if (answerText) {
      process.stdout.write(`[${i + 1}/${questionBlocks.length}] 문항 분석 중... 🤖\r`);
      aiData = await fetchAiExplanation(stem, answerText);
    }

    const label = `[어법 틀린 것 찾기 ${i+1}]`;
    const front = `${label}\n${stem}`;
    
    let back = '';
    if (aiData) {
      back = `정답: ${aiData.corrected}\n\n💡 쉬운 해설: ${aiData.explanation}\n🔑 핵심: ${aiData.point}`;
    } else {
      back = `정답: ${answerText || '확인 필요'}\n쉬운 해설: (AI 연결 실패 - 원문 참조)`;
    }

    cards.push({
      type: 'grammar-review',
      front,
      back,
      answer: aiData ? aiData.corrected : answerText
    });
  }
  console.log('\n모든 문항 분석 완료! 🎉');
  return cards;
}

async function upsertWorkbookFromPdf(filePath) {
  const title = path.basename(filePath);
  const content = await readPdf(filePath);
  const answerMap = extractAnswerMap(content);
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
  
  // AI 해설 생성 포함 빌드
  const cards = await buildStep11Cards(questions, answerMap);
  
  const steps = [];
  steps.push({
    step: 11,
    label: 'STEP 11 - 어법 틀린 것 찾기',
    title: '어법 틀린 것 찾기',
    mood: 'focus',
    intro: '문장을 읽고 틀린 부분을 찾으세요. AI 선생님이 친절하게 해설해 드립니다! 👨‍🏫',
    mission: '틀린 이유를 생각하고 정답과 비교해 보세요.',
    cards,
    takeaways: ['근거 문장을 확인', '규칙명/형태를 정확히']
  });

  const stepsJson = JSON.stringify(steps);
  const metaJson = JSON.stringify({ source: 'import-grammar-b4', file: title });
  await database.run(
    `INSERT INTO workbook_sets (document_id, passage_number, title, description, cover_emoji, steps_json, meta_json, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
    [documentId, passageNumber, `Workbook · ${title}`, 'B4 복습자료 (AI 해설 포함)', '📘', stepsJson, metaJson, 1]
  );
  console.log('[OK] 워크북 등록:', title);
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('사용법: node scripts/import-grammar-b4.js "/path/to/B4어법자료"');
    process.exit(1);
  }

  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error('폴더를 찾을 수 없습니다:', folder);
    process.exit(1);
  }

  const files = fs.readdirSync(folder)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => path.join(folder, f));

  if (!files.length) {
    console.error('PDF 파일이 없습니다:', folder);
    process.exit(1);
  }

  await database.connect();

  try {
    for (const file of files) {
      try {
        await upsertWorkbookFromPdf(file);
      } catch (e) {
        console.warn('[WARN] 처리 실패:', path.basename(file), e.message || e);
      }
    }
    console.log('완료. 관리자에서 워크북 목록을 확인하세요.');
  } finally {
    try {
      await database.close();
    } catch (_) {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error('B4 어법 임포트 실패:', error?.message || error);
  process.exit(1);
});
