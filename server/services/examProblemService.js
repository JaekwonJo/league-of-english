const database = require('../models/database');

class ExamProblemService {
  /**
   * Fetch exam problems for a given document, excluding those already solved by the user.
   * @param {number} documentId 
   * @param {number} userId 
   * @param {number} limit 
   * @param {string} orderMode 'random' | 'sequential'
   */
  async getUnsolvedProblems(documentId, userId, limit = 20, orderMode = 'random') {
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

    // 3. Filter
    let candidates = allProblems.filter(p => !solvedIdSet.has(p.id));
    
    // 4. Sort or Shuffle
    if (orderMode === 'sequential') {
      candidates.sort((a, b) => {
        return (a.question_number || 0) - (b.question_number || 0);
      });
    } else {
      // Shuffle candidates
      for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
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
