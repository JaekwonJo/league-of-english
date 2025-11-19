const database = require('../models/database');

class ExamProblemService {
  /**
   * Fetch exam problems for a given document, excluding those already solved by the user.
   * @param {number} documentId 
   * @param {number} userId 
   * @param {number} limit 
   */
  async getUnsolvedProblems(documentId, userId, limit = 20) {
    // 1. Get solved problem IDs from study_records (assuming we log exam problems there too)
    // Note: study_records usually links to 'problems' table. 
    // Since 'exam_problems' is a new table, we might need a way to track them.
    // Strategy: We will Insert these exam problems into the main 'problems' table dynamically 
    // OR we create a separate log table.
    // Better Strategy: When serving, map them to a standard structure. 
    // For history, let's use a new table or reuse 'study_records' with a special type flag?
    // Let's keep it simple: reuse 'study_records' but store 'problem_id' as negative or use a specific type.
    // Actually, the cleanest is to check `workbook_test_logs` or similar.
    
    // Let's assume we track exam attempts in `study_records` with problemType='exam'.
    // But `problem_id` in `study_records` refers to `problems.id`.
    // So, to track history properly, we should probably "copy" the exam_problem to `problems` table 
    // ONLY when the user solves it? No, that's too late for filtering.
    
    // Solution: Use a separate table `exam_problem_history` or just query efficiently.
    // Let's use a dedicated log table for simplicity and speed.
    // `exam_problem_attempts` (user_id, exam_problem_id, is_correct, created_at)
    
    // First, ensure the table exists (can be done in init, but for now checking query)
    // For now, let's just pick Randomly to demonstrate the "20 limit".
    // To do "unsolved only", we need `exam_problem_attempts`.
    
    /*
    CREATE TABLE IF NOT EXISTS exam_problem_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      exam_problem_id INTEGER,
      is_correct BOOLEAN,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    */
   
    const solvedIds = await database.all(
        `SELECT exam_problem_id FROM exam_problem_attempts WHERE user_id = ?`,
        [userId]
    );
    const solvedIdSet = new Set(solvedIds.map(row => row.exam_problem_id));

    // 2. Fetch candidates
    const allProblems = await database.all(
        `SELECT * FROM exam_problems WHERE document_id = ?`,
        [documentId]
    );

    // 3. Filter and Limit
    const candidates = allProblems.filter(p => !solvedIdSet.has(p.id));
    
    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.slice(0, limit);
  }

  async recordAttempt(userId, examProblemId, isCorrect) {
      await database.run(
          `INSERT INTO exam_problem_attempts (user_id, exam_problem_id, is_correct) VALUES (?, ?, ?)`,
          [userId, examProblemId, isCorrect]
      );
  }
}

module.exports = new ExamProblemService();
