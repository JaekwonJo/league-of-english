/**
 * 문서 분석 서비스 레이어
 * 비즈니스 로직과 데이터 접근 분리
 */

const database = require('../models/database');
const DocumentAnalyzer = require('../utils/documentAnalyzer');

class AnalysisService {
  constructor() {
    this.analyzer = new DocumentAnalyzer();
  }

  /**
   * 분석 가능한 문서 목록 조회
   */
  async getDocumentList(userId, userRole) {
    try {
      let documents;
      
      if (userRole === 'admin') {
        documents = await database.all(
          'SELECT id, title, type, category, school, grade, created_at FROM documents ORDER BY created_at DESC'
        );
      } else {
        documents = await database.all(
          'SELECT id, title, type, category, school, grade, created_at FROM documents WHERE created_by = ? ORDER BY created_at DESC',
          [userId]
        );
      }
      
      return {
        success: true,
        data: documents,
        message: `총 ${documents.length}개의 문서가 있습니다.`
      };
    } catch (error) {
      throw new Error(`문서 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 문서의 모든 분석된 지문 조회
   */
  async getAnalyzedPassages(documentId) {
    try {
      const passageAnalyses = await database.all(
        'SELECT * FROM passage_analyses WHERE document_id = ? ORDER BY passage_number',
        [documentId]
      );

      if (passageAnalyses.length === 0) {
        return {
          success: true,
          data: [],
          message: '아직 분석된 지문이 없습니다.'
        };
      }

      const formattedAnalyses = passageAnalyses.map(analysis => this.formatPassageAnalysis(analysis));
      
      return {
        success: true,
        data: formattedAnalyses,
        total: formattedAnalyses.length
      };
    } catch (error) {
      throw new Error(`분석된 지문 조회 실패: ${error.message}`);
    }
  }

  /**
   * 개별 지문 분석 수행
   */
  async analyzePassage(documentId, passageNumber, userRole) {
    try {
      // 권한 체크
      if (userRole !== 'admin') {
        throw new Error('관리자만 분석을 수행할 수 있습니다.');
      }

      // 기존 분석 확인
      const existingAnalysis = await this.getPassageAnalysis(documentId, passageNumber);
      if (existingAnalysis) {
        return {
          success: true,
          data: existingAnalysis,
          cached: true
        };
      }

      // 문서 조회
      const document = await database.get(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );

      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // 지문 추출
      const passages = this.extractPassages(document.content);
      if (passageNumber < 1 || passageNumber > passages.length) {
        throw new Error(`유효하지 않은 지문 번호입니다. (1-${passages.length})`);
      }

      const passage = passages[passageNumber - 1];
      
      // AI 분석
      console.log('🤖 AI 개별 지문 분석 시작...');
      const analysis = await this.analyzer.analyzeIndividualPassage(passage, passageNumber);
      
      // DB 저장
      await this.savePassageAnalysis(documentId, passageNumber, passage, analysis);
      
      return {
        success: true,
        data: analysis,
        message: `지문 ${passageNumber} 분석이 완료되었습니다.`,
        totalPassages: passages.length,
        cached: false
      };
    } catch (error) {
      throw new Error(`지문 분석 실패: ${error.message}`);
    }
  }

  /**
   * 특정 지문 분석 조회
   */
  async getPassageAnalysis(documentId, passageNumber) {
    try {
      const passageAnalysis = await database.get(
        'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
        [documentId, passageNumber]
      );

      if (!passageAnalysis) {
        return null;
      }

      return this.formatPassageAnalysis(passageAnalysis);
    } catch (error) {
      throw new Error(`지문 분석 조회 실패: ${error.message}`);
    }
  }

  /**
   * 문서 내용에서 지문 추출
   */
  extractPassages(content) {
    try {
      const parsedContent = JSON.parse(content);
      return parsedContent.passages || [];
    } catch (e) {
      throw new Error('문서 형식이 올바르지 않습니다.');
    }
  }

  /**
   * 지문 분석 결과 DB 저장
   */
  async savePassageAnalysis(documentId, passageNumber, passage, analysis) {
    const dbData = this.analyzer.formatForDatabase(analysis);
    
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
  }

  /**
   * DB 데이터를 클라이언트 형식으로 변환
   */
  formatPassageAnalysis(dbAnalysis) {
    return {
      passageNumber: dbAnalysis.passage_number,
      originalPassage: dbAnalysis.original_passage,
      sentenceAnalysis: JSON.parse(dbAnalysis.key_points || '[]'),
      deepAnalysis: JSON.parse(dbAnalysis.grammar_points || '{}'),
      keyExpressions: JSON.parse(dbAnalysis.vocabulary || '[]'),
      examplesAndBackground: JSON.parse(dbAnalysis.study_guide || '{}'),
      comprehensive: JSON.parse(dbAnalysis.comprehension_questions || '{}'),
      createdAt: dbAnalysis.created_at
    };
  }

  /**
   * 종합 분석 수행 또는 조회
   */
  async getOrCreateAnalysis(documentId) {
    try {
      // 기존 분석 확인
      const existingAnalysis = await database.get(
        'SELECT * FROM document_analyses WHERE document_id = ?',
        [documentId]
      );

      if (existingAnalysis) {
        console.log('💾 기존 분석 결과 반환');
        
        // 개별 지문 분석 우선 확인
        const passageAnalyses = await this.getAnalyzedPassages(documentId);
        if (passageAnalyses.data.length > 0) {
          return {
            success: true,
            data: passageAnalyses.data,
            cached: true
          };
        }
        
        // 종합 분석 반환
        const formattedAnalysis = this.analyzer.formatFromDatabase(existingAnalysis);
        return {
          success: true,
          data: [formattedAnalysis],
          cached: true
        };
      }

      // 문서 조회
      const document = await database.get(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );

      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // AI 분석 수행
      console.log('🤖 AI 분석 시작...');
      const analysisResults = await this.analyzer.analyzeIndividualPassages(document.content);
      
      // 각 지문별로 저장
      const savedAnalyses = [];
      for (const analysis of analysisResults) {
        await this.savePassageAnalysis(
          documentId, 
          analysis.passageNumber, 
          analysis.originalPassage, 
          analysis
        );
        savedAnalyses.push(analysis);
      }
      
      return {
        success: true,
        data: savedAnalyses,
        message: `총 ${savedAnalyses.length}개 지문이 분석되었습니다.`,
        cached: false
      };
    } catch (error) {
      throw new Error(`문서 분석 실패: ${error.message}`);
    }
  }
}

module.exports = new AnalysisService();