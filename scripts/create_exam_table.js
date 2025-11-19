const database = require('../server/models/database');

(async () => {
  try {
    await database.connect();
    console.log('Creating exam_problems table...');
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

    await database.run(`
      CREATE TABLE IF NOT EXISTS exam_problem_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exam_problem_id INTEGER,
        is_correct BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await database.run(`CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_problem_attempts(user_id)`);
    
    console.log('Tables created successfully!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    // Do not close if connection is managed globally, but here we close it.
    // Actually database.js might maintain state. Just exit.
    process.exit(0);
  }
})();
