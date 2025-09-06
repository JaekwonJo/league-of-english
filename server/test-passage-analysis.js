const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DocumentAnalyzer = require('./utils/documentAnalyzer');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 개별 지문 분석 테스트...\n');

// 올림포스 문서로 테스트
db.get('SELECT id, title, content FROM documents WHERE title LIKE "%올림%"', async (err, doc) => {
  if (err) {
    console.error('❌ 에러:', err);
    db.close();
    return;
  }
  
  if (!doc) {
    console.log('❌ 올림포스 문서를 찾을 수 없습니다.');
    db.close();
    return;
  }
  
  console.log('📄 문서 정보:');
  console.log('ID:', doc.id);
  console.log('제목:', doc.title);
  
  try {
    // content 파싱 테스트
    console.log('\n🔍 content 파싱 테스트...');
    const parsedContent = JSON.parse(doc.content);
    console.log('✅ JSON 파싱 성공!');
    console.log('passages 존재:', parsedContent.passages ? '있음' : '없음');
    
    if (parsedContent.passages) {
      console.log('passages 개수:', parsedContent.passages.length);
      
      // 첫 번째 지문으로 분석 테스트
      if (parsedContent.passages.length > 0) {
        console.log('\n🤖 첫 번째 지문 분석 테스트...');
        const firstPassage = parsedContent.passages[0];
        console.log('지문 길이:', firstPassage.length, '자');
        console.log('처음 200자:', firstPassage.substring(0, 200));
        
        // DocumentAnalyzer 테스트
        const analyzer = new DocumentAnalyzer();
        console.log('\n🚀 AI 분석 시작...');
        
        try {
          const analysis = await analyzer.analyzeIndividualPassage(firstPassage, 1);
          console.log('\n✅ 분석 성공!');
          console.log('분석 결과 키들:', Object.keys(analysis));
          
          if (analysis.comprehensive) {
            console.log('\n📊 종합 정리:');
            console.log('- 영어 제목:', analysis.comprehensive.englishTitle);
            console.log('- 한글 요지:', analysis.comprehensive.koreanSummary);
          }
          
        } catch (analysisError) {
          console.error('❌ 분석 실패:', analysisError.message);
        }
      }
    }
    
  } catch (e) {
    console.log('\n❌ JSON 파싱 실패:', e.message);
    console.log('Content 타입:', typeof doc.content);
    console.log('Content 처음 500자:', doc.content.substring(0, 500));
  }
  
  db.close();
});