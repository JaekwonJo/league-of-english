/**
 * 간단한 문장삽입 테스트 - 기존 데이터베이스 문서 사용
 */

const database = require('./models/database');
const UltraSimpleProblemService = require('./services/ultraSimpleProblemService');

async function simpleInsertionTest() {
  try {
    console.log('🧪 간단한 문장삽입 테스트 시작...\n');
    
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
        // 기본 레벨 문장삽입 문제 생성
        const problems = await service.getSmartProblems(
          1, // userId
          doc.id, // documentId
          ['insertion'], // types
          1, // count
          { insertionDifficulty: 'basic' }
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
          
          console.log('\n📝 주어진 문장:', problem.givenSentence);
          console.log('\n📋 본문 (빈 공간 포함):', problem.mainText.substring(0, 300) + '...');
          
          console.log('\n🎯 정답:', problem.answer + '번');
          console.log('🔗 객관식 선택지:');
          problem.multipleChoices.forEach(choice => {
            console.log(`  ${choice.symbol} ${choice.value}번`);
          });
          
          // 빈 공간이 올바른 위치에 있는지 확인
          const gapPosition = problem.mainText.indexOf('( __________ )');
          if (gapPosition !== -1) {
            console.log('✅ 빈 공간이 올바르게 표시됨');
          } else {
            console.log('❌ 빈 공간을 찾을 수 없음');
          }
          
          // 주어진 문장이 원문에 있었는지 확인
          const givenSentenceInOriginal = originalText.includes(
            problem.givenSentence.replace('.', '')
          );
          
          if (givenSentenceInOriginal) {
            console.log('✅ 주어진 문장이 원문에서 추출됨');
          } else {
            console.log('⚠️ 주어진 문장과 원문 불일치 (정상일 수 있음)');
          }
          
          console.log('\n📊 메타데이터:', problem.metadata);
          
        } else {
          console.log('❌ 문제 생성 실패');
        }
        
      } catch (error) {
        console.log('❌ 에러:', error.message);
      }
      
      console.log('\n' + '='.repeat(70));
    }
    
    // 고급 레벨도 테스트
    console.log('\n=== 고급 레벨 문장삽입 테스트 ===');
    try {
      const advancedProblems = await service.getSmartProblems(
        1, // userId
        documents[0].id, // documentId
        ['insertion'], // types
        1, // count
        { insertionDifficulty: 'advanced' }
      );
      
      if (advancedProblems.length > 0) {
        const problem = advancedProblems[0];
        console.log('✅ 고급 문제 생성 성공');
        console.log('📝 주어진 문장:', problem.givenSentence.substring(0, 80) + '...');
        console.log('🎯 정답:', problem.answer + '번');
        console.log('📊 선택지 수:', problem.multipleChoices.length);
      }
    } catch (error) {
      console.log('❌ 고급 레벨 에러:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 실행
simpleInsertionTest().then(() => {
  console.log('\n🎉 문장삽입 테스트 완료!');
}).catch(console.error);