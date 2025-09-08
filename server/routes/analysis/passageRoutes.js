/**
 * Passage-level analysis routes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const analysisService = require('../../services/analysisService');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

/**
 * GET /api/analysis/:documentId/passages
 * Get all analyzed passages for a document
 */
router.get('/passages', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log(`[analysis] list analyzed passages - document: ${documentId}`);
    const result = await analysisService.getAnalyzedPassages(documentId);
    res.json(result);
  } catch (error) {
    console.error('지문 분석 조회 오류:', error);
    res.status(500).json({ success: false, message: '분석 결과 조회 중 오류가 발생했습니다.', error: String(error.message || error) });
  }
});

/**
 * POST /api/analysis/:documentId/analyze-passage
 * Analyze a single passage (admin only)
 */
router.post('/analyze-passage', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumber } = req.body;
    const userRole = req.user.role;

    console.log(`[analysis] analyze passage request - document: ${documentId}, passage: ${passageNumber}`);
    const result = await analysisService.analyzePassage(documentId, passageNumber, userRole);
    res.json(result);
  } catch (error) {
    console.error('개별 지문 분석 오류:', error);
    const msg = String((error && error.message) || '');
    const statusCode = msg.includes('관리자') ? 403
      : msg.includes('찾을 수 없습니다') ? 404
      : msg.includes('유효') ? 400
      : 500;

    res.status(statusCode).json({ success: false, message: msg, error: msg });
  }
});

/**
 * POST /api/analysis/:documentId/publish-passage
 * Publish a passage analysis for students
 */
router.post('/publish-passage', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumber, scope = 'public', groups = [] } = req.body;
    if (!passageNumber) return res.status(400).json({ success: false, message: 'passageNumber가 필요합니다.' });

    const database = require('../../models/database');
    await database.run(
      'UPDATE passage_analyses SET published = 1, visibility_scope = ?, updated_at = CURRENT_TIMESTAMP WHERE document_id = ? AND passage_number = ?',
      [scope, documentId, passageNumber]
    );

    if (scope === 'group' && Array.isArray(groups) && groups.length > 0) {
      const row = await database.get('SELECT id FROM passage_analyses WHERE document_id = ? AND passage_number = ?', [documentId, passageNumber]);
      if (row && row.id) {
        for (const g of groups) {
          if (!g) continue;
          await database.run(
            'INSERT OR IGNORE INTO analysis_group_permissions (analysis_id, group_name) VALUES (?, ?)',
            [row.id, String(g)]
          );
        }
      }
    }

    res.json({ success: true, message: '해당 지문 분석이 공개되었습니다.' });
  } catch (error) {
    console.error('지문 공개 오류:', error);
    res.status(500).json({ success: false, message: '지문 공개 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/analysis/:documentId/quiz-from-analysis
 * Generate learning quiz from published analysis
 */
router.post('/quiz-from-analysis', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumber, types = ['summary','key'], save = false } = req.body;
    const database = require('../../models/database');
    const row = await database.get('SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?', [documentId, passageNumber]);
    if (!row || !row.published) return res.status(404).json({ success: false, message: '공개된 분석이 없습니다.' });

    const analysis = {
      sentenceAnalysis: JSON.parse(row.key_points || '[]'),
      deepAnalysis: JSON.parse(row.grammar_points || '{}'),
      keyExpressions: JSON.parse(row.vocabulary || '[]'),
      examplesAndBackground: JSON.parse(row.study_guide || '{}'),
      comprehensive: JSON.parse(row.comprehension_questions || '{}')
    };

    const problems = [];
    if (types.includes('summary') && analysis.comprehensive?.koreanSummary) {
      const correct = analysis.comprehensive.koreanSummary;
      const distractors = [
        '부분 정보에만 근거한 요지',
        '세부 사례를 일반화한 진술',
        '글의 톤과 맞지 않는 주장'
      ];
      const options = shuffle([correct, ...distractors]).slice(0,4);
      const answer = options.findIndex(o => o === correct) + 1;
      problems.push({ type: 'summary', question: '다음 글의 요지로 가장 적절한 것은?', options, correctAnswer: answer, explanation: '요지는 글의 핵심을 포괄해야 합니다.', difficulty: 'basic' });
    }
    if (types.includes('key') && analysis.keyExpressions?.length) {
      const expr = analysis.keyExpressions[0];
      const correct = (expr.synonyms && expr.synonyms[0]) || expr.meaning;
      const distractors = ['반의어', '무관한 단어', '문맥과 어울리지 않는 표현'];
      const options = shuffle([correct, ...distractors]).slice(0,4);
      const answer = options.findIndex(o => o === correct) + 1;
      problems.push({ type: 'vocabulary', question: `문맥상 '${expr.expression}'과(와) 의미가 가장 가까운 것은?`, options, correctAnswer: answer, explanation: `정답: ${correct}`, difficulty: 'basic' });
    }
    if (types.includes('deep') && analysis.deepAnalysis?.interpretation) {
      const correct = analysis.deepAnalysis.interpretation;
      const distractors = ['세부 사실 왜곡', '단편적 정보 강조', '필자의 의도와 상반'];
      const options = shuffle([correct, ...distractors]).slice(0,4);
      const answer = options.findIndex(o => o === correct) + 1;
      problems.push({ type: 'comprehension', question: '글의 핵심 해석으로 가장 적절한 것은?', options, correctAnswer: answer, explanation: '핵심 주장과 문맥을 종합하세요.', difficulty: 'medium' });
    }

    if (save && problems.length) {
      for (const p of problems) {
        await database.run(
          `INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, is_ai_generated)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [documentId, p.type, p.question, JSON.stringify(p.options), String(p.correctAnswer), p.explanation || '', p.difficulty || 'basic']
        );
      }
    }

    res.json({ success: true, problems, count: problems.length });
  } catch (error) {
    console.error('퀴즈 생성 오류:', error);
    res.status(500).json({ success: false, message: '퀴즈 생성 중 오류가 발생했습니다.' });
  }
});

function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }

/**
 * GET /api/analysis/:documentId/passage/:passageNumber
 * Get a specific passage analysis
 */
router.get('/passage/:passageNumber', verifyToken, async (req, res) => {
  try {
    const { documentId, passageNumber } = req.params;
    console.log(`[analysis] get passage analysis - document: ${documentId}, passage: ${passageNumber}`);
    const analysis = await analysisService.getPassageAnalysis(documentId, passageNumber);
    if (!analysis) {
      return res.status(404).json({ success: false, message: '해당 지문의 분석 결과를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: analysis, cached: true });
  } catch (error) {
    console.error('지문 분석 조회 오류:', error);
    res.status(500).json({ success: false, message: '분석 결과 조회 중 오류가 발생했습니다.', error: String(error.message || error) });
  }
});

module.exports = router;
