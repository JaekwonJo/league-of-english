/**
 * 다중 지문 순서배열 문제 생성기
 * 원본 문서에서 모든 지문을 랜덤 선택하여 문제 생성
 */

// 기존 seq_strict_final의 핵심 로직 재사용 (개선된 문장 패턴)
const nz = s => String(s).replace(/\s+/g, ''); 
// 개선된 문장 패턴: 공백을 매치에 포함하지 않음
const SENT = /[^.!?]*[.!?](?=\s+[A-Z]|\s*$)/g;

const split = t => {
  let m, arr = [];
  SENT.lastIndex = 0;
  while (m = SENT.exec(t)) {
    // 텍스트를 추출할 때 공백 제거하여 원본 문장만 가져오기
    const cleanText = t.slice(m.index, m.index + m[0].length).trim();
    arr.push({s: m.index, e: m.index + m[0].length, tx: cleanText});
  }
  return arr;
};

const byWords = (t, k) => {
  const w = (t.match(/\S+\s*/g) || []);
  const n = Math.ceil(w.length / k);
  return Array.from({length: k}, (_, i) => w.slice(i * n, (i + 1) * n).join(''));
};

const cutRandomly = (full, k, originalFirstSentence = null) => {
  const allSentences = split(full);
  if (allSentences.length < k + 1) throw Error(`문장 부족: ${allSentences.length}개 (최소 ${k + 1}개 필요)`);
  
  // 원래 첫 문장이 제공되면 그것을 사용, 아니면 현재 첫 문장 사용
  let given = originalFirstSentence || allSentences[0].tx.trim();
  
  // 🔧 주어진 문장 길이 제한 및 검증 강화
  const validateAndFixGivenSentence = (sentence) => {
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
    if (cleaned.length < 15 || /^[A-Z]\.$/.test(cleaned)) {
      console.log(`⚠️ 부적절한 주어진 문장: "${cleaned}" - 더 긴 문장 사용`);
      
      // 전체 텍스트에서 적절한 길이의 완전한 문장 찾기
      const goodSentences = full.match(/[^.!?]{15,150}[.!?]/g);
      if (goodSentences && goodSentences.length > 0) {
        cleaned = goodSentences[0].trim();
        console.log(`✅ 대체 문장 사용: "${cleaned}"`);
      }
    }
    
    // 3. 여러 문장이 합쳐진 경우 처리
    const sentenceCount = (cleaned.match(/[.!?]/g) || []).length;
    if (sentenceCount > 1) {
      console.log(`⚠️ 여러 문장이 합쳐짐 (${sentenceCount}개): "${cleaned.substring(0, 100)}..."`);
      
      // 첫 번째 완전한 문장만 추출
      const firstSentence = cleaned.match(/[^.!?]*[.!?]/)?.[0]?.trim();
      if (firstSentence && firstSentence.length >= 15) {
        cleaned = firstSentence;
        console.log(`✅ 첫 번째 문장만 추출: "${cleaned}"`);
      }
    }
    
    return cleaned;
  };
  
  given = validateAndFixGivenSentence(given);
  
  console.log(`🔍 전체 문장 수: ${allSentences.length}개, 분할 요청: ${k}개`);
  
  // 🎯 핵심 개선: 전체 지문을 무작위 지점들로 분할
  // 첫 번째 문장 다음부터 마지막 문장까지의 범위에서 무작위 분할점 선택
  const availableRange = allSentences.slice(1); // 첫 문장 제외
  const totalSentences = availableRange.length;
  
  if (totalSentences < k) {
    throw Error(`분할 가능한 문장 부족: ${totalSentences}개 (${k}개 필요)`);
  }
  
  // 무작위 분할점들 생성 (중복 없이)
  const breakPoints = new Set();
  while (breakPoints.size < k - 1) {
    const randomPoint = Math.floor(Math.random() * (totalSentences - 1)) + 1;
    breakPoints.add(randomPoint);
  }
  
  // 분할점들을 정렬하여 순서대로 분할
  const sortedBreakPoints = [0, ...Array.from(breakPoints).sort((a, b) => a - b), totalSentences];
  console.log(`🎲 무작위 분할점들: [${sortedBreakPoints.join(', ')}]`);
  
  const parts = [];
  for (let i = 0; i < sortedBreakPoints.length - 1; i++) {
    const start = sortedBreakPoints[i];
    const end = sortedBreakPoints[i + 1];
    
    // 해당 범위의 문장들을 결합
    const sentencesInRange = availableRange.slice(start, end);
    const partText = sentencesInRange.map(s => s.tx).join('').trim();
    
    if (partText.length > 0) {
      parts.push(partText);
      console.log(`📝 Part ${i + 1}: ${sentencesInRange.length}개 문장, ${partText.length}자`);
    }
  }
  
  // 전체 내용이 보존되었는지 검증
  const originalContent = availableRange.map(s => s.tx).join('').trim();
  const reconstructedContent = parts.join('').trim();
  
  if (nz(originalContent) !== nz(reconstructedContent)) {
    console.error('⚠️ 내용 불일치 감지:');
    console.error('원본 길이:', originalContent.length);
    console.error('재구성 길이:', reconstructedContent.length);
    throw Error('[오류] 무작위 분할 후 내용 불일치');
  }
  
  console.log(`✅ 무작위 분할 완료: ${parts.length}개 부분, 전체 내용 보존 확인`);
  return { given, parts };
};

/**
 * 문서에서 개별 지문 분리
 */
const separatePassages = (document) => {
  // 구분자로 분리 (--- 또는 \n\n\n 또는 빈 줄 여러 개)
  let passages = document.content.split(/\n\n---\n\n|\n{3,}|(?:\r?\n\s*){3,}/);
  
  // 빈 지문 제거 및 정리
  passages = passages
    .map(p => p.trim())
    .filter(p => p.length > 200 && p.length < 2000) // 200-2000자 범위 (적당한 길이)
    .filter(p => /[a-zA-Z]/.test(p)) // 영어 포함
    .filter(p => {
      // 최소 6개 이상의 문장이 있는지 확인 (첫 문장 + 5개 선택지)
      const sentences = p.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.length >= 6; // 첫 문장 + 최소 5개 선택지 (고급 모드 대응)
    });
  
  console.log(`📖 전체 분리된 지문: ${passages.length}개`);
  
  // 각 지문을 더 세분화하여 적절한 크기로 만들기
  const refinedPassages = [];
  passages.forEach((passage, index) => {
    const sentences = passage.match(/[^.!?]+[.!?]+/g) || [];
    console.log(`📄 지문 ${index + 1}: ${sentences.length}개 문장`);
    
    if (sentences.length >= 15) {
      // 🎯 매우 긴 지문: 무작위 구간들로 여러 개 생성
      const minSentencesPerPart = 6; // 최소 6개 문장 필요
      const maxParts = Math.floor(sentences.length / minSentencesPerPart);
      const numParts = Math.min(maxParts, 4); // 최대 4개 부분으로 제한
      
      console.log(`🎲 긴 지문을 ${numParts}개 무작위 구간으로 분할`);
      
      for (let partIndex = 0; partIndex < numParts; partIndex++) {
        // 무작위 시작점 선택 (첫 문장은 제외하고)
        const maxStart = sentences.length - minSentencesPerPart;
        const randomStart = Math.floor(Math.random() * Math.max(1, maxStart));
        
        // 무작위 길이 선택 (최소 6개, 최대 남은 문장 수)
        const remainingSentences = sentences.length - randomStart;
        const partLength = Math.min(
          minSentencesPerPart + Math.floor(Math.random() * 4), // 6~9개 문장
          remainingSentences
        );
        
        const randomEnd = randomStart + partLength;
        const partSentences = sentences.slice(randomStart, randomEnd);
        const partText = partSentences.join(' ').trim();
        
        if (partText.length > 200 && partSentences.length >= minSentencesPerPart) {
          refinedPassages.push(partText);
          console.log(`📝 무작위 구간 ${partIndex + 1}: 문장 ${randomStart + 1}~${randomEnd}, ${partSentences.length}개 문장`);
        }
      }
    } else if (sentences.length >= 10) {
      // 중간 길이 지문: 2개 무작위 구간으로 분할
      const part1Start = 0;
      const part1End = Math.floor(sentences.length * (0.4 + Math.random() * 0.2)); // 40-60% 지점
      const part2Start = Math.max(part1End - 1, Math.floor(sentences.length * 0.3));
      const part2End = sentences.length;
      
      const part1 = sentences.slice(part1Start, part1End).join(' ').trim();
      const part2 = sentences.slice(part2Start, part2End).join(' ').trim();
      
      if (part1.length > 200 && part1.split(/[.!?]+/).length >= 6) {
        refinedPassages.push(part1);
        console.log(`📝 무작위 전반부: 문장 1~${part1End}`);
      }
      if (part2.length > 200 && part2.split(/[.!?]+/).length >= 6) {
        refinedPassages.push(part2);
        console.log(`📝 무작위 후반부: 문장 ${part2Start + 1}~${part2End}`);
      }
    } else if (sentences.length >= 6) {
      refinedPassages.push(passage);
      console.log(`📝 전체 지문 사용: ${sentences.length}개 문장`);
    }
  });
  
  console.log(`📖 정제된 지문 개수: ${refinedPassages.length}개`);
  
  return refinedPassages.map((passage, index) => ({
    title: document.title || 'Untitled',
    num: (index + 1).toString(),
    p: passage,
    source: document.sources && document.sources[index] ? document.sources[index] : `지문-${index + 1}`
  }));
};

/**
 * 순서배열 문제 생성 (개선된 버전)
 */
const makeOrderProblem = (passageObj, choiceCount = 3, documentFirstSentence = null) => {
  try {
    const L = 'ABCDE'.slice(0, choiceCount).split(''); 
    const {given, parts} = cutRandomly(passageObj.p, choiceCount, documentFirstSentence);
    
    // 무작위로 배열된 문장들을 A, B, C, D, E 라벨과 매칭
    const shuffledParts = [...parts].sort(() => Math.random() - 0.5);
    const items = shuffledParts.map((x, i) => ({l: L[i], x}));
    
    return {
      title: passageObj.title,
      number: passageObj.num,
      source: passageObj.source,
      given,
      items,
      ans: L.join('-'),
      order: items.map(o => o.l).join('-')
    };
  } catch (error) {
    console.error(`지문 ${passageObj.num} 처리 실패:`, error.message);
    return null;
  }
};

/**
 * 랜덤 지문 선택하여 문제 생성
 */
const generateRandomOrderProblems = (document, count = 1, options = {}) => {
  const passages = separatePassages(document);
  const problems = [];
  const choiceCount = options.orderDifficulty === 'advanced' ? 5 : 3;
  
  if (passages.length === 0) {
    throw new Error('처리 가능한 지문이 없습니다.');
  }
  
  // 전체 문서의 실제 첫 문장 추출
  const fullText = document.content || '';
  const documentFirstSentence = (fullText.match(/[^.!?]+[.!?]+/) || [])[0]?.trim();
  console.log(`📌 전체 문서의 첫 문장: "${documentFirstSentence}"`);
  
  if (!documentFirstSentence) {
    throw new Error('문서에서 첫 문장을 찾을 수 없습니다.');
  }
  
  // 성공할 때까지 최대 passages.length * 2번 시도
  const maxAttempts = Math.min(passages.length * 2, 50);
  let attempts = 0;
  const usedIndices = new Set();
  
  // 요청된 문제 수만큼 생성
  for (let i = 0; i < count && attempts < maxAttempts; attempts++) {
    // 랜덤 지문 선택 (중복 방지)
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * passages.length);
    } while (usedIndices.has(randomIndex) && usedIndices.size < passages.length);
    
    const selectedPassage = passages[randomIndex];
    console.log(`🎯 선택된 지문 ${selectedPassage.num}: ${selectedPassage.source} (시도 ${attempts + 1})`);
    
    try {
      console.log(`🎯 선택지 개수: ${choiceCount}개 (${options.orderDifficulty})`);
      const problem = makeOrderProblem(selectedPassage, choiceCount, documentFirstSentence);
      if (problem) {
        console.log(`📝 생성된 문제 선택지: ${problem.items.length}개`);
        problems.push(problem);
        usedIndices.add(randomIndex);
        i++; // 성공한 경우만 카운터 증가
        console.log(`✅ 문제 생성 성공! (${i}/${count})`);
      }
    } catch (error) {
      console.log(`❌ 지문 ${selectedPassage.num} 처리 실패: ${error.message}`);
      // 실패한 지문은 제외하지 않고 다시 시도할 수 있도록 함
    }
    
    // 모든 지문을 시도했는데도 실패한 경우
    if (usedIndices.size >= passages.length && problems.length === 0) {
      console.log('⚠️ 모든 지문 처리 실패, 더 관대한 조건으로 재시도...');
      return generateFallbackProblems(passages, count, choiceCount);
    }
  }
  
  if (problems.length === 0) {
    throw new Error('문제 생성 실패: 모든 지문에서 처리 실패');
  }
  
  return problems;
};

/**
 * 폴백 문제 생성 (더 관대한 조건)
 */
const generateFallbackProblems = (passages, count, choiceCount) => {
  console.log('🔄 폴백 모드: 더 간단한 조건으로 문제 생성...');
  
  for (const passage of passages) {
    try {
      // 더 간단한 로직으로 문제 생성
      const sentences = passage.p.match(/[^.!?]+[.!?]+/g) || [];
      console.log(`🔄 폴백 시도: 지문 문장 수 ${sentences.length}개, 필요한 선택지 ${choiceCount}개`);
      if (sentences.length >= choiceCount + 1) {
        const given = sentences[0].trim();
        const remaining = sentences.slice(1, choiceCount + 1);
        
        const L = 'ABCDE'.slice(0, choiceCount).split('');
        const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5);
        const items = shuffledRemaining.map((x, i) => ({l: L[i], x: x.trim()}));
        console.log(`✅ 폴백 문제 생성 성공: ${items.length}개 선택지`);
        
        return [{
          title: passage.title,
          number: passage.num,
          source: passage.source,
          given,
          items,
          ans: L.join('-'),
          order: items.map(o => o.l).join('-')
        }];
      }
    } catch (error) {
      console.log(`❌ 폴백도 실패: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('폴백 모드에서도 문제 생성 실패');
};

/**
 * 감성적인 문제 출력 (그래픽 효과 포함)
 */
const printProblemWithEffects = (problem) => {
  console.log('\n' + '═'.repeat(60));
  console.log('🌟 LEAGUE OF ENGLISH - 순서배열 문제 🌟');
  console.log('═'.repeat(60));
  console.log(`📚 제목: ${problem.title}`);
  console.log(`📄 문제번호: ${problem.number}`);
  console.log(`📍 출처: ${problem.source}`);
  console.log('─'.repeat(60));
  console.log('✨ Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.');
  console.log('');
  console.log(`🎯 [주어진 문장]`);
  console.log(`   ${problem.given}`);
  console.log('');
  console.log('📝 [선택지]');
  problem.items.forEach((item, idx) => {
    console.log(`   ${item.l}. ${item.x.trim()}`);
  });
  console.log('');
  console.log(`🔑 정답: ${problem.ans} | 제시순서: ${problem.order}`);
  console.log('═'.repeat(60));
};

module.exports = {
  separatePassages,
  makeOrderProblem,
  generateRandomOrderProblems,
  printProblemWithEffects
};