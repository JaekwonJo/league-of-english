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
  // Common UTF-8 interpreted as Latin-1 patterns
  // 'ë' often maps to Korean characters
  // We can try to reverse it: Latin1 -> Buffer -> UTF8
  try {
    // Check if it looks like mojibake (contains lots of ë, ì, etc)
    if (/[\u00C0-\u00FF]{3,}/.test(text)) {
        const buffer = Buffer.from(text, 'binary');
        const decoded = buffer.toString('utf8');
        // If decoded looks like Korean, return it
        if (/[가-힣]/.test(decoded)) return decoded;
    }
  } catch (e) {}
  return text;
}

function parseQuestions(fullText) {
  // 0. Repair Encoding (Try to fix global mojibake first)
  let cleanedText = repairText(fullText);

  // 1. Remove Noise (Page Headers/Footers)
  // Remove lines that are just numbers "- 1 -"
  cleanedText = cleanedText.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
  // Remove repeating headers
  cleanedText = cleanedText.replace(/^\s*2024년도.*?모의고사\s*$/gm, '');
  cleanedText = cleanedText.replace(/^\s*진진영어\s*$/gm, '');
  // Remove floating numbers that look like question numbers but are not headers (e.g. "97.")
  // Be careful not to remove option numbers.
  // Let's handle that inside the loop.

  // 2. Identify Answer Section
  let answerSectionIndex = cleanedText.search(/\d+\s*번\s*-\s*[①-⑤1-5]/);
  if (answerSectionIndex === -1) answerSectionIndex = cleanedText.length;

  const problemText = cleanedText.slice(0, answerSectionIndex);
  const answerText = cleanedText.slice(answerSectionIndex);

  const questions = [];
  
  // 3. Find Question Headers
  // Pattern: "Question Text... [18]"
  // We look for the [Number] at end of line or block
  const questionHeaderRegex = /^(.*?)\[\s*(\d{1,3})\s*\]\s*$/gm;
  
  let match;
  const headers = [];
  
  while ((match = questionHeaderRegex.exec(problemText)) !== null) {
    headers.push({
      fullMatch: match[0],
      prompt: match[1].trim(),
      number: parseInt(match[2], 10),
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // 4. Extract Content per Question
  for (let i = 0; i < headers.length; i++) {
    const current = headers[i];
    const next = headers[i+1];
    
    const contentStart = current.end;
    const contentEnd = next ? next.start : problemText.length;
    
    let rawContent = problemText.slice(contentStart, contentEnd).trim();
    
    // Extract Options (① or (1))
    // Find the FIRST occurrence of an option marker
    // Be careful: text might contain numbers like "1mm", "2027" etc.
    // We look for ①, ②... or (1), (2)... followed by text
    
    const options = [];
    let passage = rawContent;
    
    // Regex for option markers
    const markerRegex = /([①②③④⑤]|\(\s*[1-5]\s*\))/g;
    const firstMarker = rawContent.search(markerRegex);
    
    if (firstMarker !== -1) {
        passage = rawContent.slice(0, firstMarker).trim();
        const optionsBlock = rawContent.slice(firstMarker);
        
        // Split by markers
        const parts = optionsBlock.split(markerRegex);
        // parts[0] is empty or garbage before first marker
        for (let k = 1; k < parts.length; k += 2) {
            const marker = parts[k];
            const text = (parts[k+1] || '').trim();
            if (text) {
                const symbolMap = { 
                    '(1)': '①', '(2)': '②', '(3)': '③', '(4)': '④', '(5)': '⑤',
                    '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤' 
                };
                // Clean marker (remove spaces inside parens)
                const cleanMarker = marker.replace(/\s+/g, '');
                const displayMarker = symbolMap[cleanMarker] || cleanMarker;
                options.push(`${displayMarker} ${text}`);
            }
        }
    } else {
       // If no standard markers, maybe it's a unique format or parse failed.
       // Keep passage as is.
    }

    // Final cleanup of passage (remove trailing numbers like "97.")
    passage = passage.replace(/\n\d+\.\s*$/g, '');

    questions.push({
        number: current.number,
        type: current.prompt,
        passage: passage,
        options: options
    });
  }

  return { questions, answerText: repairText(answerText) };
}

function parseAnswers(text) {
    const answers = {}; // { 18: { answer: '3', explanation: '...' } } 
    
    // Pattern: "93 번 - ②   해설..."
    // Allow loose spacing
    const regex = /(\d+)\s*번\s*-\s*([①-⑤])\s*([\s\S]*?)(?=(\d+\s*번\s*-)|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        const ansSymbol = match[2];
        const explanation = match[3].trim();
        
        // Convert symbol to number string
        const ansMap = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };
        
        answers[num] = {
            answer: ansMap[ansSymbol] || ansSymbol,
            explanation: explanation
        };
    }
    return answers;
}

async function main() {
  const filePath = process.argv[2]; // PDF file path
  const documentId = process.argv[3]; // Target document ID

  if (!filePath || !documentId) {
    console.error('Usage: node import-exam-pdf.js <pdf_path> <document_id>');
    process.exit(1);
  }

  const fullText = await readPdf(filePath);
  
  // 1. Parse Questions
  const { questions, answerText } = parseQuestions(fullText);
  
  // 2. Parse Answers
  const answerMap = parseAnswers(answerText);
  
  // 3. Merge and Insert
  await database.connect();
  
  // Ensure table exists
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
      
      // Skip if no answer found? Or allow partial? Let's allow partial.
      
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
  // await database.close(); // Keep connection handling simple
}

if (require.main === module) {
    main().catch(e => console.error(e));
}

module.exports = { parseQuestions, parseAnswers };
