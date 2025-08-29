const express = require('express');
const router = express.Router();
const database = require('../models/database');
const problemService = require('../services/problemService');
const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');

/**
 * POST /api/get-smart-problems
 * 스마트 문제 가져오기
 */
router.post('/get-smart-problems', 
  verifyToken, 
  checkDailyLimit,
  async (req, res) => {
    const { documentId, types } = req.body;
    const userId = req.user.id;

    if (!documentId || !types) {
      return res.status(400).json({ message: '필수 파라미터가 누락되었습니다.' });
    }

    try {
      // 문제 가져오기 (캐싱 + 생성)
      const problems = await problemService.getSmartProblems(
        userId,
        documentId,
        types
      );

      // 사용량 업데이트
      await updateUsage(userId, problems.length);

      res.json({
        problems: problems,
        count: problems.length,
        dailyLimit: req.dailyLimit
      });
    } catch (error) {
      console.error('문제 가져오기 오류:', error);
      res.status(500).json({ message: '문제를 가져오는데 실패했습니다.' });
    }
  }
);

/**
 * POST /api/problems/submit
 * 답안 제출 및 채점
 */
router.post('/problems/submit', verifyToken, async (req, res) => {
  const { problemId, userAnswer, timeSpent } = req.body;
  const userId = req.user.id;

  try {
    // 문제 조회
    const problem = await database.get(
      'SELECT * FROM problems WHERE id = ?',
      [problemId]
    );

    if (!problem) {
      return res.status(404).json({ message: '문제를 찾을 수 없습니다.' });
    }

    // 정답 확인
    const isCorrect = problem.answer === userAnswer.toString();

    // 학습 기록 저장
    await database.run(
      `INSERT INTO study_records (user_id, problem_id, is_correct, user_answer, time_spent)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, problemId, isCorrect ? 1 : 0, userAnswer, timeSpent]
    );

    // 포인트 업데이트
    const pointChange = isCorrect ? 10 : -5;
    await database.run(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointChange, userId]
    );

    res.json({
      correct: isCorrect,
      correctAnswer: problem.answer,
      explanation: problem.explanation,
      pointChange: pointChange
    });
  } catch (error) {
    console.error('답안 제출 오류:', error);
    res.status(500).json({ message: '답안 처리 중 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/problems/history
 * 문제 풀이 기록 조회
 */
router.get('/problems/history', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { limit = 50 } = req.query;

  try {
    const history = await database.all(
      `SELECT sr.*, p.type, p.question, p.difficulty
       FROM study_records sr
       JOIN problems p ON sr.problem_id = p.id
       WHERE sr.user_id = ?
       ORDER BY sr.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json(history);
  } catch (error) {
    console.error('기록 조회 오류:', error);
    res.status(500).json({ message: '기록을 조회할 수 없습니다.' });
  }
});

/**
 * GET /api/problems/stats
 * 통계 조회
 */
router.get('/problems/stats', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 전체 통계
    const overall = await database.get(
      `SELECT 
        COUNT(*) as total,
        SUM(is_correct) as correct,
        AVG(time_spent) as avgTime
       FROM study_records
       WHERE user_id = ?`,
      [userId]
    );

    // 유형별 통계
    const byType = await database.all(
      `SELECT 
        p.type,
        COUNT(*) as total,
        SUM(sr.is_correct) as correct
       FROM study_records sr
       JOIN problems p ON sr.problem_id = p.id
       WHERE sr.user_id = ?
       GROUP BY p.type`,
      [userId]
    );

    // 최근 7일 통계
    const recent = await database.all(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(is_correct) as correct
       FROM study_records
       WHERE user_id = ? AND created_at > datetime('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    );

    res.json({
      overall: {
        total: overall.total || 0,
        correct: overall.correct || 0,
        accuracy: overall.total ? (overall.correct / overall.total * 100).toFixed(1) : 0,
        avgTime: Math.round(overall.avgTime || 0)
      },
      byType: byType.map(t => ({
        ...t,
        accuracy: t.total ? (t.correct / t.total * 100).toFixed(1) : 0
      })),
      recent: recent
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ message: '통계를 조회할 수 없습니다.' });
  }
});

module.exports = router;