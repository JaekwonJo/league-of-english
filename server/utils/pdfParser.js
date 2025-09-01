/**
 * PDF 파싱 및 구조화된 텍스트 추출 유틸리티
 * 수능 영어 문제지 전용 파서
 */

class StructuredPDFParser {
  /**
   * PDF 텍스트에서 제목 추출
   * 예: "2025년인제고1학년2학기중간고사_올림포스2" → "2025년 인제고1학년 2학기 중간고사 - 올림포스2"
   */
  extractTitle(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // 첫 번째 줄에서 제목 패턴 찾기
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // 년도로 시작하고 한글이 포함된 패턴
      if (line.match(/^\d{4}년.*[가-힣]/)) {
        return this.cleanTitle(line);
      }
      
      // 고1, 고2, 고3 패턴
      if (line.match(/고[1-3].*[가-힣]/)) {
        return this.cleanTitle(line);
      }
    }
    
    return lines[0] || 'Unknown Title';
  }

  /**
   * 제목 정리
   */
  cleanTitle(title) {
    return title
      .replace(/Q\.\s*본문과.*$/g, '') // Q. 본문과... 제거
      .replace(/본문해석지.*$/g, '') // 본문해석지... 제거
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 출처 정보 추출
   * 예: "1. p32-수능 대비 ANALYSIS" → ["p32-수능 대비 ANALYSIS"]
   */
  extractSources(text) {
    const sources = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // "숫자. p숫자-" 패턴 찾기 (더 유연하게)
      const sourceMatch = trimmed.match(/^\d+\.\s*(p\d+[-–—].+?)(?=\s*$)/);
      if (sourceMatch) {
        sources.push(sourceMatch[1].trim());
        continue;
      }
      
      // "숫자. p숫자 " 패턴도 처리
      const simpleSourceMatch = trimmed.match(/^\d+\.\s*(p\d+.*?)(?=\s*$)/);
      if (simpleSourceMatch) {
        sources.push(simpleSourceMatch[1].trim());
      }
    }
    
    return sources;
  }

  /**
   * 영어 원문만 추출 (왼쪽 컬럼)
   * 각 문제별로 영어 지문을 분리하여 추출
   */
  extractEnglishPassages(text) {
    const passages = [];
    const lines = text.split('\n');
    let currentPassage = [];
    let currentSource = '';
    let problemNumber = 0;
    let isCollectingEnglish = false;
    
    console.log('🔍 텍스트 라인 분석 시작...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // 디버그: "숫자." 로 시작하는 모든 줄 확인
      if (/^\d+\./.test(line)) {
        console.log(`🔍 숫자로 시작하는 줄:`, line);
      }
      
      // 문제 시작 패턴 감지 - 더 유연하게
      const problemStart = line.match(/^(\d+)\.\s*(p\d+.*?)$/);
      if (problemStart) {
        console.log(`📝 문제 ${problemStart[1]} 발견:`, problemStart[2]);
        
        // 이전 문제 저장
        if (currentPassage.length > 0) {
          const passage = this.cleanEnglishPassage(currentPassage.join('\n'));
          if (passage.length > 30) {
            passages.push({
              problemNumber,
              passage,
              source: currentSource
            });
            console.log(`✅ 문제 ${problemNumber} 지문 추출 완료 (${passage.length}자)`);
          }
        }
        
        problemNumber = parseInt(problemStart[1]);
        currentSource = problemStart[2];
        currentPassage = [];
        isCollectingEnglish = true;
        continue;
      }
      
      if (isCollectingEnglish) {
        // 영어 문장으로 판단되는 줄만 수집
        if (this.isEnglishLine(line) && !this.isKoreanLine(line)) {
          currentPassage.push(line);
        }
      }
    }
    
    // 마지막 문제 처리
    if (currentPassage.length > 0) {
      const passage = this.cleanEnglishPassage(currentPassage.join('\n'));
      if (passage.length > 30) {
        passages.push({
          problemNumber,
          passage,
          source: currentSource
        });
        console.log(`✅ 마지막 문제 ${problemNumber} 지문 추출 완료 (${passage.length}자)`);
      }
    }
    
    console.log(`🎯 총 ${passages.length}개 지문 추출 완료`);
    return passages;
  }

  /**
   * 한글이 주를 이루는 줄인지 판단
   */
  isKoreanLine(line) {
    if (!line || line.length === 0) return false;
    
    const koreanChars = (line.match(/[가-힣]/g) || []).length;
    const totalChars = line.replace(/[\s\d\.\,\?\!\-]/g, '').length;
    
    // 한글이 50% 이상이면 한글 줄로 판단
    return totalChars > 0 && (koreanChars / totalChars) > 0.5;
  }

  /**
   * 영어가 주를 이루는 줄인지 판단
   */
  isEnglishLine(line) {
    if (!line || line.length === 0) return false;
    
    // 숫자로만 이루어진 줄 제외
    if (/^\d+[\.\s]*$/.test(line.trim())) return false;
    
    const englishChars = (line.match(/[a-zA-Z]/g) || []).length;
    const totalChars = line.replace(/[\s\d\.\,\?\!\-\(\)]/g, '').length;
    
    // 영어가 30% 이상이고 최소 10글자 이상의 영어가 있으면 영어 줄로 판단
    return englishChars >= 10 && totalChars > 0 && (englishChars / totalChars) > 0.3;
  }

  /**
   * 영어 지문 정리
   */
  cleanEnglishPassage(passage) {
    return passage
      // 출처 정보 제거 (숫자. p숫자- 패턴)
      .replace(/^\d+\.\s*p\d+[-–—][^\n]*\n?/gm, '')
      // 연속된 공백을 하나로
      .replace(/\s+/g, ' ')
      // 문장 끝 정리
      .replace(/\.\s*\./g, '.')
      .trim();
  }

  /**
   * 전체 파싱 실행
   */
  parse(pdfText) {
    const title = this.extractTitle(pdfText);
    const sources = this.extractSources(pdfText);
    const passages = this.extractEnglishPassages(pdfText);
    
    return {
      title,
      sources,
      passages,
      metadata: {
        totalPassages: passages.length,
        extractedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = StructuredPDFParser;