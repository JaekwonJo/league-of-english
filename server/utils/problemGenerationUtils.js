/**
 * 문제 생성에 공통으로 사용하는 유틸리티 함수 모음
 */

const ABBREVIATIONS = [
  'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'St.', 'vs.', 'etc.', 'e.g.', 'i.e.',
  'a.m.', 'p.m.', 'U.S.', 'U.K.', 'No.', 'Fig.', 'Mt.', 'Co.', 'Inc.', 'Ltd.'
];

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
   * 문장을 자연스럽게 N개 그룹으로 분할 (문장 배열 문제에 활용)
   */
  static splitIntoEqualParts(sentences, parts) {
    const result = [];
    const sentencesPerPart = Math.floor(sentences.length / parts);
    const remainder = sentences.length % parts;

    let startIndex = 0;

    for (let i = 0; i < parts; i++) {
      const currentPartSize = sentencesPerPart + (i < remainder ? 1 : 0);
      const partSentences = sentences.slice(startIndex, startIndex + currentPartSize);
      result.push(partSentences);
      startIndex += currentPartSize;
    }

    console.log(`📚 ${sentences.length}개 문장을 ${parts}개 그룹으로 균등 분할: ${result.map(p => p.length).join(', ')}개씩`);
    return result;
  }

  /**
   * 문단에서 문장 단위로 분리
   */
  static splitSentences(text) {
    if (!text) return [];
    let working = text.replace(/\s+/g, ' ').trim();
    if (!working) return [];

    const placeholders = new Map();
    ABBREVIATIONS.forEach((abbr, index) => {
      const token = `__ABBR_${index}__`;
      placeholders.set(token, abbr);
      const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      working = working.replace(new RegExp(escaped, 'g'), token);
    });

    const segments = working.split(/(?<=[.!?])\s+(?=[A-Z0-9"'\(\[])/);
    return segments
      .map(segment => {
        let restored = segment;
        placeholders.forEach((abbr, token) => {
          restored = restored.replace(new RegExp(token, 'g'), abbr);
        });
        return restored.trim();
      })
      .filter(Boolean);
  }

  /**
   * 문장 리스트를 걸러서 영어 문장만 남김
   */
  static filterValidSentences(rawSentences, minLength = 30) {
    return rawSentences
      .map(s => s.trim())
      .filter(s => s.length > minLength)
      .filter(s => /[a-zA-Z]/.test(s))
      .filter(s => !/^[가-힣]/.test(s))
      .filter(s => !s.match(/^[\d\s\-\u2500-\u257f]+$/))
      .map(s => /[.!?]$/.test(s) ? s : `${s}.`);
  }
}

module.exports = ProblemGenerationUtils;
