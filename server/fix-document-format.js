const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 문서 형식 수정 시작...\n');

// 모든 문서 조회
db.all('SELECT id, title, content FROM documents', (err, documents) => {
  if (err) {
    console.error('❌ 에러:', err);
    db.close();
    return;
  }
  
  console.log(`총 ${documents.length}개 문서 확인 중...\n`);
  
  let fixedCount = 0;
  let processedCount = 0;
  
  documents.forEach(doc => {
    try {
      const parsed = JSON.parse(doc.content);
      
      // 중첩된 구조인지 확인
      if (parsed.content && typeof parsed.content === 'string') {
        console.log(`🔧 문서 "${doc.title}" (ID: ${doc.id}) 수정 중...`);
        
        // 중첩된 content를 파싱
        try {
          const innerParsed = JSON.parse(parsed.content);
          
          // passages가 있으면 그것만 저장
          const fixedContent = JSON.stringify({
            passages: innerParsed.passages || []
          });
          
          // DB 업데이트
          db.run(
            'UPDATE documents SET content = ? WHERE id = ?',
            [fixedContent, doc.id],
            (updateErr) => {
              if (updateErr) {
                console.error(`❌ 문서 ${doc.id} 업데이트 실패:`, updateErr);
              } else {
                console.log(`✅ 문서 "${doc.title}" 수정 완료!`);
                fixedCount++;
              }
              
              processedCount++;
              if (processedCount === documents.length) {
                console.log(`\n📊 결과: ${fixedCount}/${documents.length}개 문서 수정됨`);
                db.close();
              }
            }
          );
        } catch (innerParseError) {
          // 내부 content가 JSON이 아닌 경우 - 일반 텍스트로 처리
          const passages = parsed.content.split(/\n\n+/).filter(p => p.trim());
          const fixedContent = JSON.stringify({ passages });
          
          db.run(
            'UPDATE documents SET content = ? WHERE id = ?',
            [fixedContent, doc.id],
            (updateErr) => {
              if (updateErr) {
                console.error(`❌ 문서 ${doc.id} 업데이트 실패:`, updateErr);
              } else {
                console.log(`✅ 문서 "${doc.title}" 수정 완료 (텍스트→passages 변환)!`);
                fixedCount++;
              }
              
              processedCount++;
              if (processedCount === documents.length) {
                console.log(`\n📊 결과: ${fixedCount}/${documents.length}개 문서 수정됨`);
                db.close();
              }
            }
          );
        }
      } else if (parsed.passages) {
        // 이미 올바른 형식
        console.log(`✅ 문서 "${doc.title}" (ID: ${doc.id})는 이미 올바른 형식입니다.`);
        processedCount++;
        if (processedCount === documents.length) {
          console.log(`\n📊 결과: ${fixedCount}/${documents.length}개 문서 수정됨`);
          db.close();
        }
      } else {
        // passages가 없는 경우 - 텍스트를 passages로 변환
        console.log(`🔧 문서 "${doc.title}" (ID: ${doc.id}) passages 생성 중...`);
        
        let passages = [];
        if (typeof parsed === 'string') {
          passages = parsed.split(/\n\n+/).filter(p => p.trim());
        } else if (parsed.text) {
          passages = parsed.text.split(/\n\n+/).filter(p => p.trim());
        }
        
        const fixedContent = JSON.stringify({ passages });
        
        db.run(
          'UPDATE documents SET content = ? WHERE id = ?',
          [fixedContent, doc.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`❌ 문서 ${doc.id} 업데이트 실패:`, updateErr);
            } else {
              console.log(`✅ 문서 "${doc.title}" passages 생성 완료!`);
              fixedCount++;
            }
            
            processedCount++;
            if (processedCount === documents.length) {
              console.log(`\n📊 결과: ${fixedCount}/${documents.length}개 문서 수정됨`);
              db.close();
            }
          }
        );
      }
    } catch (parseError) {
      // JSON이 아닌 경우 - 일반 텍스트를 passages로 변환
      console.log(`🔧 문서 "${doc.title}" (ID: ${doc.id}) 텍스트→JSON 변환 중...`);
      
      const passages = doc.content.split(/\n\n+/).filter(p => p.trim());
      const fixedContent = JSON.stringify({ passages });
      
      db.run(
        'UPDATE documents SET content = ? WHERE id = ?',
        [fixedContent, doc.id],
        (updateErr) => {
          if (updateErr) {
            console.error(`❌ 문서 ${doc.id} 업데이트 실패:`, updateErr);
          } else {
            console.log(`✅ 문서 "${doc.title}" JSON 변환 완료!`);
            fixedCount++;
          }
          
          processedCount++;
          if (processedCount === documents.length) {
            console.log(`\n📊 결과: ${fixedCount}/${documents.length}개 문서 수정됨`);
            db.close();
          }
        }
      );
    }
  });
  
  if (documents.length === 0) {
    console.log('문서가 없습니다.');
    db.close();
  }
});