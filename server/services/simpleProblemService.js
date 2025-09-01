/**
 * 초단순 문제 생성 서비스
 * 1페이지 = 1지문 = 1문제 원칙
 */

class SimpleProblemService {
  /**
   * 스마트 문제 생성 (메인 함수)
   */
  async getSmartProblems(userId, documentId, types, count, options = {}) {
    try {
      console.log('🎯 초간단 문제 생성 시작');
      console.log(`📋 요청: 사용자${userId}, 문서${documentId}, ${count}개 문제`);

      // 문서 조회
      const database = require('../models/database');
      const document = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
      
      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // JSON 파싱 시도
      let parsedContent = null;
      try {
        parsedContent = JSON.parse(document.content);
        console.log('🔍 파싱된 content 구조:', Object.keys(parsedContent || {}));
        console.log('🔍 passages 필드 존재:', !!parsedContent?.passages);
        console.log('🔍 passages 길이:', parsedContent?.passages?.length || 'N/A');
      } catch (e) {
        console.log('기존 텍스트 형식 문서');
        console.log('🔍 원본 content 길이:', document.content?.length || 0);
      }

      // 순서배열 문제만 지원
      const problems = [];
      const typeArray = Array.isArray(types) ? types : [types];
      
      if (typeArray.includes('order')) {
        console.log('🔍 order 타입 요청됨, generateOrderProblems 호출 시작');
        const orderProblems = this.generateOrderProblems(document, parsedContent, count, options);
        console.log('🔍 generateOrderProblems 결과:', orderProblems?.length || 0);
        problems.push(...orderProblems);
      } else {
        console.log('🔍 요청된 타입:', typeArray, 'order가 포함되지 않음');
      }

      console.log(`✅ ${problems.length}개 문제 생성 완료`);
      return problems;

    } catch (error) {
      console.error('문제 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 순서배열 문제 생성 (핵심 로직)
   */
  generateOrderProblems(document, parsedContent, count, options) {
    console.log('🔄 순서배열 문제 생성 시작');

    // 페이지별 지문 추출
    let pages = [];
    if (parsedContent && parsedContent.passages) {
      console.log(`🔍 parsedContent.passages 발견: ${parsedContent.passages.length}개`);
      pages = this.groupPassagesByPage(parsedContent.passages);
    } else {
      console.log('❌ parsedContent 구조 확인:');
      console.log('parsedContent:', parsedContent ? 'exists' : 'null');
      console.log('passages:', parsedContent?.passages ? 'exists' : 'null');
      console.log('❌ 실제 parsedContent:', JSON.stringify(parsedContent, null, 2));
      throw new Error('파싱된 지문이 없습니다.');
    }

    console.log(`📄 총 ${pages.length}개 페이지 발견`);

    const problems = [];
    const difficulty = options.orderDifficulty === 'advanced' ? 'advanced' : 'basic';
    const targetParts = difficulty === 'advanced' ? 5 : 3;

    // 각 페이지에서 1문제씩 생성
    for (let i = 0; i < Math.min(count, pages.length); i++) {
      const page = pages[i];
      console.log(`🎯 페이지 ${i + 1} 문제 생성 시도: ${page.length}개 지문`);
      const problem = this.createOrderProblemFromPage(page, targetParts, i + 1);
      
      if (problem) {
        problems.push(problem);
        console.log(`✅ 페이지 ${i + 1} 문제 생성 완료`);
      } else {
        console.log(`❌ 페이지 ${i + 1} 문제 생성 실패`);
      }
    }

    console.log(`🎯 최종 결과: ${problems.length}개 문제 생성됨`);
    return problems;
  }

  /**
   * 지문들을 페이지별로 그룹화
   */
  groupPassagesByPage(passages) {
    const pages = [];
    let currentPage = [];
    
    for (const passage of passages) {
      // 각 지문이 하나의 페이지로 간주
      // 실제로는 번호 패턴 등으로 페이지를 구분할 수 있음
      if (passage.length > 100) { // 최소 길이 체크
        pages.push([passage]); // 1페이지 = 1지문
      }
    }

    console.log(`📋 ${passages.length}개 지문 → ${pages.length}개 페이지로 그룹화`);
    return pages;
  }

  /**
   * 한 페이지에서 순서배열 문제 생성
   */
  createOrderProblemFromPage(pagePassages, targetParts, problemNumber) {
    // 페이지의 첫 번째(유일한) 지문 사용
    const passage = pagePassages[0];
    
    // 문장 분리
    const sentences = this.splitIntoSentences(passage);
    
    if (sentences.length < targetParts + 1) {
      console.log(`⚠️ 페이지 ${problemNumber}: 문장 부족 (${sentences.length}개 < ${targetParts + 1}개 필요)`);
      return null;
    }

    // 첫 문장 = 주어진 문장
    const mainText = sentences[0];

    // 나머지 문장들을 targetParts개로 랜덤 분할
    const remainingSentences = sentences.slice(1);
    const parts = this.randomSplitSentences(remainingSentences, targetParts);

    // A-B-C-D-E 라벨링 (올바른 순서)
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts);
    
    // 무작위 순서로 섞기
    const shuffledParts = [...parts];
    const shuffledLabels = [...correctOrder];
    
    // Fisher-Yates 셔플
    for (let i = shuffledParts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledParts[i], shuffledParts[j]] = [shuffledParts[j], shuffledParts[i]];
      [shuffledLabels[i], shuffledLabels[j]] = [shuffledLabels[j], shuffledLabels[i]];
    }
    
    const sentenceChoices = shuffledParts.map((part, index) => ({
      label: shuffledLabels[index],
      text: part.join(' ').trim()
    }));

    console.log(`🎯 문제 ${problemNumber}: 주어진 문장 + ${targetParts}개 선택지 (정답: ${correctOrder.join('')})`);
    
    return {
      type: 'order',
      mainText: mainText,
      sentences: sentenceChoices,
      answer: correctOrder.join(''), // 진짜 원본 순서
      explanation: `올바른 순서는 ${correctOrder.join('-')}입니다.`,
      is_ai_generated: false,
      metadata: {
        source: `page-${problemNumber}`,
        difficulty: targetParts === 3 ? 'basic' : 'advanced'
      }
    };
  }

  /**
   * 문장 분리 - 완전한 문장만 추출
   */
  splitIntoSentences(text) {
    // 마침표, 느낌표, 물음표로 끝나는 완전한 문장만 분리
    const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
    
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 20) // 너무 짧은 문장 제외
      .filter(s => /[a-zA-Z]/.test(s)); // 영어가 포함된 문장만
  }

  /**
   * 문장들을 targetParts개로 랜덤 분할
   */
  randomSplitSentences(sentences, targetParts) {
    if (sentences.length <= targetParts) {
      return sentences.map(s => [s]);
    }

    // 각 파트에 최소 1문장씩 배정
    const parts = Array.from({ length: targetParts }, () => []);
    
    // 첫 targetParts개 문장은 각 파트에 하나씩
    for (let i = 0; i < targetParts; i++) {
      parts[i].push(sentences[i]);
    }

    // 나머지 문장들은 랜덤하게 배정
    for (let i = targetParts; i < sentences.length; i++) {
      const randomPart = Math.floor(Math.random() * targetParts);
      parts[randomPart].push(sentences[i]);
    }

    return parts;
  }
}

module.exports = SimpleProblemService;