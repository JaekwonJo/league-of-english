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

      // 2. 첫 문장 = 주어진 문장
      const mainText = sentences[0];

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
   * 문장 분리 (간단한 방식)
   */
  splitIntoSentences(text) {
    // 마침표, 느낌표, 물음표로 문장 분리
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10) // 너무 짧은 조각 제거
      .map(s => s + '.'); // 마침표 복원

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
}

module.exports = SimpleOrderGenerator;