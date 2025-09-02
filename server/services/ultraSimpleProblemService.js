/**
 * 초단순 문제 생성 서비스 - 모듈화된 버전
 * 원리: 1페이지 = 1지문 = 첫문장+나머지문장을 3개로 균등분할
 */

const OrderProblemGenerator = require('../utils/orderProblemGenerator');
const InsertionProblemGenerator = require('../utils/insertionProblemGenerator2');

class UltraSimpleProblemService {
  /**
   * 스마트 문제 생성 (메인 함수)
   */
  async getSmartProblems(userId, documentId, types, count, options = {}) {
    try {
      console.log('🎯 울트라심플 문제 생성 시작');
      console.log(`📋 요청 디버깅:`, {
        userId,
        documentId,
        types,
        count: count,
        countType: typeof count,
        isArrayTypes: Array.isArray(types),
        typesContent: types,
        options
      });

      // 문서 조회
      const database = require('../models/database');
      const document = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
      
      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // JSON 파싱
      let parsedContent = null;
      try {
        parsedContent = JSON.parse(document.content);
        console.log('🔍 파싱 성공. passages:', parsedContent?.passages?.length || 0);
      } catch (e) {
        console.log('❌ JSON 파싱 실패');
        throw new Error('파싱된 지문이 없습니다.');
      }

      if (!parsedContent?.passages) {
        throw new Error('지문 데이터가 없습니다.');
      }

      // 문제 생성
      const problems = [];
      const typeArray = Array.isArray(types) ? types : [types];
      
      if (typeArray.includes('order')) {
        console.log('🔄 순서배열 문제 생성 시작');
        console.log(`🔍 순서배열에 할당된 count: ${count}`);
        const orderProblems = OrderProblemGenerator.generateOrderProblems(parsedContent.passages, count, options, document, parsedContent);
        console.log(`✅ 순서배열 생성 결과: ${orderProblems.length}개`);
        problems.push(...orderProblems);
      }

      if (typeArray.includes('insertion')) {
        console.log('🔄 문장삽입 문제 생성 시작');
        const insertionProblems = InsertionProblemGenerator.generateInsertionProblems(parsedContent.passages, count, options, document, parsedContent);
        problems.push(...insertionProblems);
      }

      console.log(`✅ ${problems.length}개 문제 생성 완료`);
      return problems;

    } catch (error) {
      console.error('문제 생성 실패:', error);
      throw error;
    }
  }











}

module.exports = UltraSimpleProblemService;