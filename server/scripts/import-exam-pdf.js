const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const database = require('../models/database');

async function readPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return String(data.text || '').replace(/\r/g, '');
}

function cleanText(text) {
  return String(text || '').trim();
}

// Helper to fix common mojibake patterns if pdf-parse messed up encoding
function repairText(text) {
  if (!text) return '';
  try {
    // Check if it looks like mojibake (contains lots of ë, ì, etc)
    if (/[À-ÿ]{3,}/.test(text)) {
        const buffer = Buffer.from(text, 'binary');
        const decoded = buffer.toString('utf8');
        // If decoded looks like Korean, return it
        if (/[가-힣]/.test(decoded)) return decoded;
    }
  } catch (e) {}
  return text;
}

function parseQuestions(fullText) {
  let cleanedText = repairText(fullText);

  // 1. Remove Page Headers/Footers (Aggressive)
  cleanedText = cleanedText.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
  cleanedText = cleanedText.replace(/^\s*2024년도.*?모의고사\s*$/gm, '');
  cleanedText = cleanedText.replace(/^\s*진진영어\s*$/gm, '');
  cleanedText = cleanedText.replace(/^\d+\.\s*$/gm, ''); // Remove isolated numbers like "2." "3."

  // 2. Separate Answers (if present)
  let answerSectionIndex = cleanedText.search(/\d+\s*번\s*-\s*[①-⑤1-5]/);
  if (answerSectionIndex === -1) answerSectionIndex = cleanedText.length;

  const problemText = cleanedText.slice(0, answerSectionIndex);
  const answerText = cleanedText.slice(answerSectionIndex);

  const questions = [];
  
  // 3. Split by Question Header "[Number]"
  // We assume the question ends with [18], [19], etc.
  const headerRegex = /^(.*?)[\[\s*(\d{1,3})\s*\]\s*$/gm;
  const headers = [];
  let match;
  while ((match = headerRegex.exec(problemText)) !== null) {
    headers.push({
      index: match.index,
      end: match.index + match[0].length,
      prompt: match[1].trim(),
      number: parseInt(match[2], 10)
    });
  }

  headers.sort((a, b) => a.index - b.index);

  for (let i = 0; i < headers.length; i++) {
    const current = headers[i];
    const next = headers[i+1];
    
    const contentStart = current.end;
    const contentEnd = next ? next.index : problemText.length;
    
    let rawContent = problemText.slice(contentStart, contentEnd).trim();
    
    let passage = '';
    const options = [];
    
    // Find first option marker
    const markerRegex = /([①②③④⑤]|\(\s*[1-5]\s*\))/;
    const matchOption = rawContent.match(markerRegex);
    
    if (matchOption) {
        passage = rawContent.slice(0, matchOption.index).trim();
        const optionsBlock = rawContent.slice(matchOption.index);
        
        const parts = optionsBlock.split(/([①②③④⑤]|\(\s*[1-5]\s*\))/);
        for (let k = 1; k < parts.length; k += 2) {
            const marker = parts[k];
            const text = (parts[k+1] || '').trim();
            if (text) {
                const m = marker.replace(/[\(\)\s]/g, '')
                                .replace('1', '①').replace('2', '②').replace('3', '③').replace('4', '④').replace('5', '⑤');
                options.push(`${m} ${text}`);
            }
        }
    } else {
        passage = rawContent;
    }
    
    // Auto-underline logic
    passage = autoUnderline(passage, options);

    questions.push({
        number: current.number,
        type: current.prompt,
        passage: passage,
        options: options
    });
  }

  return { questions, answerText: repairText(answerText) };
}

function autoUnderline(passage, options) {
  if (!passage || !options || !options.length) return passage;
  let underlinedPassage = passage;
  
  options.forEach(opt => {
    const match = opt.match(/^([①②③④⑤])\s*(.*)/);
    if (!match) return;
    const marker = match[1];
    const content = match[2].trim();
    if (!content) return;

    // 1. Try to find "Marker" in passage
    const markerIdx = underlinedPassage.indexOf(marker);
    if (markerIdx !== -1) {
        // Just wrap the marker and the immediate following word
        const simpleRegex = new RegExp(`(${marker})\s*([^\s]+)`, 'i');
        underlinedPassage = underlinedPassage.replace(simpleRegex, '$1 <u>$2</u>');
    }
  });
  return underlinedPassage;
}

function parseAnswers(text) {
    const answers = {}; 
    const regex = /(\d+)\s*번\s*-\s*([①-⑤])\s*([\s\S]*?)(?=(\d+\s*번\s*-)|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        const ansSymbol = match[2];
        const explanation = match[3].trim();
        const ansMap = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };
        answers[num] = {
            answer: ansMap[ansSymbol] || ansSymbol,
            explanation: explanation
        };
    }
    return answers;
}

async function main() {
  const filePath = process.argv[2];
  const documentId = process.argv[3];

  if (!filePath || !documentId) {
    console.error('Usage: node import-exam-pdf.js <pdf_path> <document_id>');
    process.exit(1);
  }

  const fullText = await readPdf(filePath);
  const { questions, answerText } = parseQuestions(fullText);
  const answerMap = parseAnswers(answerText);
  
  await database.connect();
  
  await database.run(`
      CREATE TABLE IF NOT EXISTS exam_problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        exam_title TEXT,
        question_number INTEGER,
        question_type TEXT,
        question_text TEXT,
        passage TEXT,
        options_json TEXT,
        answer TEXT,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
  `);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_exam_problems_doc_id ON exam_problems(document_id)`);
  
  const examTitle = path.basename(filePath, '.pdf');
  let importedCount = 0;

  for (const q of questions) {
      const ansData = answerMap[q.number] || {};
      await database.run(
          `INSERT INTO exam_problems 
           (document_id, exam_title, question_number, question_type, passage, options_json, answer, explanation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
              documentId,
              examTitle,
              q.number,
              q.type,
              q.passage,
              JSON.stringify(q.options),
              ansData.answer || '',
              ansData.explanation || ''
          ]
      );
      importedCount++;
  }
  
  console.log(`Successfully imported ${importedCount} questions from ${examTitle}.`);
}

if (require.main === module) {
    main().catch(e => console.error(e));
}

module.exports = { parseQuestions, parseAnswers };