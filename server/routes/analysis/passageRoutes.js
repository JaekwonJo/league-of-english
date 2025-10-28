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
    const result = await analysisService.getAnalyzedPassages(documentId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('지문 분석 조회 오류:', error);
    const code = error?.code;
    const statusCode = code === 'OPENAI_MISSING' ? 503 : 500;
    res.status(statusCode).json({
      success: false,
      message: error?.message || '분석 결과 조회 중 오류가 발생했습니다.',
      error: String(error?.message || error),
      code
    });
  }
});

/**
 * GET /api/analysis/:documentId/passage-list
 * Return raw passage list with analysis status
 */
router.get('/passage-list', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log(`[analysis] passage list request - document: ${documentId}`);
    const result = await analysisService.getPassageList(documentId);
    res.json(result);
  } catch (error) {
    console.error('지문 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: error?.message || '지문 목록을 불러오는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/analysis/:documentId/passage/:passageNumber
 * Fetch a single passage analysis with view tracking
 */
router.get('/passage/:passageNumber', verifyToken, async (req, res) => {
  const { documentId, passageNumber } = req.params;
  const numericPassage = Number(passageNumber);

  if (!Number.isInteger(numericPassage) || numericPassage <= 0) {
    return res.status(400).json({ success: false, message: '올바른 지문 번호가 필요합니다.' });
  }

  try {
    if (req.user?.id) {
      await analysisService.recordAnalysisView(req.user.id, documentId, numericPassage);
    }

    const analysis = await analysisService.getPassageAnalysis(documentId, numericPassage, req.user?.id || null);
    if (!analysis) {
      return res.status(404).json({ success: false, message: '아직 저장된 분석본이 없습니다. 먼저 분석을 생성해 주세요.' });
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    const message = String(error?.message || '분석을 불러오는 중 오류가 발생했습니다.');
    const statusCode = message.includes('하루 10개의 분석본') ? 429
      : message.includes('권한') ? 403
      : message.includes('찾을 수 없습니다') ? 404
      : 500;

    res.status(statusCode).json({ success: false, message });
  }
});

/**
 * POST /api/analysis/:documentId/analyze-passage
 * Generate up to 2 variants for a passage (teacher/admin)
 */
router.post('/analyze-passage', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumber, count = 1 } = req.body || {};
    const userRole = req.user.role;

    if (!passageNumber) {
      return res.status(400).json({ success: false, message: 'passageNumber가 필요합니다.' });
    }

    console.log(`[analysis] generate variants request - document: ${documentId}, passage: ${passageNumber}, count: ${count}`);
    const result = await analysisService.generateVariants(documentId, Number(passageNumber), Number(count) || 1, userRole, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('개별 지문 분석 오류:', error);
    const code = error?.code;
    const msg = String((error && error.message) || '');
    const statusCode = code === 'OPENAI_MISSING' ? 503
      : msg.includes('권한') ? 403
      : msg.includes('찾을 수 없습니다') ? 404
      : msg.includes('유효') ? 400
      : 500;

    res.status(statusCode).json({ success: false, message: msg, error: msg, code });
  }
});

/**
 * POST /api/analysis/:documentId/analyze-passages
 * Analyze up to three passages at once (admin/teacher)
 */
router.post('/analyze-passages', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumbers } = req.body || {};
    const userRole = req.user.role;

    const result = await analysisService.analyzePassages(documentId, passageNumbers, userRole, req.user.id);
    if (!result.success && (!result.failures || result.failures.length === 0)) {
      return res.status(400).json({ success: false, message: '분석을 생성하지 못했어요. 지문 선택을 확인해 주세요.' });
    }

    res.json(result);
  } catch (error) {
    console.error('다중 지문 분석 오류:', error);
    const message = String(error?.message || '다중 지문 분석 중 문제가 발생했습니다.');
    const statusCode = message.includes('권한') ? 403
      : message.includes('최대') ? 400
      : message.includes('선택') ? 400
      : message.includes('문서를 찾을 수') ? 404
      : 500;
    res.status(statusCode).json({ success: false, message });
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
 * DELETE /api/analysis/:documentId/passage/:passageNumber/variant/:variantIndex
 * Remove a single analysis variant (admin)
 */
router.delete('/passage/:passageNumber/variant/:variantIndex', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { documentId, passageNumber, variantIndex } = req.params;
    const result = await analysisService.removeVariant(
      documentId,
      Number(passageNumber),
      Number(variantIndex),
      req.user.role,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('분석 삭제 오류:', error);
    const message = String(error?.message || '분석본을 삭제하는 중 문제가 발생했습니다.');
    const status = message.includes('찾을 수') ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
});

/**
 * POST /api/analysis/:documentId/passage/:passageNumber/delete-variants
 * Remove multiple analysis variants at once (admin)
 */
router.post('/passage/:passageNumber/delete-variants', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { documentId, passageNumber } = req.params;
    const { variantIndexes } = req.body || {};
    const numericPassage = Number(passageNumber);

    if (!Number.isInteger(numericPassage) || numericPassage <= 0) {
      return res.status(400).json({ success: false, message: '올바른 지문 번호가 필요합니다.' });
    }

    const indexes = Array.isArray(variantIndexes) ? variantIndexes : [];
    const result = await analysisService.removeVariants(
      documentId,
      numericPassage,
      indexes,
      req.user.role,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('분석 일괄 삭제 오류:', error);
    const message = String(error?.message || '분석본을 삭제하는 중 문제가 발생했습니다.');
    const status = message.includes('권한') ? 403
      : message.includes('찾을 수') ? 404
      : message.includes('선택') ? 400
      : 400;
    res.status(status).json({ success: false, message });
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
    const analysis = await analysisService.getPassageAnalysis(documentId, passageNumber, req.user.id);
    if (!analysis) {
      return res.status(404).json({ success: false, message: '해당 지문의 분석 결과를 찾을 수 없습니다.' });
    }
    try {
      await analysisService.recordAnalysisView(req.user.id, documentId, passageNumber);
    } catch (limitError) {
      if (limitError?.code === 'ANALYSIS_VIEW_LIMIT') {
        return res.status(429).json({ success: false, message: limitError.message, code: limitError.code });
      }
      throw limitError;
    }

    res.json({ success: true, data: analysis, cached: Boolean(analysis?.variants?.length) });
  } catch (error) {
    console.error('지문 분석 조회 오류:', error);
    res.status(500).json({ success: false, message: '분석 결과 조회 중 오류가 발생했습니다.', error: String(error.message || error) });
  }
});

/**
 * POST /api/analysis/:documentId/passage/:passageNumber/feedback
 * Submit helpful/report feedback for a passage variant
 */
router.post('/passage/:passageNumber/feedback', verifyToken, async (req, res) => {
  try {
    const { documentId, passageNumber } = req.params;
    const { variantIndex, action, reason = '' } = req.body || {};
    const payload = {
      documentId: Number(documentId),
      passageNumber: Number(passageNumber),
      variantIndex: Number(variantIndex),
      userId: req.user.id,
      action,
      reason
    };

    const result = await analysisService.submitFeedback(payload);
    res.json(result);
  } catch (error) {
    console.error('분석 피드백 처리 오류:', error);
    const message = String(error?.message || '피드백 처리 중 문제가 발생했습니다.');
    res.status(message.includes('사유') ? 400 : 500).json({ success: false, message });
  }
});

module.exports = router;
