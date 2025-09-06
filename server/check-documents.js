/**
 * 데이터베이스의 문서들을 확인하는 스크립트
 */

const database = require('./models/database');

async function checkDocuments() {
  try {
    console.log('📋 데이터베이스 문서 목록:');
    
    const documents = await database.all(
      'SELECT id, title, category, length(content) as content_length FROM documents ORDER BY id DESC LIMIT 10'
    );
    
    if (documents.length === 0) {
      console.log('❌ 문서가 없습니다.');
      return;
    }
    
    documents.forEach(doc => {
      console.log(`📄 ID: ${doc.id}, 제목: ${doc.title}, 카테고리: ${doc.category}, 길이: ${doc.content_length}자`);
    });
    
    // 최신 문서 하나의 내용 샘플 보기
    if (documents.length > 0) {
      const latestDoc = await database.get('SELECT * FROM documents WHERE id = ?', [documents[0].id]);
      console.log('\n🔍 최신 문서 내용 샘플:');
      console.log(`제목: ${latestDoc.title}`);
      
      try {
        const parsedContent = JSON.parse(latestDoc.content);
        console.log(`지문 개수: ${parsedContent.passages?.length || 0}`);
        if (parsedContent.passages && parsedContent.passages.length > 0) {
          console.log(`첫 번째 지문 (처음 200자): ${parsedContent.passages[0].substring(0, 200)}...`);
        }
      } catch (e) {
        console.log('원문 (처음 200자):', latestDoc.content.substring(0, 200));
      }
    }
    
  } catch (error) {
    console.error('문서 조회 실패:', error);
  }
}

checkDocuments();