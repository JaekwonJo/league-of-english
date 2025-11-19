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
  // Split by question number pattern: e.g., "다음 ... [18]"
  // But since the [18] is at the END of the question line, we need a regex that finds the start of a question block.
  // The pattern seems to be: Some question text... [Number]
  // Let's try to split by the "Question Header".
  // Actually, splitting by the [Number] might be easier, but [Number] is the END of the header.
  
  // Better approach: Identify where each question block starts.
  // A question usually ends with options.
  // Let's find all occurrences of `[Number]` which signify the Question Title.
  
  const questionMatches = [...fullText.matchAll(/ \[(\d{1,3})\]/g)];
  const questions = [];

  // Also find the start of the "Answers" section
  // Looking for patterns like "93 번 - ②" or similar logic at the end of file.
  // Usually exam papers have a clear separation.
  // Let's assume the answer section starts when we see "번 -" pattern frequent. 
  
  // Find where answer section likely starts
  let answerSectionIndex = fullText.search(/\d+\s*번\s*-\s*[①-⑤]/);
  if (answerSectionIndex === -1) {
    // Try alternate format? Maybe just "18. ①"
    answerSectionIndex = fullText.length;
  }

  const problemText = fullText.slice(0, answerSectionIndex);
  const answerText = fullText.slice(answerSectionIndex);

  for (let i = 0; i < questionMatches.length; i++) {
    const match = questionMatches[i];
    const qNum = parseInt(match[1], 10);
    const nextMatch = questionMatches[i+1];
    
    // Find start of this question. It's roughly after the previous question's options.
    // But the regex `[18]` marks the END of the question prompt line.
    // e.g. "다음 ... 틀린 것은? [18]"
    // So the text BEFORE this match (up to a newline) is the question prompt.
    
    // Let's look backwards from `match.index` to find the start of the line.
    const headerEnd = match.index + match[0].length;
    let lineStart = problemText.lastIndexOf('\n', match.index);
    if (lineStart === -1) lineStart = 0;
    
    const questionPrompt = problemText.slice(lineStart, match.index).trim();
    
    // The content body starts after the header
    const contentStart = headerEnd;
    const contentEnd = nextMatch ? nextMatch.index : problemText.length; // Rough cut
    
    // We need to look backwards from nextMatch to find the start of the next question's prompt line
    let nextQuestionStart = contentEnd;
    if (nextMatch) {
        const nextLineStart = problemText.lastIndexOf('\n', nextMatch.index);
        if (nextLineStart > contentStart) nextQuestionStart = nextLineStart;
    }

    let rawContent = problemText.slice(contentStart, nextQuestionStart).trim();
    
    // Extract Options (①...)
    const options = [];
    const optionMatches = [...rawContent.matchAll(/([①-⑤])\s*([^①-⑤\n]+)/g)];
    
    // If regex didn't catch them well (e.g. multiline options), try a split approach
    // Or simplistic: find first ①
    const firstOptionIdx = rawContent.search(/[①-⑤]/);
    let passage = rawContent;
    
    if (firstOptionIdx !== -1) {
        passage = rawContent.slice(0, firstOptionIdx).trim();
        const optionsBlock = rawContent.slice(firstOptionIdx);
        
        // Naive option split
        const parts = optionsBlock.split(/([①-⑤])/).filter(s => s.trim());
        // parts: ["①", "Text", "②", "Text"...]
        for (let k=0; k<parts.length; k+=2) {
            if (parts[k] && parts[k+1]) {
                options.push(parts[k] + " " + parts[k+1].trim());
            }
        }
    }

    questions.push({
        number: qNum,
        type: questionPrompt, // e.g. "다음 글의 제목으로..."
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
