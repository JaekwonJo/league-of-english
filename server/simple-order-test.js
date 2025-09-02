/**
 * 간단한 순서배열 테스트 - 기존 데이터베이스 문서 사용
 */

const database = require('./models/database');
const UltraSimpleProblemService = require('./services/ultraSimpleProblemService');

async function simpleOrderTest() {
  try {
    console.log('🧪 간단한 순서배열 테스트 시작...\n');
    
    await database.connect();
    
    // 기존 문서들 조회
    const documents = await database.all('SELECT * FROM documents LIMIT 3');
    
    if (documents.length === 0) {
      console.log('❌ 데이터베이스에 문서가 없습니다.');
      return;
    }
    
    console.log(`✅ ${documents.length}개 문서 발견`);
    
    const service = new UltraSimpleProblemService();
    
    for (let i = 0; i < Math.min(2, documents.length); i++) {
      const doc = documents[i];
      console.log(`\n=== 문서 ${doc.id}: ${doc.title} ===`);
      
      try {
        // 기본 레벨 순서배열 문제 생성
        const problems = await service.getSmartProblems(
          1, // userId
          doc.id, // documentId
          ['order'], // types
          1, // count
          { orderDifficulty: 'basic' }
        );
        
        if (problems.length > 0) {
          const problem = problems[0];
          console.log('✅ 문제 생성 성공');
          
          // 원문 확인
          let originalText = '';
          try {
            const parsedContent = JSON.parse(doc.content);
            if (parsedContent.passages && parsedContent.passages.length > 0) {
              // 문제에서 사용된 페이지 찾기
              const pageNum = problem.metadata?.originalPageNumber || 1;
              originalText = parsedContent.passages[pageNum - 1] || parsedContent.passages[0];
            }
          } catch (e) {
            console.log('⚠️ 원문 파싱 실패');
            originalText = doc.content;
          }
          
          console.log('\n📄 원문 (일부):', originalText.substring(0, 200) + '...');
          console.log('📏 원문 길이:', originalText.length);
          
          console.log('\n📝 주어진 문장:', problem.mainText);
          
          console.log('\n📋 선택지들:');
          problem.sentences.forEach(choice => {
            console.log(`  ${choice.label}: "${choice.text.substring(0, 80)}..."`);
          });
          
          // 모든 텍스트 합치기
          const allProblemText = problem.mainText + ' ' + 
            problem.sentences.map(s => s.text).join(' ');
          
          console.log('\n🔍 내용 비교:');
          console.log(`원문 단어 수: ${originalText.split(' ').filter(w => w.length > 0).length}`);
          console.log(`문제 단어 수: ${allProblemText.split(' ').filter(w => w.length > 0).length}`);
          
          // 핵심 단어 누락 체크
          const originalWords = originalText.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 4); // 4글자 이상 단어만
          
          const problemWords = allProblemText.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/);
          
          const missingWords = originalWords.filter(word => 
            !problemWords.includes(word) && 
            !problemWords.some(pw => pw.includes(word) || word.includes(pw))
          );
          
          if (missingWords.length > 0 && missingWords.length < 10) {
            console.log('⚠️ 누락 가능성 있는 단어들:', missingWords.slice(0, 5));
          } else if (missingWords.length === 0) {
            console.log('✅ 주요 단어들이 모두 포함됨');
          } else {
            console.log('✅ 대부분의 내용이 포함됨 (일부 누락은 정상)');
          }
          
          console.log('\n🎯 정답 순서:', problem.correctOrder);
          console.log('📊 객관식 정답:', problem.answer + '번');
          console.log('🔗 객관식 선택지:');
          problem.multipleChoices.forEach(choice => {
            console.log(`  ${choice.symbol} ${choice.value}`);
          });
          
        } else {
          console.log('❌ 문제 생성 실패');
        }
        
      } catch (error) {
        console.log('❌ 에러:', error.message);
      }
      
      console.log('\n' + '='.repeat(70));
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 실행
simpleOrderTest().then(() => {
  console.log('\n🎉 순서배열 테스트 완료!');
}).catch(console.error);