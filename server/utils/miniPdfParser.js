/**
 * Mini PDF Parser - 초압축 버전
 * 페이지별로 영어 지문을 추출하는 간단하고 효과적인 파서
 */

const TITLE_SCAN = 10;
const RE_SRC = /^\d+\.\s*p\d+(?:~\d+)?-(?:no\.\d+|.*수능.*|.*)/;
const RE_NEXT = /^\d+\.\s*p/;
const RE_SUM = /^[─\-–>→]+/;

const hasKo = s => /[\uAC00-\uD7A3]/.test(s);
const isEn = s => !hasKo(s) && /[A-Za-z]/.test(s);
const lines = t => t.split(/\r?\n/).map(s=>s.replace(/\u00a0/g,' ').trim()).filter(Boolean);

const joinHyphen = arr => {
  const out = [];
  for(let i = 0; i < arr.length; i++){
    let L = arr[i];
    if(L.endsWith('-')){ 
      out.push(L.slice(0,-1) + (arr[i+1] || '').trim()); 
      i++; 
    } else {
      out.push(L);
    }
  }
  return out.join(' ').replace(/\s+/g,' ').trim();
};

function extractAllFromPage(pageText, pIdx) {
  const L = lines(pageText);
  if(!L.length) return [];
  
  const results = [];
  
  // 전체 제목 찾기 (한 번만)
  let globalTitle = '';
  for(let i = 0; i < Math.min(L.length, TITLE_SCAN); i++){
    if(hasKo(L[i]) && !/^Q\./.test(L[i]) && !/Worksheet Maker/i.test(L[i])){
      globalTitle = L[i];
      break;
    }
  }
  
  // 모든 출처 패턴 찾기
  const sourceIndices = [];
  for(let i = 0; i < L.length; i++){
    if(RE_SRC.test(L[i]) || /^\d+\.\s*p\d+/.test(L[i])){
      sourceIndices.push(i);
    }
  }
  
  console.log(`📍 페이지 ${pIdx + 1}에서 ${sourceIndices.length}개 출처 발견:`, sourceIndices.map(i => L[i]));
  
  // 각 출처별로 지문 추출
  for(let j = 0; j < sourceIndices.length; j++){
    const sIdx = sourceIndices[j];
    const nextSIdx = j < sourceIndices.length - 1 ? sourceIndices[j + 1] : L.length;
    
    const source = L[sIdx];
    const en = [];
    
    // 출처 다음부터 다음 출처 전까지 영어 지문 수집
    for(let i = sIdx + 1; i < nextSIdx; i++){
      const S = L[i];
      if(RE_SUM.test(S)) break; // 요약선이 나오면 중단
      if(!isEn(S)) continue; // 한국어는 건너뜀
      en.push(S);
    }
    
    const passage = joinHyphen(en);
    
    if(passage && passage.length > 30) { // 최소 길이 체크
      results.push({
        page: pIdx + 1,
        title: globalTitle,
        source,
        passage
      });
      console.log(`✅ 지문 ${j + 1} 추출: ${passage.length}자`);
    }
  }
  
  return results;
}

class MiniPdfParser {
  /**
   * PDF 텍스트를 페이지별로 파싱하여 모든 지문 추출
   */
  parse(pdfText) {
    console.log('🔍 Mini PDF Parser 시작...');
    
    // 페이지별로 분할 (Form Feed 문자 기준)
    const pages = pdfText.split('\f').length > 1 
      ? pdfText.split('\f') 
      : [pdfText];
    
    console.log(`📄 총 ${pages.length}개 페이지 발견`);
    
    const allResults = [];
    const allPassages = [];
    let globalTitle = '';
    
    pages.forEach((pageText, pageIdx) => {
      const pageResults = extractAllFromPage(pageText, pageIdx);
      
      pageResults.forEach(result => {
        allResults.push(result);
        allPassages.push({
          problemNumber: allPassages.length + 1,
          passage: result.passage,
          source: result.source,
          page: result.page
        });
        
        // 첫 번째 결과의 제목을 전체 제목으로 사용
        if(!globalTitle && result.title) {
          globalTitle = result.title;
        }
      });
    });
    
    // 출처 목록 수집
    const sources = allResults.map(r => r.source).filter(Boolean);
    
    console.log(`🎯 총 ${allPassages.length}개 지문 추출 완료`);
    console.log(`📚 제목: ${globalTitle}`);
    console.log(`📖 출처: ${sources.join(', ')}`);
    
    return {
      title: globalTitle,
      sources: sources,
      passages: allPassages,
      metadata: {
        totalPages: pages.length,
        totalPassages: allPassages.length,
        extractedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = MiniPdfParser;