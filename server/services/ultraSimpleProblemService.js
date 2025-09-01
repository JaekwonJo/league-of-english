/**
 * 초단순 문제 생성 서비스 - 완전 재작성
 * 원리: 1페이지 = 1지문 = 첫문장+나머지문장을 3개로 균등분할
 */

class UltraSimpleProblemService {
  /**
   * 스마트 문제 생성 (메인 함수)
   */
  async getSmartProblems(userId, documentId, types, count, options = {}) {
    try {
      console.log('🎯 울트라심플 문제 생성 시작');
      console.log(`📋 요청 디버깅:`, {
        userId,
        documentId,
        types,
        count: count,
        countType: typeof count,
        isArrayTypes: Array.isArray(types),
        typesContent: types,
        options
      });

      // 문서 조회
      const database = require('../models/database');
      const document = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
      
      if (!document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // JSON 파싱
      let parsedContent = null;
      try {
        parsedContent = JSON.parse(document.content);
        console.log('🔍 파싱 성공. passages:', parsedContent?.passages?.length || 0);
      } catch (e) {
        console.log('❌ JSON 파싱 실패');
        throw new Error('파싱된 지문이 없습니다.');
      }

      if (!parsedContent?.passages) {
        throw new Error('지문 데이터가 없습니다.');
      }

      // 문제 생성
      const problems = [];
      const typeArray = Array.isArray(types) ? types : [types];
      
      if (typeArray.includes('order')) {
        console.log('🔄 순서배열 문제 생성 시작');
        console.log(`🔍 순서배열에 할당된 count: ${count}`);
        const orderProblems = this.generateOrderProblems(parsedContent.passages, count, options, document, parsedContent);
        console.log(`✅ 순서배열 생성 결과: ${orderProblems.length}개`);
        problems.push(...orderProblems);
      }

      if (typeArray.includes('insertion')) {
        console.log('🔄 문장삽입 문제 생성 시작');
        const insertionProblems = this.generateInsertionProblems(parsedContent.passages, count, options, document, parsedContent);
        problems.push(...insertionProblems);
      }

      console.log(`✅ ${problems.length}개 문제 생성 완료`);
      return problems;

    } catch (error) {
      console.error('문제 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 순서배열 문제 생성
   */
  generateOrderProblems(passages, count, options, document, parsedContent) {
    const problems = [];
    const difficulty = options.orderDifficulty === 'advanced' ? 'advanced' : 'basic';
    const targetParts = difficulty === 'advanced' ? 5 : 3;

    console.log(`📄 총 ${passages.length}개 지문 중 ${count}개 문제 생성`);

    // 🎯 마구잡이 순서로 지문 선택 (랜덤화)
    const shuffledIndexes = this.shuffleArray([...Array(passages.length).keys()]);
    const selectedIndexes = shuffledIndexes.slice(0, Math.min(count, passages.length));
    
    console.log(`🎲 랜덤 선택된 페이지: [${selectedIndexes.map(i => i + 1).join(', ')}]`);

    // 선택된 지문에서 1문제씩 생성
    for (let i = 0; i < selectedIndexes.length; i++) {
      const passageIndex = selectedIndexes[i];
      const passage = passages[passageIndex];
      console.log(`🎯 문제 ${i + 1}: 원문 페이지 ${passageIndex + 1} 사용 (${passage.length}자)`);
      
      const problem = this.createOrderProblem(passage, targetParts, i + 1, passageIndex + 1, document, parsedContent);
      if (problem) {
        problems.push(problem);
        console.log(`✅ 문제 ${i + 1} 생성 완료 (원문 페이지 ${passageIndex + 1})`);
      } else {
        console.log(`❌ 문제 ${i + 1} 생성 실패 (원문 페이지 ${passageIndex + 1})`);
      }
    }

    return problems;
  }

  /**
   * 한 지문에서 순서배열 문제 생성
   */
  createOrderProblem(passage, targetParts, problemNumber, originalPageNumber, document, parsedContent) {
    // 1. 문장을 단순하게 마침표로 분리
    const rawSentences = passage.split('.');
    
    // 2. 완전한 영어 문장만 필터링
    const sentences = rawSentences
      .map(s => s.trim())
      .filter(s => s.length > 30) // 최소 길이
      .filter(s => /[a-zA-Z]/.test(s)) // 영어 포함
      .filter(s => !/^[가-힣]/.test(s)) // 한글로 시작하지 않음
      .map(s => s + '.'); // 마침표 다시 추가

    console.log(`📝 ${rawSentences.length}개 → ${sentences.length}개 유효 문장 추출`);

    if (sentences.length < targetParts + 1) {
      console.log(`⚠️ 문장 부족: ${sentences.length}개 < ${targetParts + 1}개 필요`);
      return null;
    }

    // 3. 첫 문장 = 주어진 문장
    const mainText = sentences[0];

    // 4. 나머지 문장들을 균등하게 3개 또는 5개 그룹으로 분할
    const remainingSentences = sentences.slice(1);
    const parts = this.splitIntoEqualParts(remainingSentences, targetParts);

    // 5. 라벨링 (A-B-C 또는 A-B-C-D-E) - 원문 순서가 정답
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts); // A-B-C가 원문 순서 = 정답

    // 6. 내용을 섞되, 나중에 정답 매칭을 위해 원본 순서 기억
    const shuffledParts = this.shuffleArray([...parts]);
    
    // 선택지 생성 (라벨은 A-B-C 순서대로 고정, 내용만 섞임)
    const sentenceChoices = shuffledParts.map((part, index) => ({
      label: labels[index], // 항상 A, B, C 순서
      text: part.join(' ')
    }));

    // 7. 객관식 선택지 생성 (5개)
    const multipleChoices = this.generateMultipleChoices(targetParts);
    
    // 8. 정답 찾기 - 원본 순서와 현재 배치 비교
    const correctChoice = this.findCorrectAnswer(parts, shuffledParts, correctOrder, multipleChoices);

    console.log(`🎯 문제 ${problemNumber}: "${mainText.substring(0, 50)}..." + ${targetParts}개 선택지`);
    console.log(`✅ 원문순서: ${correctOrder.join('')} | 객관식 정답: ${correctChoice}번`);

    // 제목과 출처 정보 설정
    const documentTitle = document ? document.title : '문서';
    const originalSource = parsedContent?.sources?.[originalPageNumber - 1] || `page-${originalPageNumber}`;
    
    return {
      type: 'order',
      mainText: mainText,
      sentences: sentenceChoices,
      multipleChoices: multipleChoices,
      answer: correctChoice.toString(), // 객관식 정답 번호 (1-5)
      correctOrder: correctOrder.join(''), // 원본 순서 (ABC 또는 ABCDE)
      explanation: `올바른 순서는 ${correctOrder.join('-')}입니다.`,
      is_ai_generated: false,
      metadata: {
        originalTitle: documentTitle,
        problemNumber: originalSource, // "1번" 제거하고 출처만 표시
        source: originalSource,
        difficulty: targetParts === 3 ? 'basic' : 'advanced',
        originalPageNumber: originalPageNumber
      }
    };
  }

  /**
   * 문장들을 자연스럽게 N개 그룹으로 분할 (원문 순서 유지)
   */
  splitIntoEqualParts(sentences, parts) {
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
   * 배열 무작위 섞기 (Fisher-Yates)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 객관식 선택지 생성 (5개)
   */
  generateMultipleChoices(targetParts) {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts);
    
    // 모든 가능한 순열을 생성하되 최대 5개까지
    const allPermutations = this.generatePermutations(correctOrder);
    
    // 정답 포함해서 5개 선택
    let choices = [];
    
    // 첫 번째는 항상 정답
    choices.push(correctOrder.join(''));
    
    // 나머지 4개는 랜덤 선택
    const otherChoices = allPermutations
      .filter(perm => perm.join('') !== correctOrder.join(''))
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
    
    choices.push(...otherChoices.map(perm => perm.join('')));
    
    // 5개 선택지를 랜덤하게 섞기
    choices = this.shuffleArray(choices);
    
    // ① ② ③ ④ ⑤ 형태로 반환
    return choices.map((choice, index) => ({
      number: index + 1,
      symbol: ['①', '②', '③', '④', '⑤'][index],
      value: choice
    }));
  }

  /**
   * 순열 생성
   */
  generatePermutations(arr) {
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
   * 문장삽입 문제 생성
   */
  generateInsertionProblems(passages, count, options, document, parsedContent) {
    const problems = [];
    const difficulty = options.insertionDifficulty === 'advanced' ? 'advanced' : 'basic';
    const maxChoices = difficulty === 'advanced' ? 7 : 5;

    console.log(`📄 총 ${passages.length}개 지문 중 ${count}개 문장삽입 문제 생성`);

    // 🎯 마구잡이 순서로 지문 선택 (랜덤화)
    const shuffledIndexes = this.shuffleArray([...Array(passages.length).keys()]);
    const selectedIndexes = shuffledIndexes.slice(0, Math.min(count, passages.length));
    
    console.log(`🎲 랜덤 선택된 페이지: [${selectedIndexes.map(i => i + 1).join(', ')}]`);

    // 선택된 지문에서 1문제씩 생성
    for (let i = 0; i < selectedIndexes.length; i++) {
      const passageIndex = selectedIndexes[i];
      const passage = passages[passageIndex];
      console.log(`🎯 문장삽입 문제 ${i + 1}: 원문 페이지 ${passageIndex + 1} 사용 (${passage.length}자)`);
      
      const problem = this.createInsertionProblem(passage, maxChoices, i + 1, passageIndex + 1, document, parsedContent);
      if (problem) {
        problems.push(problem);
        console.log(`✅ 문장삽입 문제 ${i + 1} 생성 완료 (원문 페이지 ${passageIndex + 1})`);
      } else {
        console.log(`❌ 문장삽입 문제 ${i + 1} 생성 실패 (원문 페이지 ${passageIndex + 1})`);
      }
    }

    return problems;
  }

  /**
   * 한 지문에서 문장삽입 문제 생성
   */
  createInsertionProblem(passage, maxChoices, problemNumber, originalPageNumber, document, parsedContent) {
    // 1. 문장을 단순하게 마침표로 분리
    const rawSentences = passage.split('.');
    
    // 2. 완전한 영어 문장만 필터링
    const sentences = rawSentences
      .map(s => s.trim())
      .filter(s => s.length > 30) // 최소 길이
      .filter(s => /[a-zA-Z]/.test(s)) // 영어 포함
      .filter(s => !/^[가-힣]/.test(s)) // 한글로 시작하지 않음
      .map(s => s + '.'); // 마침표 다시 추가

    console.log(`📝 ${rawSentences.length}개 → ${sentences.length}개 유효 문장 추출`);

    if (sentences.length < maxChoices + 1) {
      console.log(`⚠️ 문장 부족: ${sentences.length}개 < ${maxChoices + 1}개 필요`);
      return null;
    }

    // 3. 랜덤하게 한 문장을 [주어진 문장]으로 선택
    const randomIndex = Math.floor(Math.random() * sentences.length);
    const givenSentence = sentences[randomIndex];
    
    // 4. 나머지 문장들로 지문 구성 (주어진 문장 제외)
    const remainingSentences = sentences.filter((_, index) => index !== randomIndex);
    
    // 5. 지문에 ①②③④⑤ 위치 표시 삽입 (maxChoices개)
    const textWithChoices = this.insertChoiceMarkers(remainingSentences, maxChoices);
    
    // 6. 정답 위치 계산 - 원문에서 주어진 문장이 들어갈 위치
    const correctPosition = randomIndex + 1; // 1부터 시작하는 위치

    // 6. 객관식 선택지 생성 (①②③④⑤ 또는 ①~⑦)
    const multipleChoices = this.generateInsertionChoices(maxChoices);
    
    console.log(`🎯 문장삽입 문제 ${problemNumber}: 주어진 문장 "${givenSentence.substring(0, 50)}..." | 정답: ${correctPosition}번`);

    // 제목과 출처 정보 설정
    const documentTitle = document ? document.title : '문서';
    const originalSource = parsedContent?.sources?.[originalPageNumber - 1] || `page-${originalPageNumber}`;
    
    return {
      type: 'insertion',
      givenSentence: givenSentence,
      mainText: textWithChoices,
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
   * 지문에 ①②③④⑤ 선택지 마커 삽입
   */
  insertChoiceMarkers(sentences, maxChoices) {
    const markers = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
    const result = [];
    
    // 첫 번째 마커부터 시작
    result.push(markers[0]);
    
    // 각 문장 사이에 마커 삽입
    for (let i = 0; i < sentences.length; i++) {
      result.push(sentences[i]);
      if (i + 1 < maxChoices - 1) { // 마지막 마커는 끝에
        result.push(markers[i + 1]);
      }
    }
    
    // 마지막 마커 추가
    if (maxChoices > sentences.length + 1) {
      result.push(markers[maxChoices - 1]);
    }
    
    return result.join(' ');
  }

  /**
   * 문장삽입용 객관식 선택지 생성
   */
  generateInsertionChoices(maxChoices) {
    const symbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
    
    return symbols.slice(0, maxChoices).map((symbol, index) => ({
      number: index + 1,
      symbol: symbol,
      value: (index + 1).toString()
    }));
  }

  /**
   * 정답 찾기 - 객관식에서 정답이 몇 번인지
   */
  findCorrectAnswer(originalParts, shuffledParts, correctOrder, multipleChoices) {
    // 현재 섞인 배치에서 원본 순서를 복원하기 위한 라벨 찾기
    // shuffledParts에서 originalParts의 순서를 찾아서 라벨 매칭
    const answerLabels = [];
    
    for (let i = 0; i < originalParts.length; i++) {
      const originalPart = originalParts[i]; // 원본 순서의 i번째 파트
      const shuffledIndex = shuffledParts.findIndex(shuffledPart => 
        JSON.stringify(shuffledPart) === JSON.stringify(originalPart)
      );
      if (shuffledIndex !== -1) {
        // 원본의 i번째 파트가 섞인 배열에서 shuffledIndex 위치에 있음
        // 화면에서는 A, B, C... 라벨이 순서대로 붙어있으므로
        // 원본 복원을 위해서는 shuffledIndex 위치의 라벨을 찾아야 함
        answerLabels.push(String.fromCharCode(65 + shuffledIndex)); // A=65
      }
    }
    
    const correctAnswerSequence = answerLabels.join('');
    console.log(`🎯 원문 순서: ${correctOrder.join('')} | 정답 순서: ${correctAnswerSequence}`);
    
    // 객관식 선택지에서 정답 순서 찾기
    for (let i = 0; i < multipleChoices.length; i++) {
      if (multipleChoices[i].value === correctAnswerSequence) {
        return i + 1; // 1부터 시작하는 번호
      }
    }
    
    // 만약 찾지 못하면 1번을 반환 (오류 방지)
    return 1;
  }
}

module.exports = UltraSimpleProblemService;