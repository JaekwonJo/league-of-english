const express = require('express');
const router = express.Router();
const database = require('../models/database');
const UltraSimpleProblemService = require('../services/ultraSimpleProblemService');
const AIProblemService = require('../services/aiProblemService');
const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');

/**
 * POST /api/get-smart-problems
 * ?�마??문제 가?�오�?(?�전??fallback ?�함)
 */
router.post('/get-smart-problems', verifyToken, checkDailyLimit, async (req, res) => {
  const { documentId, types, count, orderDifficulty, insertionDifficulty, grammarDifficulty } = req.body;
  const userId = req.user.id;

  if (!documentId || !types || !count) {
    return res.status(400).json({ message: '?�수 ?�라미터가 ?�락?�었?�니??' });
  }

  try {
    const ultraService = new UltraSimpleProblemService();
    let problems = await ultraService.getSmartProblems(
      userId,
      documentId,
      types,
      count,
      { orderDifficulty, insertionDifficulty, grammarDifficulty }
    );

    // Route-level safety: ensure at least one problem when generation failed
    if (!problems || problems.length === 0) {
      try {
        const doc = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
        const { generateCSATGrammarProblem } = require('../utils/csatGrammarGenerator');
        const baseText = (doc && doc.content) ? doc.content.toString() : 'He go to school every day. They are students. It is raining now.';
        const gp = generateCSATGrammarProblem(baseText, { difficulty: grammarDifficulty || 'basic' });
        problems = [{
          id: `grammar_${Date.now()}_route_fallback`,
          type: gp.type || 'grammar',
          question: gp.question,
          options: gp.choices || gp.options || [],
          answer: String(gp.correctAnswer),
          difficulty: gp.difficulty || (grammarDifficulty || 'basic'),
          explanation: gp.explanation
        }];
      } catch (e) {
        console.warn('route-level fallback failed:', e);
      }
    }

    await updateUsage(userId, problems.length);
    res.json({ problems, count: problems.length, dailyLimit: req.dailyLimit });
  } catch (error) {
    console.error('문제 가?�오�??�류:', error);
    res.status(500).json({ message: '문제 가?�오?�데 ?�패?�습?�다.' });
  }
});

/**
 * POST /api/problems/submit
 * ?�답 ?�출 �?채점
 */
router.post('/problems/submit', verifyToken, async (req, res) => {
  const { problemId, userAnswer, timeSpent } = req.body;
  const userId = req.user.id;

  try {
    const problem = await database.get('SELECT * FROM problems WHERE id = ?', [problemId]);
    if (!problem) return res.status(404).json({ message: '문제�?찾을 ???�습?�다.' });

    const isCorrect = problem.answer === userAnswer.toString();
    await database.run(
      `INSERT INTO study_records (user_id, problem_id, is_correct, user_answer, time_spent)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, problemId, isCorrect ? 1 : 0, userAnswer, timeSpent]
    );

    const pointChange = isCorrect ? 10 : -5;
    await database.run('UPDATE users SET points = points + ? WHERE id = ?', [pointChange, userId]);

    res.json({ correct: isCorrect, correctAnswer: problem.answer, explanation: problem.explanation, pointChange });
  } catch (error) {
    console.error('?�답 ?�출 ?�류:', error);
    res.status(500).json({ message: '?�답 처리 �??�류가 발생?�습?�다.' });
  }
});

/**
 * GET /api/problems/history
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
    console.error('기록 조회 ?�류:', error);
    res.status(500).json({ message: '기록 조회 �??�류가 발생?�습?�다.' });
  }
});

/**
 * GET /api/problems/stats
 */
router.get('/problems/stats', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const overall = await database.get(
      `SELECT COUNT(*) as total, SUM(is_correct) as correct, AVG(time_spent) as avgTime
       FROM study_records WHERE user_id = ?`,
      [userId]
    );
    const byType = await database.all(
      `SELECT p.type, COUNT(*) as total, SUM(sr.is_correct) as correct
       FROM study_records sr JOIN problems p ON sr.problem_id = p.id
       WHERE sr.user_id = ? GROUP BY p.type`,
      [userId]
    );
    const recent = await database.all(
      `SELECT DATE(created_at) as date, COUNT(*) as total, SUM(is_correct) as correct
       FROM study_records WHERE user_id = ? AND created_at > datetime('now', '-7 days')
       GROUP BY DATE(created_at) ORDER BY date DESC`,
      [userId]
    );
    res.json({
      overall: {
        total: overall.total || 0,
        correct: overall.correct || 0,
        accuracy: overall.total ? (overall.correct / overall.total * 100).toFixed(1) : 0,
        avgTime: Math.round(overall.avgTime || 0)
      },
      byType: byType.map(t => ({ ...t, accuracy: t.total ? (t.correct / t.total * 100).toFixed(1) : 0 })),
      recent
    });
  } catch (error) {
    console.error('?�계 조회 ?�류:', error);
    res.status(500).json({ message: '?�계 조회 �??�류가 발생?�습?�다.' });
  }
});

/**
 * New AI-type generation endpoints (scaffold) with smart caching (>=100 cached)
 */
router.post('/generate/blank', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId가 ?�요?�니?? });
    const cached = await AIProblemService.countCached(documentId, 'blank');
    let out;
    if (cached >= 100) out = await AIProblemService.fetchCached(documentId, 'blank', count);
    else { out = await AIProblemService.generateBlank(documentId, count); await AIProblemService.saveProblems(documentId, 'blank', out); }
    await updateUsage(req.user.id, out.length);
    res.json({ problems: out, count: out.length, dailyLimit: req.dailyLimit });
  } catch (e) { console.error('blank ?�성 ?�류:', e); res.status(500).json({ message: 'blank 문제 ?�성 �??�류' }); }
});

router.post('/generate/vocab', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId가 ?�요?�니?? });
    const cached = await AIProblemService.countCached(documentId, 'vocabulary');
    let out;
    if (cached >= 100) out = await AIProblemService.fetchCached(documentId, 'vocabulary', count);
    else { out = await AIProblemService.generateVocab(documentId, count); await AIProblemService.saveProblems(documentId, 'vocabulary', out); }
    await updateUsage(req.user.id, out.length);
    res.json({ problems: out, count: out.length, dailyLimit: req.dailyLimit });
  } catch (e) { console.error('vocab ?�성 ?�류:', e); res.status(500).json({ message: 'vocab 문제 ?�성 �??�류' }); }
});

router.post('/generate/title', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId가 ?�요?�니?? });
    const cached = await AIProblemService.countCached(documentId, 'title');
    let out;
    if (cached >= 100) out = await AIProblemService.fetchCached(documentId, 'title', count);
    else { out = await AIProblemService.generateTitle(documentId, count); await AIProblemService.saveProblems(documentId, 'title', out); }
    await updateUsage(req.user.id, out.length);
    res.json({ problems: out, count: out.length, dailyLimit: req.dailyLimit });
  } catch (e) { console.error('title ?�성 ?�류:', e); res.status(500).json({ message: 'title 문제 ?�성 �??�류' }); }
});

router.post('/generate/topic', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId가 ?�요?�니?? });
    const cached = await AIProblemService.countCached(documentId, 'theme');
    let out;
    if (cached >= 100) out = await AIProblemService.fetchCached(documentId, 'theme', count);
    else { out = await AIProblemService.generateTopic(documentId, count); await AIProblemService.saveProblems(documentId, 'theme', out); }
    await updateUsage(req.user.id, out.length);
    res.json({ problems: out, count: out.length, dailyLimit: req.dailyLimit });
  } catch (e) { console.error('topic ?�성 ?�류:', e); res.status(500).json({ message: 'topic 문제 ?�성 �??�류' }); }
});

router.post('/generate/summary', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId가 ?�요?�니?? });
    const cached = await AIProblemService.countCached(documentId, 'summary');
    let out;
    if (cached >= 100) out = await AIProblemService.fetchCached(documentId, 'summary', count);
    else { out = await AIProblemService.generateSummary(documentId, count); await AIProblemService.saveProblems(documentId, 'summary', out); }
    await updateUsage(req.user.id, out.length);
    res.json({ problems: out, count: out.length, dailyLimit: req.dailyLimit });
  } catch (e) { console.error('summary ?�성 ?�류:', e); res.status(500).json({ message: 'summary 문제 ?�성 �??�류' }); }
});

module.exports = router;

