/**
 * 간단한 순서배열 문제 생성기
 * 새 PDF 파서 결과에 최적화된 단순한 로직
 */

class SimpleOrderGenerator {
  constructor() {
    this.debugMode = true;
  }

  /**
   * 순서배열 문제 생성
   * @param {Array} passages - 새 파서에서 추출된 영어 지문 배열
   * @param {string} difficulty - 'basic' (3개) 또는 'advanced' (5개)
   * @param {number} count - 생성할 문제 개수
   */
  generateOrderProblems(passages, difficulty = 'basic', count = 1) {
    const problems = [];
    const targetParts = difficulty === 'basic' ? 3 : 5;
    
    if (this.debugMode) {
      console.log(`🎯 간단한 순서배열 생성기 시작`);
      console.log(`📄 전체 지문 수: ${passages.length}`);
      console.log(`🎚️ 난이도: ${difficulty} (${targetParts}개 부분)`);
      console.log(`🔢 생성 목표: ${count}개`);
    }

    // 사용 가능한 지문 필터링 (문장이 충분한 것만)
    const usablePassages = passages.filter(passage => {
      const sentences = this.splitIntoSentences(passage);
      return sentences.length >= targetParts + 1; // 주어진 문장 + 분할할 문장들
    });

    if (this.debugMode) {
      console.log(`✅ 사용 가능한 지문 수: ${usablePassages.length}`);
    }

    if (usablePassages.length === 0) {
      throw new Error('사용 가능한 지문이 없습니다.');
    }

    // 문제 생성
    for (let i = 0; i < count && i < usablePassages.length; i++) {
      const passage = usablePassages[i];
      const problem = this.createSingleProblem(passage, targetParts, i + 1);
      
      if (problem) {
        problems.push(problem);
        if (this.debugMode) {
          console.log(`✅ 문제 ${i + 1} 생성 완료`);
        }
      }
    }

    return problems;
  }

  /**
   * 단일 문제 생성
   */
  createSingleProblem(passage, targetParts, problemNumber) {
    try {
      // 1. 문장 분리
      const sentences = this.splitIntoSentences(passage);
      
      if (sentences.length < targetParts + 1) {
        return null;
      }

      // 2. 첫 문장 = 주어진 문장 (길이 검증 및 정제)
      let mainText = sentences[0];
      mainText = this.validateAndFixGivenSentence(mainText);

      // 3. 나머지 문장들을 targetParts개로 랜덤 분할
      const remainingSentences = sentences.slice(1);
      const parts = this.randomSplit(remainingSentences, targetParts);

      // 4. A-B-C(-D-E) 라벨링
      const labels = ['A', 'B', 'C', 'D', 'E'];
      const choices = parts.map((part, index) => ({
        label: labels[index],
        text: part.join(' ').trim()
      }));

      // 5. 정답 순서 (원래 순서)
      const correctOrder = labels.slice(0, targetParts).join('-');

      // 6. 디버그 출력
      if (this.debugMode) {
        console.log(`\n🎯 문제 ${problemNumber} 생성:`);
        console.log(`📝 주어진 문장: ${mainText}`);
        console.log(`🔢 선택지 수: ${choices.length}`);
        console.log(`✅ 정답: ${correctOrder}`);
        choices.forEach((choice, idx) => {
          console.log(`${choice.label}: ${choice.text.substring(0, 50)}...`);
        });
      }

      return {
        type: 'order',
        mainText: mainText,
        sentences: choices,
        correctAnswer: correctOrder,
        difficulty: targetParts === 3 ? 'basic' : 'advanced',
        metadata: {
          source: `passage-${problemNumber}`,
          originalPassage: passage.substring(0, 200) + '...'
        }
      };

    } catch (error) {
      console.error(`문제 ${problemNumber} 생성 실패:`, error);
      return null;
    }
  }

  /**
   * 문장 분리 (고급 버전 - 약어/인용문/숫자 처리 포함)
   */
  splitIntoSentences(text) {
    // 약어 목록 정의 (문장 끝이 아닌 마침표들)
    const abbreviations = [
      'Dr', 'Prof', 'Mr', 'Mrs', 'Ms', 'Jr', 'Sr', 'Ph', 'M', 'B', 'A',
      'U.S.A', 'U.K', 'U.S', 'etc', 'vs', 'e.g', 'i.e', 'Inc', 'Corp', 'Ltd',
      'St', 'Ave', 'Blvd', 'Rd', 'p.m', 'a.m', 'Q1', 'Q2', 'Q3', 'Q4'
    ];
    
    // 약어 패턴 생성
    const abbrevPattern = '(?:' + abbreviations.map(abbr => abbr.replace('.', '\\.')).join('|') + ')';
    
    // 개선된 문장 분리 패턴 - 약어 제외
    const sentencePattern = new RegExp(
      `(?<!\\b${abbrevPattern})[.!?](?=\\s+[A-Z"']|\\s*$)`,
      'g'
    );
    
    // 문장 분할 위치 찾기
    const splitPoints = [];
    let match;
    while ((match = sentencePattern.exec(text)) !== null) {
      splitPoints.push(match.index + 1);
    }
    
    // 분할 위치로 문장 분리
    let sentences = [];
    let start = 0;
    
    for (const point of splitPoints) {
      const sentence = text.slice(start, point).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      start = point;
    }
    
    // 마지막 부분 추가
    const lastPart = text.slice(start).trim();
    if (lastPart) {
      sentences.push(lastPart);
    }
    
    // 실패 시 기본 방법 사용
    if (sentences.length === 0) {
      sentences = text.split(/(?<=[.!?"'])\s+(?=[A-Z"'])/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    // 최종 필터링 및 정리
    sentences = sentences
      .filter(s => {
        // 길이와 영어 포함 여부 확인
        const hasEnglish = /[a-zA-Z]/.test(s);
        const hasContent = s.replace(/[^a-zA-Z]/g, '').length >= 3; // 영어 3글자 이상
        return hasEnglish && hasContent;
      })
      .map(s => {
        // 문장부호 정리
        if (!/[.!?"']$/.test(s)) {
          return s + '.';
        }
        return s;
      });

    return sentences;
  }

  /**
   * 문장들을 targetParts개로 랜덤 분할
   */
  randomSplit(sentences, targetParts) {
    if (sentences.length <= targetParts) {
      // 문장 수가 적으면 각각을 하나씩
      return sentences.map(s => [s]);
    }

    const parts = Array.from({ length: targetParts }, () => []);
    
    // 각 문장을 랜덤한 파트에 배정
    sentences.forEach((sentence, index) => {
      const partIndex = Math.floor(Math.random() * targetParts);
      parts[partIndex].push(sentence);
    });

    // 빈 파트가 있으면 재분배
    const nonEmptyParts = parts.filter(part => part.length > 0);
    while (nonEmptyParts.length < targetParts) {
      // 가장 긴 파트에서 문장을 하나 빼서 빈 파트에 배정
      const longestPart = nonEmptyParts.reduce((a, b) => a.length > b.length ? a : b);
      if (longestPart.length > 1) {
        const sentence = longestPart.pop();
        const emptyPartIndex = parts.findIndex(part => part.length === 0);
        if (emptyPartIndex !== -1) {
          parts[emptyPartIndex].push(sentence);
          nonEmptyParts.push(parts[emptyPartIndex]);
        }
      } else {
        break;
      }
    }

    return parts.filter(part => part.length > 0);
  }

  /**
   * 주어진 문장 검증 및 정제
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
    
    // 2. 너무 짧거나 의미 없는 문장 처리
    if (cleaned.length < 15) {
      console.log(`⚠️ 주어진 문장이 너무 짧음: "${cleaned}"`);
      // 원래 문장이 너무 짧으면 그대로 유지하되 로그만 출력
    }
    
    // 3. 여러 문장이 합쳐진 경우 처리
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
    
    return cleaned;
  }
}

module.exports = SimpleOrderGenerator;