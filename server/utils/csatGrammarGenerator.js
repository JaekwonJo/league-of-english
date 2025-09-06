/**
 * CSAT 수능급 어법문제 생성기 v5.0 - 진짜 수능 난이도
 * 실제 수능에 출제되는 고난도 어법 패턴만 사용
 */

// 시드 기반 랜덤 생성기
function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  return function() {
    state += 0x6D2B79F5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

// 배열 섞기
function shuffle(arr, rng) {
  const shuffled = arr.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 실제 수능 고난도 어법 패턴 (쉬운 문제 제외)
 */
const ADVANCED_GRAMMAR_PATTERNS = [
  // 1. 관계대명사 what vs that (최빈출)
  {
    name: 'relative_what_that',
    find: /\b(all|everything|something|nothing|the\s+thing|things)\s+(that|which)\b/gi,
    createError: (match) => match.replace(/\b(that|which)\b/, 'what'),
    verify: (sentence) => /\b(all|everything|something|nothing|the\s+thing)\s+/i.test(sentence),
    explanation: 'what은 선행사를 포함하는 관계대명사이므로 선행사와 함께 쓸 수 없습니다'
  },
  
  // 2. 분사구문/분사 수식 (능동/수동)
  {
    name: 'participle',
    find: /\b(\w+ing|\w+ed)\s+(by|in|at|on|with)/gi,
    createError: (match) => {
      if (match.includes('ing')) {
        return match.replace(/(\w+)ing/, '$1ed');
      } else if (match.includes('ed')) {
        return match.replace(/(\w+)ed/, '$1ing');
      }
      return match;
    },
    verify: (sentence) => /\b(\w+ing|\w+ed)\s+/i.test(sentence),
    explanation: '분사의 능동/수동 관계를 올바르게 파악해야 합니다'
  },
  
  // 3. to부정사 vs 동명사 (특정 동사 뒤)
  {
    name: 'infinitive_gerund',
    find: /\b(suggest|recommend|avoid|enjoy|finish|mind|consider|appreciate|deny|admit|postpone|delay|risk|practice)\s+(to\s+\w+|\w+ing)\b/gi,
    createError: (match) => {
      const [full, verb, form] = match.match(/(\w+)\s+(to\s+\w+|\w+ing)/i);
      if (form.startsWith('to ')) {
        return match; // 이미 오류 (동명사를 써야 하는데 to부정사 사용)
      } else {
        return match.replace(/(\w+ing)/, 'to ' + form.slice(0, -3));
      }
    },
    verify: (sentence) => /\b(suggest|recommend|avoid|enjoy|finish|mind)/i.test(sentence),
    explanation: '동명사를 목적어로 취하는 동사 뒤에는 to부정사가 올 수 없습니다'
  },
  
  // 4. 가정법 (과거/과거완료)
  {
    name: 'subjunctive',
    find: /\bIf\s+\w+\s+(had\s+\w+|were|was),.*?(would|could|might)\s+(have\s+\w+|be|have|had)/gi,
    createError: (match) => {
      if (match.includes('had') && match.includes('would have')) {
        // 가정법 과거완료를 과거로
        return match.replace('would have', 'would').replace(/had\s+(\w+)/, 'was $1');
      } else if (match.includes('were') && match.includes('would')) {
        // 가정법 과거를 과거완료로
        return match.replace('would', 'would have').replace('were', 'had been');
      }
      return match;
    },
    verify: (sentence) => /\bIf\s+/i.test(sentence),
    explanation: '가정법 과거와 과거완료의 시제 일치가 필요합니다'
  },
  
  // 5. 병렬구조 (and, or, but)
  {
    name: 'parallelism',
    find: /\b(to\s+\w+|ing)\s+(and|or|but)\s+(to\s+\w+|\w+ing)/gi,
    createError: (match) => {
      if (match.includes('to') && match.includes('ing')) {
        return match; // 이미 오류 (병렬구조 위반)
      } else if (match.match(/to\s+\w+\s+(and|or|but)\s+to/)) {
        // to ~ and to를 to ~ and ing로
        return match.replace(/\s+to\s+(\w+)$/, ' $1ing');
      } else {
        // ing and ing를 ing and to로
        return match.replace(/\s+(\w+)ing$/, ' to $1');
      }
    },
    verify: (sentence) => /\b(and|or|but)\b/i.test(sentence),
    explanation: '병렬구조에서는 동일한 형태를 유지해야 합니다'
  },
  
  // 6. 재귀대명사 강조용법 vs 재귀용법
  {
    name: 'reflexive',
    find: /\b(himself|herself|itself|themselves|myself|yourself|ourselves)\b/gi,
    createError: (match) => {
      const reflexives = {
        'himself': 'him',
        'herself': 'her',
        'itself': 'it',
        'themselves': 'them',
        'myself': 'me',
        'yourself': 'you',
        'ourselves': 'us'
      };
      return reflexives[match.toLowerCase()] || match;
    },
    verify: (sentence) => /\b(himself|herself|itself|themselves)/i.test(sentence),
    explanation: '재귀대명사는 주어와 목적어가 같을 때 사용합니다'
  },
  
  // 7. 전치사 + 관계대명사 (in which, for which, etc.)
  {
    name: 'preposition_relative',
    find: /\b(in|on|at|for|with|by|from|to)\s+(which|that|where|when)\b/gi,
    createError: (match) => {
      const [prep, rel] = match.split(/\s+/);
      if (rel === 'which') {
        return `${prep} that`; // 전치사 뒤 that 오류
      } else if (rel === 'where' || rel === 'when') {
        return `${prep} which`;
      }
      return match;
    },
    verify: (sentence) => /\b(in|on|at|for|with)\s+(which|where|when)/i.test(sentence),
    explanation: '전치사 뒤에는 관계대명사 that을 쓸 수 없습니다'
  },
  
  // 8. 도치구문 (부정어구 도치)
  {
    name: 'inversion',
    find: /^(Never|Rarely|Seldom|Hardly|Scarcely|Not\s+only|No\s+sooner)\s+(\w+)\s+(have|has|had|do|does|did|is|are|was|were)/gi,
    createError: (match) => {
      // 도치를 일반 어순으로
      const parts = match.match(/^(\w+\s*\w*)\s+(\w+)\s+(\w+)/);
      if (parts) {
        return `${parts[1]} ${parts[3]} ${parts[2]}`;
      }
      return match;
    },
    verify: (sentence) => /^(Never|Rarely|Seldom|Hardly)/i.test(sentence),
    explanation: '부정어구가 문두에 올 때는 주어와 동사가 도치됩니다'
  },
  
  // 9. 비교급/최상급 혼동
  {
    name: 'comparison',
    find: /\b(more|most|less|least)\s+(\w+er|est)\b/gi,
    createError: (match) => match, // 이미 오류 (이중 비교급)
    verify: (sentence) => /\b(more|most)\s+\w+er/i.test(sentence),
    explanation: '비교급은 -er 또는 more 중 하나만 사용해야 합니다'
  },
  
  // 10. 시제 일치 (주절-종속절)
  {
    name: 'tense_sequence',
    find: /\b(said|told|thought|believed)\s+that\s+\w+\s+(is|are|has|have)\b/gi,
    createError: (match) => {
      // 현재시제를 과거시제로 (시제 일치 위반)
      return match.replace(/\b(is|are)\b/, (m) => m === 'is' ? 'was' : 'were')
                  .replace(/\b(has|have)\b/, 'had');
    },
    verify: (sentence) => /\b(said|told|thought)\s+that/i.test(sentence),
    explanation: '주절이 과거시제일 때 종속절도 과거시제를 사용해야 합니다'
  }
];

/**
 * 문장에서 고난도 밑줄 위치 찾기
 */
function findAdvancedTargets(sentence) {
  const targets = [];
  
  // 수능 빈출 문법 요소들
  const patterns = [
    // 관계사류
    { regex: /\b(what|that|which|who|whom|whose|where|when)\b/gi, type: '관계사' },
    // 준동사류
    { regex: /\b(\w+ing|\w+ed|to\s+\w+)\b/gi, type: '준동사' },
    // 접속사류
    { regex: /\b(although|though|even\s+though|whereas|while|unless|provided|supposing)\b/gi, type: '접속사' },
    // 가정법 관련
    { regex: /\b(would|could|might|should)\s+(have|be)\b/gi, type: '가정법조동사' },
    // 분사구문
    { regex: /^(\w+ing|\w+ed),/gi, type: '분사구문' },
    // 재귀대명사
    { regex: /\b(himself|herself|itself|themselves|myself|yourself|ourselves)\b/gi, type: '재귀대명사' },
    // 비교급
    { regex: /\b(more|most|less|least|better|worse|further)\b/gi, type: '비교급' },
    // 수동태
    { regex: /\b(be|been|being)\s+\w+ed\b/gi, type: '수동태' }
  ];
  
  patterns.forEach(({ regex, type }) => {
    let match;
    while ((match = regex.exec(sentence)) !== null) {
      targets.push({
        word: match[0],
        index: match.index,
        type: type
      });
    }
  });
  
  return targets;
}

/**
 * CSAT 고난도 어법문제 생성 (기본 vs 고급 모드)
 */
function generateCSATGrammarProblem(passage, options = {}) {
  const rng = createRng(options.seed || Date.now());
  const isAdvanced = options.difficulty === 'advanced';
  
  console.log(`\n🎯 CSAT 어법문제 생성 시작 (v5.0 - ${isAdvanced ? '고급 모드' : '기본 모드'})`);
  
  // 문장 분리 (더 긴 문장 선호)
  const sentences = passage.split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.split(' ').length >= 7); // 더 긴 문장만
  
  if (sentences.length < 5) {
    const allSentences = passage.split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);
    
    while (sentences.length < 5 && allSentences.length > 0) {
      sentences.push(allSentences.shift());
    }
  }
  
  console.log(`📝 문장 수: ${sentences.length}개`);
  
  // 5개 문장 선택
  const selectedSentences = shuffle(sentences, rng).slice(0, 5);
  while (selectedSentences.length < 5) {
    selectedSentences.push(sentences[Math.floor(rng() * sentences.length)]);
  }
  
  // 고난도 패턴 적용 시도
  let errorCreated = false;
  let errorIndex = -1;
  let errorExplanation = '';
  
  // 각 문장에 대해 고난도 패턴 체크
  const choices = selectedSentences.map((sentence, idx) => {
    // 이미 오류가 생성되었으면 일반 밑줄만
    if (errorCreated) {
      const targets = findAdvancedTargets(sentence);
      if (targets.length > 0) {
        const target = targets[Math.floor(rng() * targets.length)];
        return sentence.substring(0, target.index) + 
               `《${target.word}》` + 
               sentence.substring(target.index + target.word.length);
      }
      return sentence;
    }
    
    // 고난도 패턴 적용 시도
    for (const pattern of ADVANCED_GRAMMAR_PATTERNS) {
      if (pattern.verify && pattern.verify(sentence)) {
        const matches = sentence.match(pattern.find);
        if (matches) {
          const match = matches[0];
          const errorVersion = pattern.createError(match);
          if (errorVersion !== match) {
            // 오류 생성 성공
            errorIndex = idx;
            errorExplanation = pattern.explanation;
            errorCreated = true;
            
            const errorSentence = sentence.replace(match, errorVersion);
            // 오류 부분에 밑줄
            const errorWord = errorVersion.match(/\b(\w+)\b/)[1];
            const errorIdx = errorSentence.indexOf(errorWord);
            return errorSentence.substring(0, errorIdx) +
                   `《${errorWord}》` +
                   errorSentence.substring(errorIdx + errorWord.length);
          }
        }
      }
    }
    
    // 패턴 적용 실패시 일반 밑줄
    const targets = findAdvancedTargets(sentence);
    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      return sentence.substring(0, target.index) + 
             `《${target.word}》` + 
             sentence.substring(target.index + target.word.length);
    }
    return sentence;
  });
  
  // 오류가 하나도 생성되지 않았다면 강제로 하나 생성
  if (!errorCreated) {
    errorIndex = Math.floor(rng() * 5);
    const sentence = selectedSentences[errorIndex];
    
    // 관계대명사 what 오류 강제 생성
    if (sentence.includes('that')) {
      choices[errorIndex] = sentence.replace(/\bthat\b/, '《what》');
      errorExplanation = '관계대명사 that과 what의 구별';
    } else if (sentence.includes('which')) {
      choices[errorIndex] = sentence.replace(/\bwhich\b/, '《what》');
      errorExplanation = '관계대명사 which와 what의 구별';
    } else {
      // 마지막 수단: 분사 오류
      const ingWord = sentence.match(/\b(\w+ing)\b/);
      if (ingWord) {
        const edForm = ingWord[1].slice(0, -3) + 'ed';
        choices[errorIndex] = sentence.replace(ingWord[0], `《${edForm}》`);
        errorExplanation = '현재분사와 과거분사의 구별';
      }
    }
  }
  
  // 선택지 번호 부착
  const symbols = ['①', '②', '③', '④', '⑤'];
  const numberedChoices = choices.map((choice, i) => 
    `${symbols[i]} ${choice}`
  );
  
  console.log(`✅ 정답: ${errorIndex + 1}번 (${symbols[errorIndex]})`);
  console.log(`📖 해설: ${errorExplanation}`);
  
  return {
    type: 'grammar',
    question: '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?',
    choices: numberedChoices,
    correctAnswer: errorIndex,
    explanation: errorExplanation,
    difficulty: 'advanced',
    metadata: {
      pattern: 'advanced',
      errorType: 'grammar'
    }
  };
}

/**
 * 고급 모드: 여러 개의 오류가 있는 문제 생성
 */
function generateAdvancedGrammarProblem(passage, options = {}) {
  const rng = createRng(options.seed || Date.now());
  
  console.log('\n🔥 고급 어법문제 생성 (여러 개의 오류)');
  
  // 문장 분리
  const sentences = passage.split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.split(' ').length >= 6);
  
  // 최소 3개 문장 필요
  if (sentences.length < 3) {
    const allSentences = passage.split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);
    
    while (sentences.length < 3 && allSentences.length > 0) {
      sentences.push(allSentences.shift());
    }
  }
  
  // 오류 생성 (1~3개 랜덤)
  const errorCount = Math.floor(rng() * 3) + 1; // 1~3개
  const selectedSentences = shuffle(sentences, rng).slice(0, Math.max(3, errorCount));
  
  let errorsCreated = 0;
  const processedSentences = [];
  
  selectedSentences.forEach((sentence, idx) => {
    let modifiedSentence = sentence;
    let hasError = false;
    
    // 아직 오류 개수가 부족하면 오류 생성 시도
    if (errorsCreated < errorCount) {
      // 패턴별로 오류 생성 시도
      for (const pattern of shuffle(ADVANCED_GRAMMAR_PATTERNS, rng)) {
        if (pattern.verify && pattern.verify(sentence)) {
          const matches = sentence.match(pattern.find);
          if (matches) {
            const match = matches[0];
            const errorVersion = pattern.createError(match);
            if (errorVersion !== match) {
              modifiedSentence = sentence.replace(match, errorVersion);
              hasError = true;
              errorsCreated++;
              break;
            }
          }
        }
      }
      
      // 패턴 매칭 실패시 강제 오류 생성
      if (!hasError && errorsCreated < errorCount) {
        // 간단한 오류 생성
        if (sentence.includes(' is ')) {
          modifiedSentence = sentence.replace(' is ', ' are ');
          hasError = true;
          errorsCreated++;
        } else if (sentence.includes(' are ')) {
          modifiedSentence = sentence.replace(' are ', ' is ');
          hasError = true;
          errorsCreated++;
        } else if (sentence.includes(' has ')) {
          modifiedSentence = sentence.replace(' has ', ' have ');
          hasError = true;
          errorsCreated++;
        }
      }
    }
    
    // 밑줄 추가 (모든 문장에)
    const targets = findAdvancedTargets(modifiedSentence);
    if (targets.length > 0) {
      // 2~3개 위치에 밑줄
      const underlineCount = Math.min(3, Math.floor(rng() * 2) + 2);
      const selectedTargets = shuffle(targets, rng).slice(0, underlineCount);
      
      // 정렬해서 뒤에서부터 치환 (인덱스 꼬임 방지)
      selectedTargets.sort((a, b) => b.index - a.index);
      
      for (const target of selectedTargets) {
        modifiedSentence = modifiedSentence.substring(0, target.index) +
                          `《${target.word}》` +
                          modifiedSentence.substring(target.index + target.word.length);
      }
    }
    
    processedSentences.push({
      text: modifiedSentence,
      hasError: hasError
    });
  });
  
  // 전체 텍스트 구성
  const fullText = processedSentences.map(s => s.text).join(' ');
  
  // 선택지 생성: 0개, 1개, 2개, 3개, 4개
  const choices = ['0개', '1개', '2개', '3개', '4개'];
  
  console.log(`✅ 실제 오류 개수: ${errorsCreated}개`);
  
  return {
    type: 'grammar_count',
    question: '다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?',
    text: fullText,
    choices: choices,
    correctAnswer: errorsCreated, // 0~4 중 하나
    explanation: `이 문제에는 ${errorsCreated}개의 어법 오류가 있습니다.`,
    difficulty: 'advanced',
    metadata: {
      errorCount: errorsCreated,
      pattern: 'multiple_errors'
    }
  };
}

module.exports = {
  generateCSATGrammarProblem,
  generateAdvancedGrammarProblem
};