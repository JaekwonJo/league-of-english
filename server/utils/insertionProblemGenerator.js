/**
 * 문장 삽입 문제 생성기
 * 원칙: 원문에서 완전한 문장을 추출하여 주어진 문장으로 하고, 나머지 문장들 사이에 5개 위치 생성
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

      // 3. 무작위 문장을 "주어진 문장"으로 선택 (완전한 문장 보장)
      const insertionIndex = Math.floor(Math.random() * (sentences.length - 2)) + 1; // 첫 번째, 마지막 문장 제외
      let givenSentence = sentences[insertionIndex].trim();
      
      // 🔧 주어진 문장 검증 및 정제
      givenSentence = this.validateAndFixGivenSentence(givenSentence);
      
      console.log(`🎯 선택된 주어진 문장 (${insertionIndex + 1}번째): "${givenSentence}"`);
      
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

      // 8. 문제 구조 반환 (올바른 형식으로 수정)
      const problem = {
        type: 'insertion',
        instruction: 'Q. 글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.',
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
   * 영어 문장 추출 (고급 버전 - 약어/인용문/숫자 처리 포함)
   */
  extractEnglishSentences(passage) {
    const content = typeof passage === 'string' ? passage : (passage.content || passage.text || '');
    
    console.log('🔍 지문 내용 확인:', content.substring(0, 100) + '...');
    
    // 약어 목록 정의
    const abbreviations = [
      'Dr', 'Prof', 'Mr', 'Mrs', 'Ms', 'Jr', 'Sr', 'Ph', 'M', 'B', 'A',
      'U.S.A', 'U.K', 'U.S', 'etc', 'vs', 'e.g', 'i.e', 'Inc', 'Corp', 'Ltd',
      'St', 'Ave', 'Blvd', 'Rd', 'p.m', 'a.m', 'Q1', 'Q2', 'Q3', 'Q4'
    ];
    
    const abbrevPattern = '(?:' + abbreviations.map(abbr => abbr.replace('.', '\\.')).join('|') + ')';
    
    // 개선된 문장 분리 패턴
    const sentencePattern = new RegExp(
      `(?<!\\b${abbrevPattern})[.!?](?=\\s+[A-Z"']|\\s*$)`,
      'g'
    );
    
    // 문장 분할
    const splitPoints = [];
    let match;
    while ((match = sentencePattern.exec(content)) !== null) {
      splitPoints.push(match.index + 1);
    }
    
    let sentences = [];
    let start = 0;
    
    for (const point of splitPoints) {
      const sentence = content.slice(start, point).trim();
      if (sentence && /[a-zA-Z]/.test(sentence)) {
        sentences.push(sentence);
      }
      start = point;
    }
    
    // 마지막 부분
    const lastPart = content.slice(start).trim();
    if (lastPart && /[a-zA-Z]/.test(lastPart)) {
      sentences.push(lastPart);
    }
    
    // 첫 번째 방법이 실패하면 기본 분할 사용
    if (sentences.length < 3) {
      console.log('🔧 기본 분할 방법 사용');
      const rawSentences = content.split(/(?<=[.!?"'])\s+(?=[A-Z"'])/);
      sentences = rawSentences
        .map(s => s.trim())
        .filter(s => s.length > 10 && /[a-zA-Z]/.test(s))
        .filter(s => /^[A-Z"']/.test(s)) // 대문자 또는 인용부호로 시작
        .map(s => (/[.!?"']$/.test(s)) ? s : s + '.');
    }
    
    // 마지막 방법: 가장 기본적인 분할 (원본 문장부호 보존 강화)
    if (sentences.length < 3) {
      console.log('🔧 기본 분할 방법 사용 - 원본 문장부호 보존');
      // 문장부호로 분할하되 원본 문장부호 정보 보존
      const sentenceEndings = content.match(/[.!?]/g) || ['.'];
      const sentenceParts = content.split(/[.!?]+/);
      
      sentences = sentenceParts
        .map((s, i) => {
          const trimmed = s.trim();
          if (trimmed.length < 15 || !/[a-zA-Z]/.test(trimmed)) return null;
          
          // 원본 문장부호 복원 (인덱스가 유효한 경우)
          const originalEnding = sentenceEndings[i] || '.';
          
          // 문장이 대문자로 시작하지 않으면 첫 글자를 대문자로
          let result = !/^[A-Z]/.test(trimmed) ? 
            trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
          
          return result + originalEnding;
        })
        .filter(s => s !== null);
    }
    
    console.log(`🔍 추출된 문장 ${sentences.length}개:`);
    sentences.forEach((s, i) => {
      console.log(`  ${i + 1}: ${s.substring(0, 60)}...`);
    });
    
    // 최종 검증 및 정리 (인용문 처리 개선)
    const filtered = sentences
      .map(s => s.trim())
      .filter(s => {
        // 길이 및 영어 포함 여부 확인
        const hasEnglish = /[a-zA-Z]/.test(s);
        const minLength = s.length > 10; // 최소 길이 완화
        
        // 대문자 또는 인용부호로 시작
        const validStart = /^[A-Z"']/.test(s);
        
        // 적절한 문장부호로 끝남
        const validEnd = /[.!?"']$/.test(s);
        
        // 영어 단어 개수 확인 (최소 3개)
        const englishWords = (s.match(/\b[a-zA-Z]+\b/g) || []).length;
        const hasMinWords = englishWords >= 3;
        
        return hasEnglish && minLength && validStart && validEnd && hasMinWords;
      });
    
    console.log(`✅ 최종 필터링 후 ${filtered.length}개 완전한 문장`);
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
   * 마커와 함께 본문 생성 (수능형 문장삽입 - 38번, 39번 문제와 동일)
   */
  createTextWithMarkers(sentences, positionCount, originalInsertionIndex) {
    // 🎯 수능형 문장삽입: 지문에서 한 문장을 빼고, 나머지 문장들 사이에 위치 마커만 삽입
    
    if (sentences.length < 4) {
      throw new Error('문장이 부족합니다 (최소 4개 필요)');
    }
    
    // 1. 무작위로 정답 위치 선택 (1~positionCount)
    const correctPosition = Math.floor(Math.random() * positionCount) + 1;
    
    // 2. 나머지 문장들 사용 (주어진 문장으로 선택된 것 제외)
    const usedSentences = sentences.slice(0, positionCount - 1); // 위치 개수보다 1개 적은 문장 사용
    
    // 3. 본문 구성: ( ① ) 문장1 ( ② ) 문장2 ( ③ ) 문장3 ( ④ ) 문장4 ( ⑤ )
    let mainText = '';
    
    for (let i = 1; i <= positionCount; i++) {
      // 위치 마커 추가
      mainText += `( ${this.getPositionSymbol(i)} )`;
      
      // 마지막 위치가 아니고, 해당하는 문장이 있으면 추가
      if (i < positionCount && (i - 1) < usedSentences.length) {
        mainText += ' ' + usedSentences[i - 1].trim() + ' ';
      } else if (i === positionCount) {
        // 마지막 위치는 문장 없이 끝남
        mainText += '';
      }
    }
    
    console.log(`🎯 수능형 문장삽입 본문 구성 완료:`);
    console.log(`   사용된 문장: ${usedSentences.length}개`);
    console.log(`   위치 개수: ${positionCount}개`);
    console.log(`   정답 위치: ${correctPosition}번 (${this.getPositionSymbol(correctPosition)})`);
    console.log(`   본문 길이: ${mainText.length}자`);

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

  /**
   * 주어진 문장 검증 및 정제 (순서배열과 동일한 로직)
   */
  validateAndFixGivenSentence(sentence) {
    let cleaned = sentence.trim();
    
    // 1. 너무 긴 문장 처리 (150자 초과)
    if (cleaned.length > 150) {
      console.log(`⚠️ 주어진 문장이 너무 김 (${cleaned.length}자): "${cleaned.substring(0, 50)}..."`);
      
      // 첫 번째 완전한 문장만 사용
      const firstSentence = cleaned.match(/[^.!?]*[.!?]/)?.[0]?.trim();
      if (firstSentence && firstSentence.length <= 150 && firstSentence.length >= 15) {
        cleaned = firstSentence;
        console.log(`✅ 첫 번째 문장만 사용: "${cleaned}"`);
      } else {
        // 적절한 지점에서 자르기
        const cutPoint = cleaned.lastIndexOf(' ', 150);
        if (cutPoint > 50) {
          cleaned = cleaned.substring(0, cutPoint) + '.';
          console.log(`✅ 적절한 지점에서 자름: "${cleaned}"`);
        }
      }
    }
    
    // 2. 여러 문장이 합쳐진 경우 처리
    const sentenceCount = (cleaned.match(/[.!?]/g) || []).length;
    if (sentenceCount > 1) {
      console.log(`⚠️ 여러 문장이 합쳐짐 (${sentenceCount}개): "${cleaned.substring(0, 100)}..."`);
      
      // 첫 번째 완전한 문장만 추출
      const firstSentence = cleaned.match(/[^.!?]*[.!?]/)?.[0]?.trim();
      if (firstSentence && firstSentence.length >= 10) {
        cleaned = firstSentence;
        console.log(`✅ 첫 번째 문장만 추출: "${cleaned}"`);
      }
    }
    
    // 3. 문장 시작 단어가 잘린 경우 복구 시도
    if (cleaned.length > 0 && !/^[A-Z]/.test(cleaned)) {
      // 소문자로 시작하면 대문자로 변경
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      console.log(`🔧 첫 글자를 대문자로 변경: "${cleaned}"`);
    }
    
    // 4. 문장부호 확인
    if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
      cleaned += '.';
      console.log(`🔧 문장부호 추가: "${cleaned}"`);
    }
    
    return cleaned;
  }
}

module.exports = InsertionProblemGenerator;