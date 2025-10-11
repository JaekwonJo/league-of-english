/**
 * 문서 분석 관련 라우트
 */

const express = require('express');
const router = express.Router();
const database = require('../models/database');
const DocumentAnalyzer = require('../utils/documentAnalyzer');
const { verifyToken } = require('../middleware/auth');

console.log('🔄 analysis.routes.js 로드됨');

const analyzer = new DocumentAnalyzer();

/**
 * GET /api/analysis/list
 * 분석 가능한 문서 목록 조회
 */
console.log('🔧 /list 라우트 등록됨');

router.get('/list', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`📊 [UPDATED] 문서 list 분석 요청 (사용자: ${userId})`);
    
    // 사용자 권한에 따른 문서 조회
    let documents;
    if (userRole === 'admin') {
      // 관리자는 학습용 문서만 조회 (단어장은 제외)
      documents = await database.all(
        `SELECT id, title, type, category, school, grade, created_at
           FROM documents
          WHERE LOWER(COALESCE(type, '')) <> 'vocabulary'
          ORDER BY created_at DESC`
      );
    } else {
      // 일반 사용자는 자신이 업로드한 학습용 문서만 조회
      documents = await database.all(
        `SELECT id, title, type, category, school, grade, created_at
           FROM documents
          WHERE created_by = ?
            AND LOWER(COALESCE(type, '')) <> 'vocabulary'
          ORDER BY created_at DESC`,
        [userId]
      );
    }
    
    console.log(`문서 조회 결과: ${documents.length}개 (사용자: ${req.user.username}, 역할: ${userRole})`);
    console.log(`실제 조회된 문서들:`, documents);
    
    res.json({
      success: true,
      data: documents,
      message: `총 ${documents.length}개의 문서가 있습니다.`
    });

  } catch (error) {
    console.error('분석 문서 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '문서 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * 문서 분석 생성 또는 조회
 * GET /api/analysis/:documentId
 */
router.get('/:documentId', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    console.log(`📊 문서 ${documentId} 분석 요청 (사용자: ${userId})`);

    // 1. 기존 분석 결과가 있는지 확인
    const existingAnalysis = await database.get(
      'SELECT * FROM document_analyses WHERE document_id = ?',
      [documentId]
    );

    if (existingAnalysis) {
      console.log('💾 기존 분석 결과 반환');
      
      // 개별 지문 분석 결과 조회
      const passageAnalyses = await database.all(
        'SELECT * FROM passage_analyses WHERE document_id = ? ORDER BY passage_number',
        [documentId]
      );

      if (passageAnalyses.length > 0) {
        // 개별 지문 분석을 클라이언트 형식으로 변환
        const formattedAnalyses = passageAnalyses.map(analysis => ({
          id: analysis.id,
          passageNumber: analysis.passage_number,
          originalPassage: analysis.original_passage,
          summary: analysis.summary,
          keyPoints: JSON.parse(analysis.key_points || '[]'),
          vocabulary: JSON.parse(analysis.vocabulary || '[]'),
          grammarPoints: JSON.parse(analysis.grammar_points || '[]'),
          studyGuide: analysis.study_guide,
          comprehensionQuestions: JSON.parse(analysis.comprehension_questions || '[]'),
          createdAt: analysis.created_at,
          updatedAt: analysis.updated_at
        }));

        return res.json({
          success: true,
          data: formattedAnalyses,
          cached: true
        });
      } else {
        // 기존 종합 분석이 있지만 개별 지문 분석이 없는 경우 - 종합 분석 반환
        const formattedAnalysis = analyzer.formatFromDatabase(existingAnalysis);
        if (formattedAnalysis) {
          return res.json({
            success: true,
            data: [formattedAnalysis], // 배열로 감싸서 반환
            cached: true
          });
        }
      }
    }

    // 2. 문서 조회
    const document = await database.get(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.'
      });
    }

    console.log('🤖 AI 분석 시작...');

    // 3. AI 개별 지문 분석 수행
    const analysisResults = await analyzer.analyzeIndividualPassages(document.content);
    
    // 4. DB 저장 (각 지문별로)
    const savedAnalyses = [];
    for (const analysis of analysisResults) {
      const result = await database.run(
        `INSERT OR REPLACE INTO passage_analyses 
         (document_id, passage_number, original_passage, summary, key_points, vocabulary, grammar_points, study_guide, comprehension_questions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          analysis.passageNumber,
          analysis.originalPassage,
          analysis.summary,
          JSON.stringify(analysis.keyPoints),
          JSON.stringify(analysis.vocabulary),
          JSON.stringify(analysis.grammarPoints),
          analysis.studyGuide,
          JSON.stringify(analysis.comprehensionQuestions)
        ]
      );
      
      savedAnalyses.push({
        id: result.lastID,
        passageNumber: analysis.passageNumber,
        ...analysis
      });
    }
    
    console.log('✅ 모든 지문 분석 완료 및 저장');

    res.json({
      success: true,
      data: savedAnalyses,
      message: `총 ${savedAnalyses.length}개 지문이 분석되었습니다.`,
      cached: false
    });

  } catch (error) {
    console.error('문서 분석 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '문서 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});


/**
 * GET /api/analysis/:documentId/passages
 * 문서의 모든 분석된 지문 조회 (학생용)
 */
router.get('/:documentId/passages', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // 분석된 지문들 조회
    const passageAnalyses = await database.all(
      'SELECT * FROM passage_analyses WHERE document_id = ? ORDER BY passage_number',
      [documentId]
    );

    if (passageAnalyses.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: '아직 분석된 지문이 없습니다.'
      });
    }

    // 새로운 형식으로 변환
    const formattedAnalyses = passageAnalyses.map(analysis => ({
      passageNumber: analysis.passage_number,
      originalPassage: analysis.original_passage,
      sentenceAnalysis: JSON.parse(analysis.key_points || '[]'),
      deepAnalysis: JSON.parse(analysis.grammar_points || '{}'),
      keyExpressions: JSON.parse(analysis.vocabulary || '[]'),
      examplesAndBackground: JSON.parse(analysis.study_guide || '{}'),
      comprehensive: JSON.parse(analysis.comprehension_questions || '{}'),
      createdAt: analysis.created_at
    }));

    res.json({
      success: true,
      data: formattedAnalyses,
      total: formattedAnalyses.length
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

/**
 * POST /api/analysis/:documentId/analyze-passage
 * 개별 지문 분석 수행 (한 지문씩)
 */
router.post('/:documentId/analyze-passage', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { passageNumber } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 관리자만 분석 가능
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자만 분석을 수행할 수 있습니다.'
      });
    }

    console.log(`📊 개별 지문 분석 요청 - 문서: ${documentId}, 지문: ${passageNumber}`);

    // 1. 기존 분석 결과 확인
    const existingAnalysis = await database.get(
      'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
      [documentId, passageNumber]
    );

    if (existingAnalysis) {
      console.log('💾 이미 분석된 지문입니다.');
      return res.json({
        success: true,
        data: {
          passageNumber: existingAnalysis.passage_number,
          sentenceAnalysis: JSON.parse(existingAnalysis.key_points || '[]'),
          deepAnalysis: JSON.parse(existingAnalysis.grammar_points || '{}'),
          keyExpressions: JSON.parse(existingAnalysis.vocabulary || '[]'),
          examplesAndBackground: JSON.parse(existingAnalysis.study_guide || '{}'),
          comprehensive: JSON.parse(existingAnalysis.comprehension_questions || '{}'),
          cached: true
        }
      });
    }

    // 2. 문서 조회
    const document = await database.get(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.'
      });
    }

    // 3. 문서에서 해당 지문 추출 (순서배열 문제와 동일한 방식)
    let passages = [];
    try {
      const parsedContent = JSON.parse(document.content);
      passages = parsedContent.passages || [];
      console.log(`📄 문서 파싱 성공: ${passages.length}개 지문`);
    } catch (e) {
      console.error('❌ 문서 파싱 실패:', e);
      return res.status(400).json({
        success: false,
        message: '문서 형식이 올바르지 않습니다. JSON 파싱 실패'
      });
    }

    if (passageNumber < 1 || passageNumber > passages.length) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 지문 번호입니다. (1-${passages.length})`
      });
    }

    const passage = passages[passageNumber - 1];
    console.log('🤖 AI 개별 지문 분석 시작...');

    // 4. AI 분석 수행
    const analysis = await analyzer.analyzeIndividualPassage(passage, passageNumber);

    // 5. DB 저장
    const dbData = analyzer.formatForDatabase(analysis);
    await database.run(
      `INSERT OR REPLACE INTO passage_analyses 
       (document_id, passage_number, original_passage, summary, key_points, vocabulary, grammar_points, study_guide, comprehension_questions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        passageNumber,
        passage,
        dbData.summary,
        dbData.key_points,
        dbData.vocabulary,
        dbData.grammar_points,
        dbData.study_guide,
        dbData.comprehension_questions
      ]
    );

    console.log(`✅ 지문 ${passageNumber} 분석 완료 및 저장`);

    res.json({
      success: true,
      data: analysis,
      message: `지문 ${passageNumber} 분석이 완료되었습니다.`,
      totalPassages: passages.length,
      cached: false
    });

  } catch (error) {
    console.error('개별 지문 분석 오류:', error);
    res.status(500).json({
      success: false,
      message: '지문 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * GET /api/analysis/:documentId/passage/:passageNumber
 * 특정 지문 분석 조회
 */
router.get('/:documentId/passage/:passageNumber', verifyToken, async (req, res) => {
  try {
    const { documentId, passageNumber } = req.params;
    
    const passageAnalysis = await database.get(
      'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
      [documentId, passageNumber]
    );

    if (!passageAnalysis) {
      return res.status(404).json({
        success: false,
        message: '해당 지문의 분석 결과를 찾을 수 없습니다.'
      });
    }

    // 새로운 형식으로 변환
    const formattedAnalysis = {
      passageNumber: passageAnalysis.passage_number,
      originalPassage: passageAnalysis.original_passage,
      sentenceAnalysis: JSON.parse(passageAnalysis.key_points || '[]'),
      deepAnalysis: JSON.parse(passageAnalysis.grammar_points || '{}'),
      keyExpressions: JSON.parse(passageAnalysis.vocabulary || '[]'),
      examplesAndBackground: JSON.parse(passageAnalysis.study_guide || '{}'),
      comprehensive: JSON.parse(passageAnalysis.comprehension_questions || '{}'),
      createdAt: passageAnalysis.created_at
    };

    res.json({
      success: true,
      data: formattedAnalysis,
      cached: true
    });

  } catch (error) {
    console.error('지문 분석 조회 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '지문 분석 결과 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 기존 종합 분석 코드 (백업)
 */
router.post('/comprehensive/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    console.log(`📊 문서 ${documentId} 종합 분석 요청 (사용자: ${req.user.id})`);

    // 기존 종합 분석이 있는지 확인
    const existing = await database.get(
      'SELECT * FROM document_analyses WHERE document_id = ? AND analysis_type = ?',
      [documentId, 'comprehensive']
    );

    if (existing) {
      const formattedAnalysis = analyzer.formatFromDatabase(existing);
      return res.json({
        success: true,
        data: formattedAnalysis,
        cached: true
      });
    }

    // 2. 문서 조회
    const document = await database.get(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.'
      });
    }

    console.log('🤖 AI 종합 분석 시작...');

    // 3. AI 종합 분석 수행 (기존 방식)
    const analysisResult = await analyzer.analyzeDocument(document.content);
    
    // 4. DB 저장
    const dbData = analyzer.formatForDatabase(analysisResult);
    const result = await database.run(
      `INSERT INTO document_analyses 
       (document_id, analysis_type, summary, key_points, vocabulary, grammar_points, study_guide, comprehension_questions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        'comprehensive',
        dbData.summary,
        dbData.key_points,
        dbData.vocabulary,
        dbData.grammar_points,
        dbData.study_guide,
        dbData.comprehension_questions
      ]
    );

    // 5. 저장된 데이터 조회
    console.log('DB 조회 시도 - ID:', result.lastID);
    const savedAnalysis = await database.get(
      'SELECT * FROM document_analyses WHERE id = ?',
      [result.lastID]
    );
    
    console.log('DB 조회 결과:', savedAnalysis ? 'Found' : 'Not found');

    const formattedAnalysis = analyzer.formatFromDatabase(savedAnalysis);

    if (!formattedAnalysis) {
      return res.status(500).json({
        success: false,
        message: '분석 결과를 저장하는 중 오류가 발생했습니다.'
      });
    }

    console.log('✅ 문서 분석 완료 및 저장');

    res.json({
      success: true,
      data: formattedAnalysis,
      cached: false
    });

  } catch (error) {
    console.error('문서 분석 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '문서 분석 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 문서 분석 삭제 (재분석을 위해)
 * DELETE /api/analysis/:documentId
 */
router.delete('/:documentId', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    // 관리자 권한 확인
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: '분석 삭제 권한이 없습니다.'
      });
    }

    console.log(`🗑️ 문서 ${documentId} 분석 삭제 요청 (사용자: ${userId})`);

    await database.run(
      'DELETE FROM document_analyses WHERE document_id = ?',
      [documentId]
    );

    console.log('✅ 분석 결과 삭제 완료');

    res.json({
      success: true,
      message: '분석 결과가 삭제되었습니다. 다시 분석할 수 있습니다.'
    });

  } catch (error) {
    console.error('분석 삭제 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '분석 삭제 중 오류가 발생했습니다.'
    });
  }
});


/**
 * 문서별 분석 상태 확인
 * GET /api/analysis/status/:documentId
 */
router.get('/status/:documentId', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const existingAnalysis = await database.get(
      'SELECT id, created_at FROM document_analyses WHERE document_id = ?',
      [documentId]
    );

    res.json({
      success: true,
      data: {
        hasAnalysis: !!existingAnalysis,
        analysisId: existingAnalysis?.id || null,
        createdAt: existingAnalysis?.created_at || null
      }
    });

  } catch (error) {
    console.error('분석 상태 확인 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '분석 상태 확인 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
