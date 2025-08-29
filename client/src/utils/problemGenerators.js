/**
 * 문제 생성 유틸리티 함수들
 * 규칙 기반 문제 생성 로직을 App.js에서 분리
 */

/**
 * 순서 배열 문제 생성
 * @param {string} text - 원문 텍스트
 * @param {string} difficulty - 난이도 (basic/advanced)
 * @returns {Object} 생성된 문제 객체
 */
export const generateOrderProblem = (text, difficulty = 'basic') => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length < 4) {
    throw new Error('문장이 너무 적습니다. 최소 4개의 문장이 필요합니다.');
  }

  // 첫 문장은 고정
  const firstSentence = sentences[0];
  const remainingSentences = sentences.slice(1, difficulty === 'basic' ? 4 : 6);
  
  // 섞기
  const shuffled = [...remainingSentences].sort(() => Math.random() - 0.5);
  
  // 라벨 부여
  const labels = difficulty === 'basic' 
    ? ['(A)', '(B)', '(C)'] 
    : ['(A)', '(B)', '(C)', '(D)', '(E)'];
  
  const labeledSentences = shuffled.map((sent, idx) => ({
    label: labels[idx],
    text: sent.trim()
  }));

  // 정답 찾기
  const correctOrder = remainingSentences.map(sent => {
    const idx = shuffled.indexOf(sent);
    return labels[idx];
  }).join('-');

  // 선택지 생성
  const options = difficulty === 'basic' 
    ? generateBasicOrderOptions()
    : generateAdvancedOrderOptions();

  return {
    type: 'order',
    instruction: '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?',
    mainText: firstSentence.trim(),
    sentences: labeledSentences,
    options: options,
    answer: options.indexOf(correctOrder) + 1,
    correctOrder: correctOrder
  };
};

/**
 * 문장 삽입 문제 생성
 * @param {string} text - 원문 텍스트
 * @returns {Object} 생성된 문제 객체
 */
export const generateInsertionProblem = (text) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length < 5) {
    throw new Error('문장이 너무 적습니다. 최소 5개의 문장이 필요합니다.');
  }

  // 삽입할 문장 선택 (2~4번째 중 하나)
  const insertIndex = Math.floor(Math.random() * 3) + 1;
  const sentenceToInsert = sentences[insertIndex].trim();
  
  // 해당 문장 제거
  const textWithoutSentence = sentences.filter((_, idx) => idx !== insertIndex);
  
  // 위치 표시 추가
  const markedText = textWithoutSentence.map((sent, idx) => {
    if (idx === 0) return sent.trim();
    return `【${idx}】 ${sent.trim()}`;
  }).join(' ');

  // 정답 위치 계산
  const correctPosition = insertIndex > 0 ? insertIndex : 1;

  return {
    type: 'insertion',
    instruction: '글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?',
    sentenceToInsert: sentenceToInsert,
    mainText: markedText,
    options: ['①', '②', '③', '④', '⑤'],
    answer: correctPosition
  };
};

/**
 * 기본 순서 배열 선택지 생성
 */
const generateBasicOrderOptions = () => {
  return [
    '(A)-(B)-(C)',
    '(A)-(C)-(B)',
    '(B)-(A)-(C)',
    '(B)-(C)-(A)',
    '(C)-(A)-(B)',
    '(C)-(B)-(A)'
  ];
};

/**
 * 고급 순서 배열 선택지 생성
 */
const generateAdvancedOrderOptions = () => {
  return [
    '(A)-(B)-(C)-(D)-(E)',
    '(A)-(C)-(B)-(E)-(D)',
    '(B)-(A)-(D)-(C)-(E)',
    '(C)-(D)-(A)-(E)-(B)',
    '(D)-(E)-(B)-(A)-(C)'
  ];
};

/**
 * 문제 유형별 생성 함수 맵핑
 */
export const problemGenerators = {
  order: generateOrderProblem,
  insertion: generateInsertionProblem
};

/**
 * 문제 섞기 함수
 * @param {Array} problems - 문제 배열
 * @returns {Array} 섞인 문제 배열
 */
export const shuffleProblems = (problems) => {
  const shuffled = [...problems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * 문제 난이도 조정
 * @param {Object} problem - 문제 객체
 * @param {string} difficulty - 목표 난이도
 * @returns {Object} 조정된 문제
 */
export const adjustProblemDifficulty = (problem, difficulty) => {
  const adjusted = { ...problem };
  
  switch(difficulty) {
    case 'basic':
      adjusted.timeLimit = 120;
      break;
    case 'medium':
      adjusted.timeLimit = 90;
      break;
    case 'advanced':
      adjusted.timeLimit = 60;
      break;
    default:
      adjusted.timeLimit = 120;
  }
  
  return adjusted;
};