/**
 * 문서 관련 분석 라우트
 */

const express = require('express');
const router = express.Router();
const analysisService = require('../../services/analysisService');
const { verifyToken, requireAdmin } = require('../../middleware/auth');

/**
 * GET /api/analysis/list
 * 분석 가능한 문서 목록 조회
 */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`📊 문서 목록 요청 (사용자: ${userId})`);
    
    const result = await analysisService.getDocumentList(userId, userRole);
    res.json(result);
    
  } catch (error) {
    console.error('문서 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '문서 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * GET /api/analysis/feedback/pending
 * 신고된 분석본 리스트 (관리자)
 */
router.get('/feedback/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await analysisService.listPendingFeedback();
    res.json(result);
  } catch (error) {
    console.error('신고 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

/**
 * PUT /api/analysis/feedback/:feedbackId
 * 신고 상태 업데이트 (관리자)
 */
router.put('/feedback/:feedbackId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body || {};
    const result = await analysisService.updateFeedbackStatus(Number(feedbackId), status);
    res.json(result);
  } catch (error) {
    console.error('신고 상태 변경 오류:', error);
    const message = String(error?.message || '신고 상태를 변경하는 중 문제가 발생했습니다.');
    res.status(message.includes('찾을 수 없습니다') ? 404 : 400).json({ success: false, message });
  }
});

/**
 * GET /api/analysis/:documentId
 * 문서 분석 생성 또는 조회
 */
router.get('/:documentId', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    console.log(`📊 문서 ${documentId} 분석 요청 (사용자: ${userId})`);

    const result = await analysisService.getOrCreateAnalysis(documentId, userId);
    res.json(result);

  } catch (error) {
    console.error('문서 분석 API 오류:', error);
    const status = error?.code === 'OPENAI_MISSING' ? 503 : 500;
    res.status(status).json({
      success: false,
      message: error?.message || '문서 분석 중 오류가 발생했습니다.',
      code: error?.code
    });
  }
});

module.exports = router;
