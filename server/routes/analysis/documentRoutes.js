/**
 * 문서 관련 분석 라우트
 */

const express = require('express');
const router = express.Router();
const analysisService = require('../../services/analysisService');
const { verifyToken } = require('../../middleware/auth');

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
 * GET /api/analysis/:documentId
 * 문서 분석 생성 또는 조회
 */
router.get('/:documentId', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    console.log(`📊 문서 ${documentId} 분석 요청 (사용자: ${userId})`);

    const result = await analysisService.getOrCreateAnalysis(documentId);
    res.json(result);

  } catch (error) {
    console.error('문서 분석 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '문서 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;