const fs = require('fs');
const path = require('path');
const database = require('./server/models/database');
// Import the exact parser we are using
const { parseQuestions, parseAnswers } = require('./server/scripts/import-exam-pdf');
const pdf = require('pdf-parse');

async function testUpload() {
  console.log('--- Test Start ---');
  
  // 1. Use the file we uploaded previously for testing
  const filePath = "기출문제모음/2024년도 10월 2학년 2024년10월고2모의고사_기출100문제(1)업로드완료.pdf";
  const documentId = 61; // Existing ID

  if (!fs.existsSync(filePath)) {
    console.error('Test file not found:', filePath);
    return;
  }

  try {
    console.log('1. Connecting DB...');
    await database.connect();

    console.log('2. Reading PDF...');
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const fullText = String(pdfData.text || '').replace(/\r/g, '');
    console.log('   PDF Read Success. Length:', fullText.length);

    console.log('3. Parsing Questions...');
    const { questions, answerText } = parseQuestions(fullText);
    console.log(`   Parsed ${questions.length} questions.`);
    
    console.log('4. Parsing Answers...');
    const answerMap = parseAnswers(answerText);
    console.log('   Answers parsed.');

    console.log('5. Inserting into DB (Simulated)...');
    // We will actually try to insert one to see if DB fails
    if (questions.length > 0) {
        const q = questions[0];
        const ansData = answerMap[q.number] || {};
        console.log('   Inserting Question #', q.number);
        
        await database.run(
            `INSERT INTO exam_problems 
             (document_id, exam_title, question_number, question_type, passage, options_json, answer, explanation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                documentId,
                'Test Exam',
                q.number,
                q.type,
                q.passage,
                JSON.stringify(q.options),
                ansData.answer || '',
                ansData.explanation || ''
            ]
        );
        console.log('   Insert Success!');
    }

    console.log('--- Test Passed ---');

  } catch (error) {
    console.error('!!! TEST FAILED !!!');
    console.error(error);
    console.error('Stack:', error.stack);
  }
}

testUpload();
