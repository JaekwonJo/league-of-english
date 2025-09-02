const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 데이터베이스 상태 확인 중...\n');

// 사용자 수 확인
db.all("SELECT COUNT(*) as count FROM users", (err, rows) => {
  if (err) {
    console.error('❌ users 테이블 오류:', err.message);
  } else {
    console.log(`👥 등록된 사용자 수: ${rows[0].count}명`);
  }
});

// 문서 수 확인  
db.all("SELECT COUNT(*) as count FROM documents", (err, rows) => {
  if (err) {
    console.error('❌ documents 테이블 오류:', err.message);
  } else {
    console.log(`📄 업로드된 문서 수: ${rows[0].count}개`);
    
    // 문서 목록 확인
    if (rows[0].count > 0) {
      db.all("SELECT id, title, created_at FROM documents ORDER BY created_at DESC LIMIT 5", (err, docs) => {
        if (!err) {
          console.log('\n📚 최근 문서 목록:');
          docs.forEach(doc => {
            console.log(`  ${doc.id}. ${doc.title} (${doc.created_at})`);
          });
        }
      });
    } else {
      console.log('⚠️  업로드된 문서가 없습니다.');
    }
  }
});

// 문제 수 확인
db.all("SELECT COUNT(*) as count FROM problems", (err, rows) => {
  if (err) {
    console.error('❌ problems 테이블 오류:', err.message);
  } else {
    console.log(`🧩 생성된 문제 수: ${rows[0].count}개`);
  }
});

// 테이블 존재 여부 확인
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('❌ 테이블 목록 조회 오류:', err.message);
  } else {
    console.log('\n🗃️ 데이터베이스 테이블:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
  }
  
  // 데이터베이스 연결 종료
  db.close((err) => {
    if (err) {
      console.error('❌ DB 연결 종료 오류:', err.message);
    } else {
      console.log('\n✅ 데이터베이스 상태 확인 완료');
    }
  });
});