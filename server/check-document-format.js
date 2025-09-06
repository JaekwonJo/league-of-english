const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 문서 형식 확인 중...\n');

db.get('SELECT id, title, content FROM documents WHERE id = 40', (err, doc) => {
  if (err) {
    console.error('❌ 에러:', err);
    db.close();
    return;
  }
  
  if (!doc) {
    console.log('❌ 문서를 찾을 수 없습니다.');
    db.close();
    return;
  }
  
  console.log('📄 문서 정보:');
  console.log('ID:', doc.id);
  console.log('제목:', doc.title);
  console.log('\n📝 현재 저장된 형식 (처음 500자):');
  console.log(doc.content.substring(0, 500));
  
  try {
    const parsed = JSON.parse(doc.content);
    console.log('\n✅ JSON 파싱 성공!');
    console.log('passages 존재 여부:', parsed.passages ? '있음' : '없음');
    if (parsed.passages) {
      console.log('passages 개수:', parsed.passages.length);
      console.log('\n첫 번째 passage (처음 200자):');
      console.log(parsed.passages[0].substring(0, 200));
    }
  } catch (e) {
    console.log('\n❌ JSON 파싱 실패:', e.message);
    console.log('\n⚠️ 문서가 JSON 형식이 아닙니다.');
  }
  
  console.log('\n==============================================');
  console.log('✅ 올바른 문서 형식 예시:');
  console.log('==============================================\n');
  
  const exampleFormat = {
    passages: [
      "첫 번째 영어 지문입니다. This is the first passage.",
      "두 번째 영어 지문입니다. This is the second passage.",
      "세 번째 영어 지문입니다. This is the third passage."
    ]
  };
  
  console.log(JSON.stringify(exampleFormat, null, 2));
  
  console.log('\n📌 업로드 시 주의사항:');
  console.log('1. TXT 파일: 지문을 빈 줄로 구분하면 자동으로 passages 배열로 변환됩니다.');
  console.log('2. PDF 파일: 영어 텍스트만 추출되며, 빈 줄로 구분된 지문들이 passages 배열로 변환됩니다.');
  console.log('3. 각 지문은 3문장 이상이어야 문제 생성이 가능합니다.');
  
  db.close();
});