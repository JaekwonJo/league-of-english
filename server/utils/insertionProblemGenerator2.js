/**
 * 문장삽입 문제 생성기
 */

const ProblemGenerationUtils = require('./problemGenerationUtils');

class InsertionProblemGenerator {
  /**
   * 문장삽입 문제 생성
   */
  static generateInsertionProblems(passages, count, options, document, parsedContent) {
    const problems = [];
    // 문장삽입은 기본 레벨만 제공 (고급 레벨 비활성화)
    const difficulty = 'basic';
    const maxChoices = 5;

    console.log(`📄 총 ${passages.length}개 지문 중 ${count}개 문장삽입 문제 생성`);

    // 🎯 요청한 개수만큼 생성될 때까지 재시도
    const shuffledIndexes = ProblemGenerationUtils.shuffleArray([...Array(passages.length).keys()]);
    let attemptCount = 0;
    let passageIndex = 0;
    
    console.log(`🎲 랜덤 선택된 페이지 순서: [${shuffledIndexes.map(i => i + 1).join(', ')}]`);

    // 요청한 개수만큼 생성될 때까지 반복
    while (problems.length < count && attemptCount < passages.length * 2) {
      const currentIndex = shuffledIndexes[passageIndex % shuffledIndexes.length];
      const passage = passages[currentIndex];
      
      console.log(`🎯 문장삽입 문제 ${problems.length + 1}: 원문 페이지 ${currentIndex + 1} 사용 (${passage.length}자)`);
      
      const problem = this.createInsertionProblem(passage, maxChoices, problems.length + 1, currentIndex + 1, document, parsedContent);
      if (problem) {
        problems.push(problem);
        console.log(`✅ 문장삽입 문제 ${problems.length} 생성 완료 (원문 페이지 ${currentIndex + 1})`);
      } else {
        console.log(`❌ 문장삽입 문제 ${problems.length + 1} 생성 실패 (원문 페이지 ${currentIndex + 1})`);
      }
      
      passageIndex++;
      attemptCount++;
    }

    console.log(`✅ ${problems.length}개 문제 생성 완료`);
    return problems;
  }

  /**
   * 한 지문에서 문장삽입 문제 생성 - 완전히 새로운 간단한 로직
   */
  static createInsertionProblem(passage, maxChoices, problemNumber, originalPageNumber, document, parsedContent) {
    console.log(`🎯 문장삽입 문제 생성 시작 (위치 ${maxChoices}개)`);
    
    // 1. 문장 분리 및 정리
    const rawSentences = passage.split('.');
    const sentences = ProblemGenerationUtils.filterValidSentences(rawSentences, 20);

    console.log(`📝 원본 ${rawSentences.length}개 → 유효 ${sentences.length}개 문장`);

    if (sentences.length < maxChoices) {
      console.log(`⚠️ 문장 부족: ${sentences.length}개 < ${maxChoices}개 필요`);
      return null;
    }

    // 2. 정확히 maxChoices개 문장만 사용
    const selectedSentences = sentences.slice(0, maxChoices);
    
    // 3. 이 중 하나를 랜덤 선택하여 "주어진 문장"으로 빼냄
    const randomIndex = Math.floor(Math.random() * maxChoices);
    const givenSentence = selectedSentences[randomIndex];
    
    // 4. 지문 생성 (빠진 자리에 빈 공간 표시)
    const textWithGap = this.createTextWithGap(selectedSentences, randomIndex, maxChoices);
    
    // 5. 정답은 빠진 위치 (1부터 시작)
    const correctPosition = randomIndex + 1;

    // 6. 객관식 선택지 (①②③④⑤)
    const multipleChoices = this.generateInsertionChoices(maxChoices);
    
    console.log(`✅ 문장삽입 문제: "${givenSentence.substring(0, 40)}..." → 정답 ${correctPosition}번`);

    // 제목과 출처 정보 설정
    const documentTitle = document ? document.title : '문서';
    const originalSource = parsedContent?.sources?.[originalPageNumber - 1] || `page-${originalPageNumber}`;
    
    return {
      type: 'insertion',
      givenSentence: givenSentence,
      mainText: textWithGap,
      multipleChoices: multipleChoices,
      answer: correctPosition.toString(), // 정답 위치 (1-maxChoices)
      explanation: `주어진 문장은 원문에서 ${correctPosition}번 위치에 들어가야 합니다.`,
      is_ai_generated: false,
      metadata: {
        originalTitle: documentTitle,
        problemNumber: originalSource,
        source: originalSource,
        difficulty: maxChoices === 5 ? 'basic' : 'advanced',
        originalPageNumber: originalPageNumber,
        correctPosition: correctPosition
      }
    };
  }

  /**
   * 간단하고 명확한 지문 생성 (빈 공간 포함) - 수정된 버전
   */
  static createTextWithGap(selectedSentences, gapIndex, maxChoices = 5) {
    const markers = ['①', '②', '③', '④', '⑤'];
    let result = '';
    
    console.log(`🔧 지문 생성: ${maxChoices}개 위치, ${gapIndex + 1}번 위치가 빈 공간`);
    console.log(`📝 선택된 문장들:`, selectedSentences.map(s => s.substring(0, 30)));
    
    // 빈 공간이 아닌 문장들만 별도로 처리
    const sentencesWithoutGap = selectedSentences.filter((_, idx) => idx !== gapIndex);
    let sentenceIndex = 0;
    
    for (let i = 0; i < maxChoices; i++) {
      // 위치 마커
      result += markers[i] + ' ';
      
      if (i === gapIndex) {
        // 빈 공간 - 아무것도 추가하지 않음
        console.log(`📍 ${i + 1}번: [빈 공간]`);
      } else {
        // 빈 공간이 아닌 문장 추가
        if (sentenceIndex < sentencesWithoutGap.length) {
          result += sentencesWithoutGap[sentenceIndex];
          console.log(`📍 ${i + 1}번: "${sentencesWithoutGap[sentenceIndex].substring(0, 30)}..."`);
          sentenceIndex++;
        }
      }
      
      // 마지막이 아니면 공백
      if (i < maxChoices - 1) {
        result += ' ';
      }
    }
    
    console.log(`✅ 지문 완성: "${result.substring(0, 100)}..."`);
    return result.trim();
  }

  /**
   * 문장삽입용 객관식 선택지 생성
   */
  static generateInsertionChoices(maxChoices) {
    const symbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
    
    return symbols.slice(0, maxChoices).map((symbol, index) => ({
      number: index + 1,
      symbol: symbol,
      value: (index + 1).toString()
    }));
  }
}

module.exports = InsertionProblemGenerator;
