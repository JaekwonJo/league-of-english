/**
 * 초단순 문제 생성 서비스 - 모듈화된 버전
 * 원리: 1페이지 = 1지문 = 첫문장+나머지문장을 3개로 균등분할
 */

const OrderProblemGenerator = require('../utils/orderProblemGenerator');
const InsertionProblemGenerator = require('../utils/insertionProblemGenerator2');
const { generateCSATGrammarProblem, generateAdvancedGrammarProblem } = require('../utils/csatGrammarGenerator');

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

      if (typeArray.includes('grammar')) {
        console.log('🔄 CSAT 어법문제 생성 시작');
        const grammarProblems = this.generateGrammarProblems(parsedContent.passages, count, options, document, parsedContent);
        problems.push(...grammarProblems);
      }

      console.log(`✅ ${problems.length}개 문제 생성 완료`);
      return problems;

    } catch (error) {
      console.error('문제 생성 실패:', error);
      throw error;
    }
  }











  /**
   * CSAT 수능급 어법문제 생성
   */
  generateGrammarProblems(passages, count, options = {}, document, parsedContent) {
    const problems = [];
    
    try {
      console.log(`📄 총 ${passages.length}개 지문 중 ${count}개 어법문제 생성`);
      
      // 사용할 지문 선택 (각 문제마다 다른 지문 사용)
      const availablePassages = [...passages];
      const usedIndices = [];
      
      // 요청한 개수만큼 생성 시도
      let successCount = 0;
      let attemptCount = 0;
      
      while (successCount < count && attemptCount < count * 3) {
        try {
          // 지문 선택 (순환 방식)
          const passageIndex = successCount % availablePassages.length;
          const selectedPassage = availablePassages[passageIndex];
          
          // 난이도에 따라 다른 함수 호출
          const grammarProblem = options.grammarDifficulty === 'advanced' ?
            generateAdvancedGrammarProblem(selectedPassage, {
              seed: Date.now() + attemptCount
            }) :
            generateCSATGrammarProblem(selectedPassage, {
              seed: Date.now() + attemptCount,
              difficulty: options.grammarDifficulty || 'basic'
            });
          
          // 문제가 제대로 생성되었는지 확인
          if (!grammarProblem || !grammarProblem.question) {
            throw new Error('문제 생성 실패: grammarProblem이 null 또는 불완전');
          }
          
          // 서비스 응답 형식으로 변환
          const formattedProblem = {
            id: `grammar_${Date.now()}_${successCount}`,
            type: grammarProblem.type || 'grammar',
            difficulty: grammarProblem.difficulty || 'advanced',
            question: grammarProblem.question,
            choices: grammarProblem.choices,
            correctAnswer: grammarProblem.correctAnswer,
            explanation: grammarProblem.explanation,
            text: grammarProblem.text, // 고급 모드용
            documentTitle: document.title || '문서',
            category: document.category || 'general',
            passageNumber: passageIndex + 1, // 지문 번호 추가 (1부터 시작)
            source: `지문 ${passageIndex + 1}번`, // 출처 표시
            metadata: {
              ...grammarProblem.metadata,
              source: 'CSAT_grammar_generator',
              passageIndex: passageIndex,
              passageNumber: passageIndex + 1
            }
          };
          
          problems.push(formattedProblem);
          successCount++;
          
          console.log(`✅ 어법문제 ${successCount} 생성 완료 (패턴: ${grammarProblem.metadata?.pattern})`);
          
        } catch (err) {
          console.warn(`⚠️ 어법문제 생성 시도 ${attemptCount + 1} 실패:`, err.message);
        }
        
        attemptCount++;
      }
      
      if (problems.length === 0) {
        console.warn('❌ 어법문제를 하나도 생성하지 못했습니다.');
      }
      
      console.log(`🎯 어법문제 ${problems.length}개 생성 완료`);
      return problems;
      
    } catch (error) {
      console.error('어법문제 생성 전체 실패:', error);
      return [];
    }
  }
}

module.exports = UltraSimpleProblemService;