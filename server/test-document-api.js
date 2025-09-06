const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 문서 조회 테스트...\n');

db.get('SELECT * FROM documents WHERE id = 41', (err, doc) => {
  if (err) {
    console.error('❌ 에러:', err);
    db.close();
    return;
  }
  
  if (doc) {
    console.log('✅ 문서 조회 성공!');
    console.log('문서 ID:', doc.id);
    console.log('제목:', doc.title);
    console.log('Content 길이:', doc.content ? doc.content.length : 0);
    
    // content 파싱 테스트
    if (doc.content) {
      try {
        const parsed = JSON.parse(doc.content);
        console.log('passages 개수:', parsed.passages ? parsed.passages.length : 0);
        console.log('\n✅ 이 문서는 개별 지문 분석이 가능합니다!');
      } catch (e) {
        console.log('❌ content 파싱 실패:', e.message);
      }
    }
  } else {
    console.log('❌ 문서를 찾을 수 없습니다.');
  }
  
  db.close();
});