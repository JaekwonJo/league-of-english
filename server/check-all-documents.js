const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 모든 문서 확인 중...\n');

db.all('SELECT id, title, type, created_by, created_at FROM documents ORDER BY id DESC', (err, docs) => {
  if (err) {
    console.error('❌ 에러:', err);
    db.close();
    return;
  }
  
  console.log(`총 ${docs.length}개 문서:\n`);
  
  docs.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log(`제목: ${doc.title}`);
    console.log(`타입: ${doc.type || 'N/A'}`);
    console.log(`생성자: ${doc.created_by || 'N/A'}`);
    console.log(`생성일: ${doc.created_at}`);
    console.log('---');
  });
  
  // 올림포스 문서 상세 확인
  db.get('SELECT * FROM documents WHERE id = 41', (err, doc) => {
    if (doc) {
      console.log('\n📄 올림포스 문서 (ID: 41) 상세:');
      console.log('제목:', doc.title);
      console.log('생성자 ID:', doc.created_by);
      console.log('Content 길이:', doc.content ? doc.content.length : 0);
      
      // content 형식 확인
      try {
        const parsed = JSON.parse(doc.content);
        console.log('passages 개수:', parsed.passages ? parsed.passages.length : 0);
      } catch (e) {
        console.log('JSON 파싱 실패');
      }
    } else {
      console.log('\n❌ ID 41 문서를 찾을 수 없습니다.');
    }
    
    db.close();
  });
});