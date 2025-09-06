/**
 * 개별 지문 분석 라우트
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const analysisService = require('../../services/analysisService');
const { verifyToken } = require('../../middleware/auth');

/**
 * GET /api/analysis/:documentId/passages
 * 문서의 모든 분석된 지문 조회
 */
router.get('/passages', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    console.log(`📊 분석된 지문 목록 조회 - 문서: ${documentId}`);
    
    const result = await analysisService.getAnalyzedPassages(documentId);
    res.json(result);

  } catch (error) {
    console.error('지문 분석 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '분석 결과 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/analysis/:documentId/analyze-passage
 * 개별 지문 분석 수행
 */
router.post('/analyze-passage', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumber } = req.body;
    const userRole = req.user.role;

    console.log(`📊 개별 지문 분석 요청 - 문서: ${documentId}, 지문: ${passageNumber}`);

    const result = await analysisService.analyzePassage(documentId, passageNumber, userRole);
    res.json(result);

  } catch (error) {
    console.error('개별 지문 분석 오류:', error);
    const statusCode = error.message.includes('관리자만') ? 403 : 
                      error.message.includes('찾을 수 없') ? 404 : 
                      error.message.includes('유효하지 않은') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * GET /api/analysis/:documentId/passage/:passageNumber
 * 특정 지문 분석 조회
 */
router.get('/passage/:passageNumber', verifyToken, async (req, res) => {
  try {
    const { documentId, passageNumber } = req.params;
    
    console.log(`📊 지문 분석 조회 - 문서: ${documentId}, 지문: ${passageNumber}`);
    
    const analysis = await analysisService.getPassageAnalysis(documentId, passageNumber);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: '해당 지문의 분석 결과를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: analysis,
      cached: true
    });

  } catch (error) {
    console.error('지문 분석 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '분석 결과 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;