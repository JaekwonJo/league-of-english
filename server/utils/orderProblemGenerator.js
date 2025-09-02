/**
 * 순서배열 문제 생성기
 */

const ProblemGenerationUtils = require('./problemGenerationUtils');

class OrderProblemGenerator {
  /**
   * 순서배열 문제 생성
   */
  static generateOrderProblems(passages, count, options, document, parsedContent) {
    const problems = [];
    const difficulty = options.orderDifficulty === 'advanced' ? 'advanced' : 'basic';
    const targetParts = difficulty === 'advanced' ? 5 : 3;

    console.log(`📄 총 ${passages.length}개 지문 중 ${count}개 문제 생성`);

    // 🎯 마구잡이 순서로 지문 선택 (랜덤화)
    const shuffledIndexes = ProblemGenerationUtils.shuffleArray([...Array(passages.length).keys()]);
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
  static createOrderProblem(passage, targetParts, problemNumber, originalPageNumber, document, parsedContent) {
    console.log(`📄 원본 지문 확인: "${passage.substring(0, 100)}..."`);
    
    // 1. 강화된 문장 분리 - 여러 단계로 처리
    // 먼저 줄바꿈과 공백을 정리
    const cleanedPassage = passage.replace(/\s+/g, ' ').trim();
    
    // 마침표, 느낌표, 물음표 기준으로 분리 (약어 예외 처리)
    const abbreviations = ['Dr', 'Prof', 'Mr', 'Mrs', 'Ms', 'U.S', 'U.K', 'etc', 'vs', 'e.g', 'i.e'];
    let tempPassage = cleanedPassage;
    
    // 약어 보호
    abbreviations.forEach(abbr => {
      const regex = new RegExp(`\\b${abbr}\\.`, 'g');
      tempPassage = tempPassage.replace(regex, `${abbr}[DOT]`);
    });
    
    // 문장 분리
    const rawSentences = tempPassage
      .split(/[.!?]+/)
      .map(s => s.replace(/\[DOT\]/g, '.').trim())
      .filter(s => s.length > 0);
    
    console.log(`🔍 문장 분리 결과: ${rawSentences.length}개`);
    rawSentences.forEach((sent, idx) => {
      console.log(`  ${idx + 1}. "${sent.substring(0, 60)}..."`);
    });
    
    // 2. 완전한 영어 문장만 필터링
    const sentences = rawSentences
      .filter(s => s.length > 20) // 최소 길이 완화
      .filter(s => /[a-zA-Z]/.test(s)) // 영어 포함
      .filter(s => !/^[가-힣]/.test(s)) // 한글로 시작하지 않음
      .filter(s => !s.match(/^[\d\s\-–—\u2500-\u257f]+$/)) // 숫자나 기호만 있는 라인 제외
      .map(s => {
        // 마침표가 없으면 추가
        if (!/[.!?]$/.test(s)) {
          return s + '.';
        }
        return s;
      });
    
    console.log(`✅ 필터링 후 유효 문장: ${sentences.length}개`);
    sentences.forEach((sent, idx) => {
      console.log(`  ${idx + 1}. "${sent.substring(0, 50)}..."`);
    });

    console.log(`📝 ${rawSentences.length}개 → ${sentences.length}개 유효 문장 추출`);

    if (sentences.length < targetParts + 1) {
      console.log(`⚠️ 문장 부족: ${sentences.length}개 < ${targetParts + 1}개 필요`);
      return null;
    }

    // 3. 첫 문장 = 주어진 문장
    const mainText = sentences[0];

    // 4. 나머지 문장들을 균등하게 3개 또는 5개 그룹으로 분할
    const remainingSentences = sentences.slice(1);
    const parts = ProblemGenerationUtils.splitIntoEqualParts(remainingSentences, targetParts);

    // 5. 라벨링 (A-B-C 또는 A-B-C-D-E) - 원문 순서가 정답
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts); // A-B-C가 원문 순서 = 정답

    // 6. 내용을 섞되, 나중에 정답 매칭을 위해 원본 순서 기억
    const shuffledParts = ProblemGenerationUtils.shuffleArray([...parts]);
    
    // 선택지 생성 (라벨은 A-B-C 순서대로 고정, 내용만 섞임)
    const sentenceChoices = shuffledParts.map((part, index) => ({
      label: labels[index], // 항상 A, B, C 순서
      text: part.join(' ') // 문장들을 공백으로 연결
    }));
    
    console.log(`🔍 생성된 선택지 확인:`);
    sentenceChoices.forEach((choice, idx) => {
      console.log(`  ${choice.label}: "${choice.text.substring(0, 50)}..."`);
    });

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
   * 객관식 선택지 생성 (5개)
   */
  static generateMultipleChoices(targetParts) {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts);
    
    // 모든 가능한 순열을 생성하되 최대 5개까지
    const allPermutations = ProblemGenerationUtils.generatePermutations(correctOrder);
    
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
    choices = ProblemGenerationUtils.shuffleArray(choices);
    
    // ① ② ③ ④ ⑤ 형태로 반환
    return choices.map((choice, index) => ({
      number: index + 1,
      symbol: ['①', '②', '③', '④', '⑤'][index],
      value: choice
    }));
  }

  /**
   * 정답 찾기 - 객관식에서 정답이 몇 번인지
   */
  static findCorrectAnswer(originalParts, shuffledParts, correctOrder, multipleChoices) {
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

module.exports = OrderProblemGenerator;
