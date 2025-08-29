/**
 * 문제 유형 레지스트리 - 전략 패턴
 * if/else 체인 대신 맵 구조로 문제 유형 관리
 */

import problemTypes from '../config/problemTypes.json';

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

  // 어휘
  registry.registerHandler('vocabulary', (data) => ({
    ...data,
    displayType: 'vocabulary',
    showContext: true
  }));

  // 제목
  registry.registerHandler('title', (data) => ({
    ...data,
    displayType: 'choice',
    showFullText: true
  }));

  // 주제
  registry.registerHandler('theme', (data) => ({
    ...data,
    displayType: 'choice',
    showFullText: true
  }));

  // 요약
  registry.registerHandler('summary', (data) => ({
    ...data,
    displayType: 'summary',
    showBlanks: true
  }));
};

// 기본 검증기 등록
const registerDefaultValidators = () => {
  // 순서 배열 검증
  registry.registerValidator('order', (answer, correct) => {
    const normalize = (str) => str.replace(/[^A-E-]/g, '');
    return normalize(answer) === normalize(correct);
  });

  // 문장 삽입 검증
  registry.registerValidator('insertion', (answer, correct) => {
    return parseInt(answer) === parseInt(correct);
  });

  // 기본 검증 (나머지)
  ['blank', 'grammar', 'vocabulary', 'title', 'theme'].forEach(type => {
    registry.registerValidator(type, (answer, correct) => {
      return answer?.toString() === correct?.toString();
    });
  });

  // 요약 검증 (A, B 둘 다 맞아야 함)
  registry.registerValidator('summary', (answer, correct) => {
    if (!answer || !correct) return false;
    return answer.A === correct.A && answer.B === correct.B;
  });
};

// 초기화
registerDefaultHandlers();
registerDefaultValidators();

export default registry;