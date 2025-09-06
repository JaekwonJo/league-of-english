/**
 * 분석 라우트 메인 인덱스
 * 모든 분석 관련 라우트를 통합 관리
 */

const express = require('express');
const router = express.Router();
const documentRoutes = require('./documentRoutes');
const passageRoutes = require('./passageRoutes');

console.log('🔄 analysis routes 로드됨');

// 문서 관련 라우트
router.use('/', documentRoutes);

// 지문 관련 라우트 (documentId 파라미터 포함)
router.use('/:documentId', passageRoutes);

module.exports = router;