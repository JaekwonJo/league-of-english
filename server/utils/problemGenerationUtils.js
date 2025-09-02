/**
 * 문제 생성을 위한 공통 유틸리티 함수들
 */

class ProblemGenerationUtils {
  /**
   * 배열 무작위 섞기 (Fisher-Yates)
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 순열 생성
   */
  static generatePermutations(arr) {
    if (arr.length <= 1) return [arr];
    
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const remainingPerms = this.generatePermutations(remaining);
      
      for (let perm of remainingPerms) {
        result.push([current, ...perm]);
      }
    }
    return result;
  }

  /**
   * 문장들을 자연스럽게 N개 그룹으로 분할 (원문 순서 유지)
   */
  static splitIntoEqualParts(sentences, parts) {
    const result = [];
    const sentencesPerPart = Math.floor(sentences.length / parts);
    const remainder = sentences.length % parts;
    
    let startIndex = 0;
    
    for (let i = 0; i < parts; i++) {
      // 각 파트의 문장 수 결정 (나머지는 앞쪽 파트들에 하나씩 배정)
      const currentPartSize = sentencesPerPart + (i < remainder ? 1 : 0);
      
      // 현재 파트의 문장들 추출
      const partSentences = sentences.slice(startIndex, startIndex + currentPartSize);
      result.push(partSentences);
      
      startIndex += currentPartSize;
    }
    
    console.log(`📝 ${sentences.length}개 문장을 ${parts}개 그룹으로 자연 분할: ${result.map(p => p.length).join(', ')}개씩`);
    return result;
  }

  /**
   * 문장을 필터링하여 유효한 영어 문장만 추출
   */
  static filterValidSentences(rawSentences, minLength = 30) {
    return rawSentences
      .map(s => s.trim())
      .filter(s => s.length > minLength) // 최소 길이
      .filter(s => /[a-zA-Z]/.test(s)) // 영어 포함
      .filter(s => !/^[가-힣]/.test(s)) // 한글로 시작하지 않음
      .map(s => s + '.'); // 마침표 다시 추가
  }
}

module.exports = ProblemGenerationUtils;
