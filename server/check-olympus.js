const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 올림포스 문서 형식 확인 중...\n');

db.get('SELECT id, title, content FROM documents WHERE title LIKE "%올림%"', (err, doc) => {
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
  console.log('\n📝 현재 저장된 내용 (처음 1000자):');
  console.log(doc.content.substring(0, 1000));
  
  console.log('\n📊 상세 분석:');
  console.log('전체 길이:', doc.content.length);
  
  try {
    const parsed = JSON.parse(doc.content);
    console.log('\n✅ JSON 파싱 성공!');
    console.log('최상위 키들:', Object.keys(parsed));
    
    if (parsed.passages) {
      console.log('passages 배열 존재: ✅');
      console.log('passages 개수:', parsed.passages.length);
      
      if (parsed.passages.length > 0) {
        console.log('\n첫 번째 passage (처음 300자):');
        console.log(parsed.passages[0].substring(0, 300));
        
        console.log('\n각 passage 길이:');
        parsed.passages.forEach((p, i) => {
          console.log(`  Passage ${i + 1}: ${p.length}자`);
        });
      }
    } else {
      console.log('passages 배열 없음 ❌');
      console.log('실제 구조:', JSON.stringify(parsed).substring(0, 500));
    }
  } catch (e) {
    console.log('\n❌ JSON 파싱 실패:', e.message);
    console.log('문서가 JSON 형식이 아닙니다.');
    
    // 텍스트를 passages로 변환 시도
    console.log('\n🔧 텍스트를 passages 형식으로 변환 시도...');
    const passages = doc.content.split(/\n\n+/).filter(p => p.trim().length > 50);
    console.log(`${passages.length}개의 passage로 분할 가능`);
    
    if (passages.length > 0) {
      console.log('\n첫 번째 passage (처음 300자):');
      console.log(passages[0].substring(0, 300));
    }
  }
  
  db.close();
});