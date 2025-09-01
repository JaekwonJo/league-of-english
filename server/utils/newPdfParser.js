/**
 * 새로운 PDF 파서 - 완전히 새로 작성
 * 고1_2024_09월(인천시)-읽기영역(1845번)_본문해석지_문제지.pdf 형식에 최적화
 */

class NewPDFParser {
  constructor() {
    this.debugMode = true;
  }

  /**
   * 메인 파싱 함수
   */
  async parse(rawText) {
    if (this.debugMode) {
      console.log('📄 새로운 PDF 파서 시작');
      console.log('📝 원본 텍스트 길이:', rawText.length);
      console.log('📝 첫 1000자 미리보기:');
      console.log(rawText.substring(0, 1000));
      console.log('=' .repeat(50));
    }

    // 1. 텍스트를 줄 단위로 분리
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (this.debugMode) {
      console.log('📄 전체 줄 수:', lines.length);
      console.log('📝 처음 20줄 확인:');
      lines.slice(0, 20).forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
      });
    }

    // 2. 제목 추출
    const title = this.extractTitle(lines);
    
    // 3. 영어 지문 추출
    const passages = this.extractEnglishPassages(lines);
    
    // 4. 출처 추출
    const sources = this.extractSources(lines);

    const result = {
      title: title,
      passages: passages,
      sources: sources,
      totalContent: passages.join('\n\n'),
      totalPassages: passages.length,
      totalSources: sources.length,
      metadata: {
        totalPassages: passages.length,
        totalSources: sources.length,
        extractedAt: new Date().toISOString()
      }
    };

    if (this.debugMode) {
      console.log('✅ 파싱 결과:');
      console.log('📚 제목:', result.title);
      console.log('📄 지문 수:', result.totalPassages);
      console.log('📍 출처 수:', result.totalSources);
      console.log('📝 전체 내용 길이:', result.totalContent.length);
    }

    return result;
  }

  /**
   * 제목 추출 - 파일명에서 추출하거나 첫 줄에서 찾기
   */
  extractTitle(lines) {
    // 고1_2024_09월(인천시)-읽기영역(1845번) 형식 찾기
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      
      // 고1, 고2, 고3 패턴
      if (line.match(/고[1-3].*\d{4}.*월/)) {
        return line.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      // 년도가 포함된 패턴
      if (line.match(/\d{4}년?.*월/)) {
        return line.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    
    // 기본값
    return `문서_${new Date().toISOString().substring(0, 10)}`;
  }

  /**
   * 영어 지문 추출 - 페이지별 완전한 지문 생성
   */
  extractEnglishPassages(lines) {
    const passages = [];
    let currentPassage = [];
    let currentPageNumber = null;
    
    if (this.debugMode) {
      console.log('🔍 페이지별 영어 지문 추출 시작...');
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 페이지 시작 패턴 감지 (예: "1. p2-no.20")
      const pageMatch = line.match(/^(\d+)\.\s*p\d+/);
      if (pageMatch) {
        // 이전 페이지 지문 저장
        if (currentPassage.length > 0) {
          const passage = currentPassage.join(' ').trim();
          if (passage.length > 100) { // 최소 길이 체크
            passages.push(passage);
            if (this.debugMode) {
              console.log(`📄 페이지 ${currentPageNumber} 지문 완성 (${passage.length}자): ${passage.substring(0, 100)}...`);
            }
          }
        }
        
        // 새 페이지 시작
        currentPageNumber = pageMatch[1];
        currentPassage = [];
        
        if (this.debugMode) {
          console.log(`🆕 페이지 ${currentPageNumber} 시작: ${line}`);
        }
        continue;
      }

      // 영어 문장인지 확인
      if (this.isEnglishSentence(line)) {
        currentPassage.push(line);
        if (this.debugMode && currentPassage.length <= 3) {
          console.log(`📝 페이지 ${currentPageNumber}: 영어 문장 추가 "${line}"`);
        }
      }
    }

    // 마지막 페이지 처리
    if (currentPassage.length > 0) {
      const passage = currentPassage.join(' ').trim();
      if (passage.length > 100) {
        passages.push(passage);
        if (this.debugMode) {
          console.log(`📄 마지막 페이지 ${currentPageNumber} 지문 완성 (${passage.length}자)`);
        }
      }
    }

    if (this.debugMode) {
      console.log(`✅ 총 ${passages.length}개 페이지별 완전한 지문 추출 완료`);
    }

    return passages;
  }

  /**
   * 영어 문장인지 판단
   */
  isEnglishSentence(line) {
    // 비어있거나 너무 짧으면 제외
    if (!line || line.length < 10) return false;
    
    // 한글이 포함되어 있으면 제외
    if (/[가-힣]/.test(line)) return false;
    
    // 숫자로만 시작하는 줄 제외 (문제 번호 등)
    if (/^\d+\.?\s*$/.test(line)) return false;
    
    // 특수 기호만 있는 줄 제외
    if (/^[^\w\s]+$/.test(line)) return false;
    
    // 영어 알파벳이 포함되어 있어야 함
    if (!/[a-zA-Z]/.test(line)) return false;
    
    // 영어 단어가 3개 이상 포함되어 있어야 함
    const words = line.split(/\s+/).filter(word => /[a-zA-Z]/.test(word));
    if (words.length < 3) return false;
    
    return true;
  }

  /**
   * 출처 정보 추출
   */
  extractSources(lines) {
    const sources = [];
    
    for (const line of lines) {
      // "숫자. p숫자-" 형식 찾기
      const match = line.match(/^\d+\.\s*(p\d+.*?)$/);
      if (match) {
        sources.push(match[1].trim());
      }
    }
    
    if (this.debugMode) {
      console.log('📍 추출된 출처:', sources);
    }
    
    return sources;
  }
}

module.exports = NewPDFParser;