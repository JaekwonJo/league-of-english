/**
 * 다중 지문 순서배열 문제 생성기
 * 원본 문서에서 모든 지문을 랜덤 선택하여 문제 생성
 */

// 기존 seq_strict_final의 핵심 로직 재사용
const nz = s => String(s).replace(/\s+/g, ''); 
const SENT = /[^.!?]*[.!?](?:\s+|$)/g;

const split = t => {
  let m, arr = [];
  SENT.lastIndex = 0;
  while (m = SENT.exec(t)) {
    arr.push({s: m.index, e: SENT.lastIndex, tx: t.slice(m.index, SENT.lastIndex)});
  }
  return arr;
};

const byWords = (t, k) => {
  const w = (t.match(/\S+\s*/g) || []);
  const n = Math.ceil(w.length / k);
  return Array.from({length: k}, (_, i) => w.slice(i * n, (i + 1) * n).join(''));
};

const cut = (full, k) => {
  const fst = split(full)[0]; 
  if (!fst) throw Error('문장 부족'); 
  const given = fst.tx.trim(); 
  let rem = full.slice(fst.e).trim();
  const ss = split(rem); 
  let parts = [];
  
  console.log(`🔍 분할 요청: ${k}개, 사용 가능한 문장: ${ss.length}개`);
  
  if (ss.length >= k) {
    const base = Math.floor(ss.length / k);
    const r = ss.length % k; 
    let i = 0; 
    for (let j = 0; j < k; j++) {
      const take = base + (j < r ? 1 : 0); 
      const s = ss[i].s;
      const e = ss[i + take - 1].e; 
      parts.push(rem.slice(s, e)); 
      i += take;
    }
    console.log(`✅ 문장 기반 분할 완료: ${parts.length}개 부분`);
  } else {
    parts = byWords(rem, k);
    console.log(`⚡ 단어 기반 분할로 대체: ${parts.length}개 부분`);
  }
  
  if (nz(parts.join('')) !== nz(rem)) throw Error('[오류] 지문 병합 불일치(분할 실패)');
  return {given, parts};
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
    
    if (sentences.length >= 10) {
      // 매우 긴 지문은 여러 개로 분할
      const midPoint = Math.floor(sentences.length / 2);
      const part1 = sentences.slice(0, midPoint + 1).join(' ').trim();
      const part2 = sentences.slice(midPoint - 1).join(' ').trim(); // 약간의 중복으로 연결성 확보
      
      // 각 부분이 충분한 문장을 가지는지 확인
      const part1Sentences = part1.match(/[^.!?]+[.!?]+/g) || [];
      const part2Sentences = part2.match(/[^.!?]+[.!?]+/g) || [];
      
      if (part1.length > 200 && part1Sentences.length >= 6) refinedPassages.push(part1);
      if (part2.length > 200 && part2Sentences.length >= 6) refinedPassages.push(part2);
    } else if (sentences.length >= 6) {
      refinedPassages.push(passage);
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
const makeOrderProblem = (passageObj, choiceCount = 3) => {
  try {
    const L = 'ABCDE'.slice(0, choiceCount).split(''); 
    const {given, parts} = cut(passageObj.p, choiceCount);
    
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
      const problem = makeOrderProblem(selectedPassage, choiceCount);
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