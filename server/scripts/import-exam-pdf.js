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

function parseQuestions(fullText) {
  // 1. Separate Questions and Answers
  // Look for the boundary where answers start. Often characterized by "정 답 및 해 설" or a sequence of "18번 - "
  // Or simply assume the last part of the file with frequent "number - number" pattern is answers.
  
  let answerSectionIndex = fullText.search(/\d+\s*번\s*-\s*[①-⑤1-5]/);
  if (answerSectionIndex === -1) answerSectionIndex = fullText.length;

  const problemText = fullText.slice(0, answerSectionIndex);
  const answerText = fullText.slice(answerSectionIndex);

  const questions = [];
  
  // Regex to find question headers: "Question Text... [18]"
  // We capture the text BEFORE the [18] as the prompt, and the number 18.
  // Using `gm` multiline flag.
  const questionHeaderRegex = /^(.*?)\[\s*(\d{1,3})\s*\]\s*$/gm;
  
  let match;
  let lastIndex = 0;
  const headers = [];
  
  // Pass 1: Find all question headers and their positions
  while ((match = questionHeaderRegex.exec(problemText)) !== null) {
    headers.push({
      fullMatch: match[0],
      prompt: match[1].trim(),
      number: parseInt(match[2], 10),
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Pass 2: Extract content between headers
  for (let i = 0; i < headers.length; i++) {
    const current = headers[i];
    const next = headers[i+1];
    
    const contentStart = current.end;
    const contentEnd = next ? next.start : problemText.length;
    
    let rawContent = problemText.slice(contentStart, contentEnd).trim();
    
    // Check for garbage at the end (like page numbers "- 1 -")
    // Remove lines that look like page footers/headers
    rawContent = rawContent.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
    rawContent = rawContent.replace(/^\s*2024년도.*?모의고사\s*$/gm, '');
    rawContent = rawContent.replace(/^\s*진진영어\s*$/gm, '');

    // Split Passage vs Options
    // Look for the first occurrence of ① (or (1) if used)
    let passage = '';
    const options = [];
    
    const optionStartMatch = rawContent.match(/[①\(1\)]/);
    
    if (optionStartMatch) {
        passage = rawContent.slice(0, optionStartMatch.index).trim();
        const optionsBlock = rawContent.slice(optionStartMatch.index);
        
        // Regex to split options: ① text ② text ...
        // We split by the markers, capturing the marker to know where it starts
        const parts = optionsBlock.split(/([①②③④⑤\(1\)\(2\)\(3\)\(4\)\(5\)])/);
        
        // parts[0] is empty (before first marker)
        // parts[1] = ①, parts[2] = text, parts[3] = ②, parts[4] = text ...
        for (let k = 1; k < parts.length; k += 2) {
            const marker = parts[k];
            const text = (parts[k+1] || '').trim();
            if (text) {
                // Normalise marker to ①
                const symbolMap = { '(1)': '①', '(2)': '②', '(3)': '③', '(4)': '④', '(5)': '⑤' };
                const displayMarker = symbolMap[marker] || marker;
                options.push(`${displayMarker} ${text}`);
            }
        }
    } else {
        // No options found? Maybe it's not a multiple choice or parse failed.
        // Treat whole content as passage.
        passage = rawContent;
    }

    questions.push({
        number: current.number,
        type: current.prompt, // e.g. "다음 빈칸에 들어갈..."
        passage: passage,
        options: options
    });
  }

  return { questions, answerText };
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
