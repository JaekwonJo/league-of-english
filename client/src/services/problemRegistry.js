/**
 * 문제 유형 레지스트리 - 전략 패턴
 * if/else 체인 대신 맵 구조로 문제 유형 관리
 */

import problemTypes from '../config/problemTypes.json';

// Helper: strip leading "Q." (or variants) so UI can prefix consistently
const stripLeadingQ = (s) => {
  try {
    const str = String(s || '');
    return str.replace(/^\s*[Qq]\s*\.?\s*/,'');
  } catch (_) {
    return s;
  }
};

class ProblemRegistry {
  constructor() {
    this.handlers = new Map();
    this.validators = new Map();
    this.renderers = new Map();
  }

  /**
   * 문제 유형 핸들러 등록
   */
  registerHandler(type, handler) {
    if (!type || !handler) {
      throw new Error('Type and handler are required');
    }
    this.handlers.set(type, handler);
    console.log(`✅ Registered handler for: ${type}`);
  }

  /**
   * 문제 유형 검증기 등록
   */
  registerValidator(type, validator) {
    this.validators.set(type, validator);
  }

  /**
   * 문제 유형 렌더러 등록
   */
  registerRenderer(type, renderer) {
    this.renderers.set(type, renderer);
  }

  /**
   * 핸들러 실행
   */
  executeHandler(type, data) {
    const handler = this.handlers.get(type);
    if (!handler) {
      console.warn(`No handler registered for type: ${type}`);
      return this.defaultHandler(data);
    }
    return handler(data);
  }

  /**
   * 검증 실행
   */
  validate(type, answer, correctAnswer) {
    const validator = this.validators.get(type);
    if (!validator) {
      return this.defaultValidator(answer, correctAnswer);
    }
    return validator(answer, correctAnswer);
  }

  /**
   * 렌더링 실행
   */
  render(type, problem) {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      return this.defaultRenderer(problem);
    }
    return renderer(problem);
  }

  /**
   * 기본 핸들러
   */
  defaultHandler(data) {
    return {
      type: 'default',
      question: data.question || '',
      options: data.options || [],
      answer: data.answer || ''
    };
  }

  /**
   * 기본 검증기
   */
  defaultValidator(answer, correctAnswer) {
    return answer?.toString() === correctAnswer?.toString();
  }

  /**
   * 기본 렌더러
   */
  defaultRenderer(problem) {
    return {
      instruction: problem.question,
      options: problem.options,
      type: problem.type
    };
  }

  /**
   * 등록된 타입 목록
   */
  getRegisteredTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * 타입 정보 가져오기
   */
  getTypeInfo(type) {
    return problemTypes.problemTypes[type] || null;
  }
}

// 싱글톤 인스턴스
const registry = new ProblemRegistry();

// 기본 핸들러 등록
const registerDefaultHandlers = () => {
  // 빈칸 채우기
  registry.registerHandler('blank', (data) => ({
    ...data,
    displayType: 'fill-blank',
    requiresTextInput: false
  }));

  // 순서 배열
  registry.registerHandler('order', (data) => ({
    ...data,
    displayType: 'ordering',
    showSentences: true,
    requiresDragDrop: false
  }));

  // 문장 삽입
  registry.registerHandler('insertion', (data) => ({
    ...data,
    displayType: 'insertion',
    showMarkers: true
  }));

  // 어법/문법
  registry.registerHandler('grammar', (data) => ({
    ...data,
    displayType: 'underline',
    highlightErrors: true
  }));

  // 문법(밑줄 5개 선택식)
  registry.registerHandler('grammar_span', (data) => ({
    ...data,
    displayType: 'underline-span',
    highlightErrors: true
  }));

  // 어휘
  registry.registerHandler('vocabulary', (data) => ({
    ...data,
    question: stripLeadingQ(data.question),
    displayType: 'vocabulary',
    showContext: true
  }));

  // 제목
  registry.registerHandler('title', (data) => ({
    ...data,
    question: stripLeadingQ(data.question),
    displayType: 'choice',
    showFullText: true
  }));

  // 주제
  registry.registerHandler('theme', (data) => ({
    ...data,
    question: stripLeadingQ(data.question),
    displayType: 'choice',
    showFullText: true
  }));

  // 요약
  registry.registerHandler('summary', (data) => ({
    ...data,
    question: stripLeadingQ(data.question),
    displayType: 'summary',
    showBlanks: true
  }));

  // 무관한 문장(문맥상 적절하지 않은 문장)
  registry.registerHandler('irrelevant', (data) => ({
    ...data,
    question: stripLeadingQ(data.question),
    displayType: 'choice',
    showSentences: true
  }));

  // 함축 의미(밑줄 의미)
  registry.registerHandler('implicit', (data) => ({
    ...data,
    question: stripLeadingQ(data.question),
    displayType: 'choice',
    showFullText: true
  }));
};

// 기본 검증기 등록
const registerDefaultValidators = () => {
  // 순서 배열 검증 (객관식 번호 비교)
  registry.registerValidator('order', (answer, correct) => {
    // answer: 사용자가 선택한 객관식 번호 (1,2,3,4,5)
    // correct: 서버에서 계산한 정답 번호 (1,2,3,4,5)
    const userChoice = parseInt(answer);
    const correctChoice = parseInt(correct);
    console.log('🔍 순서배열 검증:', { userChoice, correctChoice, result: userChoice === correctChoice });
    return userChoice === correctChoice;
  });

  // 문장 삽입 검증
  registry.registerValidator('insertion', (answer, correct) => {
    return parseInt(answer) === parseInt(correct);
  });

  // 기본 검증 (나머지)
  ['blank', 'grammar', 'grammar_span', 'vocabulary', 'title', 'theme', 'irrelevant', 'implicit'].forEach(type => {
    registry.registerValidator(type, (answer, correct) => {
      return answer?.toString() === correct?.toString();
    });
  });

  // 요약 검증 (A, B 둘 다 맞아야 함)
  registry.registerValidator('summary', (answer, correct) => {
    if (answer === undefined || correct === undefined) return false;
    return answer?.toString().trim() === correct?.toString().trim();
  });
  
  // 고급 문법(개수) 검증기
  registry.registerValidator('grammar_count', (answer, correct) => {
    const a = parseInt(answer);
    const c = parseInt(correct);
    if (Number.isNaN(a) || Number.isNaN(c)) return false;
    return a === c;
  });
};

// 초기화
registerDefaultHandlers();
registerDefaultValidators();

export default registry;


