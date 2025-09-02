/**
 * 문장 삽입 문제 생성기
 * 원칙: 원문에서 무작위 문장을 선택 -> 주어진 문장으로 만들고 -> 무작위 위치에 번호 삽입
 */

class InsertionProblemGenerator {
  constructor() {
    this.name = 'InsertionProblemGenerator';
    console.log('✅ InsertionProblemGenerator 초기화');
  }

  /**
   * 문장 삽입 문제 생성
   * @param {Array} passages - 영어 원본 지문 배열
   * @param {string} difficulty - 'basic' (5개 위치) or 'advanced' (7개 위치)
   * @param {number} count - 생성할 문제 수
   * @returns {Array} 생성된 문제 배열
   */
  generateInsertionProblems(passages, difficulty = 'basic', count = 1) {
    const problems = [];
    
    try {
      for (let i = 0; i < count; i++) {
        const problem = this.createSingleInsertionProblem(passages, difficulty);
        if (problem) {
          problems.push(problem);
        }
      }
    } catch (error) {
      console.error('🚨 문장삽입 문제 생성 실패:', error);
    }
    
    console.log(`✅ 문장삽입 문제 ${problems.length}개 생성 완료`);
    return problems;
  }

  /**
   * 단일 문장삽입 문제 생성
   */
  createSingleInsertionProblem(passages, difficulty) {
    try {
      // 1. 무작위 지문 선택
      const passage = this.selectRandomPassage(passages);
      if (!passage) {
        throw new Error('사용 가능한 지문이 없습니다');
      }

      // 2. 영어 문장들 추출
      let sentences = this.extractEnglishSentences(passage);
      
      // 문장이 부족하면 다른 지문들도 합쳐서 시도
      if (sentences.length < 5 && passages.length > 1) {
        console.log('🔧 문장이 부족하여 다른 지문들을 추가로 추출합니다...');
        for (const otherPassage of passages) {
          if (sentences.length >= 5) break;
          const otherContent = typeof otherPassage === 'string' ? otherPassage : (otherPassage.content || '');
          if (otherContent !== passage.content) {
            const additionalSentences = this.extractEnglishSentences(otherPassage);
            sentences = [...sentences, ...additionalSentences];
          }
        }
      }
      
      if (sentences.length < 3) {
        throw new Error('문장이 충분하지 않습니다 (최소 3개 필요)');
      }

      // 3. 무작위 문장을 "주어진 문장"으로 선택
      const insertionIndex = Math.floor(Math.random() * (sentences.length - 2)) + 1; // 첫 번째, 마지막 문장 제외
      const givenSentence = sentences[insertionIndex].trim();
      
      // 4. 주어진 문장을 제거한 나머지 문장들
      const remainingSentences = sentences.filter((_, idx) => idx !== insertionIndex);
      
      // 5. 난이도에 따른 위치 개수 결정
      const positionCount = difficulty === 'advanced' ? 7 : 5;
      
      // 6. 삽입 위치 마커 생성 및 본문 구성
      const { mainText, correctPosition } = this.createTextWithMarkers(
        remainingSentences, 
        positionCount, 
        insertionIndex
      );

      // 7. 객관식 선택지 생성 (①~⑤ 또는 ①~⑦)
      const multipleChoices = this.generateMultipleChoices(positionCount, correctPosition);

      // 8. 문제 구조 반환
      const problem = {
        type: 'insertion',
        instruction: 'Q. 다음 글의 빈 곳에 들어갈 문장으로 가장 적절한 것을 고르시오.',
        givenSentence: givenSentence,
        mainText: mainText,
        multipleChoices: multipleChoices,
        correctAnswer: correctPosition,
        explanation: `주어진 문장은 ${this.getPositionSymbol(correctPosition)} 위치에 들어가는 것이 가장 적절합니다.`,
        metadata: {
          difficulty: difficulty,
          originalTitle: passage.title || '영어 지문',
          passageNumber: Math.floor(Math.random() * 100) + 1,
          problemNumber: `문장삽입-${Date.now()}`
        }
      };

      console.log(`✅ 문장삽입 문제 생성: ${difficulty} 레벨, ${positionCount}개 위치`);
      return problem;

    } catch (error) {
      console.error('🚨 단일 문제 생성 실패:', error);
      return null;
    }
  }

  /**
   * 무작위 지문 선택
   */
  selectRandomPassage(passages) {
    if (!Array.isArray(passages) || passages.length === 0) {
      console.warn('⚠️ 빈 지문 배열');
      return null;
    }

    const validPassages = passages.filter(p => {
      const content = typeof p === 'string' ? p : (p.content || p.text || '');
      return content.length > 100; // 최소 길이 체크
    });

    if (validPassages.length === 0) {
      console.warn('⚠️ 유효한 지문이 없습니다');
      return null;
    }

    const selected = validPassages[Math.floor(Math.random() * validPassages.length)];
    return typeof selected === 'string' ? { content: selected } : selected;
  }

  /**
   * 영어 문장 추출
   */
  extractEnglishSentences(passage) {
    const content = typeof passage === 'string' ? passage : (passage.content || passage.text || '');
    
    console.log('🔍 지문 내용 확인:', content.substring(0, 100) + '...');
    
    // 더 관대한 영어 문장 패턴
    const sentencePattern = /[A-Z][^.!?]*[.!?]+/g;
    let sentences = content.match(sentencePattern) || [];
    
    // 패턴이 실패하면 더 단순한 분할 시도
    if (sentences.length < 3) {
      sentences = content.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10)
        .map(s => s + '.'); // 마침표 추가
    }
    
    console.log(`🔍 추출된 문장 ${sentences.length}개:`, sentences.map(s => s.substring(0, 30) + '...'));
    
    // 최소 길이 필터링 및 정리
    const filtered = sentences
      .map(s => s.trim())
      .filter(s => s.length > 15); // 더 관대한 길이 조건
    
    console.log(`🔍 필터링 후 ${filtered.length}개 문장`);
    return filtered;
  }

  /**
   * 영어 문장인지 확인
   */
  isEnglishSentence(text) {
    // 영어 단어 비율 체크 (최소 70%)
    const words = text.split(/\s+/);
    const englishWords = words.filter(word => /^[a-zA-Z']+$/.test(word.replace(/[.,;:!?]$/, '')));
    return englishWords.length / words.length > 0.7;
  }

  /**
   * 마커와 함께 본문 생성
   */
  createTextWithMarkers(sentences, positionCount, originalInsertionIndex) {
    // 전체 문장을 더 작은 단위로 분할하여 위치 생성
    const allText = sentences.join(' ');
    const parts = this.splitIntoPositions(allText, positionCount);
    
    // 무작위 위치에 정답 설정 (1번~positionCount번 중 하나)
    const correctPosition = Math.floor(Math.random() * positionCount) + 1;
    
    // 마커가 포함된 본문 생성
    let mainText = '';
    for (let i = 0; i < parts.length; i++) {
      mainText += parts[i];
      if (i < parts.length - 1) {
        mainText += ` ${this.getPositionSymbol(i + 1)} `;
      }
    }

    return { mainText, correctPosition };
  }

  /**
   * 텍스트를 위치에 맞게 분할
   */
  splitIntoPositions(text, positionCount) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const parts = [];
    const sentencesPerPart = Math.max(1, Math.floor(sentences.length / positionCount));
    
    for (let i = 0; i < positionCount; i++) {
      const start = i * sentencesPerPart;
      const end = i === positionCount - 1 ? sentences.length : (i + 1) * sentencesPerPart;
      const part = sentences.slice(start, end).join(' ').trim();
      if (part) parts.push(part);
    }
    
    return parts.length > 0 ? parts : [text]; // 분할 실패 시 전체 텍스트 반환
  }

  /**
   * 위치 기호 반환 (①, ②, ③, ...)
   */
  getPositionSymbol(position) {
    const symbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
    return symbols[position - 1] || `(${position})`;
  }

  /**
   * 객관식 선택지 생성
   */
  generateMultipleChoices(positionCount, correctPosition) {
    const choices = [];
    
    for (let i = 1; i <= positionCount; i++) {
      choices.push({
        number: i,
        symbol: this.getPositionSymbol(i),
        isCorrect: i === correctPosition
      });
    }
    
    return choices;
  }
}

module.exports = InsertionProblemGenerator;