/**
 * 순서배열 문제 생성 테스트 - 원문 내용 누락 확인
 */

const UltraSimpleProblemService = require('./services/ultraSimpleProblemService');
const database = require('./models/database');

// 테스트용 샘플 문서 데이터
const sampleDocuments = [
  {
    title: "Sample Text 1",
    content: JSON.stringify({
      passages: [
        "Early Earth had vapor and CO2. Primitive life changed it, releasing oxygen. With land plants, oxygen rose. By 370 million years ago, it neared today's level; life on land spread. Today's atmosphere is both cause and result of life."
      ]
    })
  },
  {
    title: "Sample Text 2", 
    content: JSON.stringify({
      passages: [
        "Textbooks reveal principles quickly. Yet real science wandered many paths, with false clues and revisions. We learn neat laws, not the messy years of exploration. Newton's alchemy failed, but classrooms hide that story."
      ]
    })
  }
];

async function testOrderProblemGeneration() {
  console.log('🧪 순서배열 문제 생성 테스트 시작...\n');
  
  try {
    await database.connect();
    const service = new UltraSimpleProblemService();
    
    for (let i = 0; i < sampleDocuments.length; i++) {
      const doc = sampleDocuments[i];
      console.log(`=== ${doc.title} 테스트 ===`);
      
      // 원문 분석
      const parsedContent = JSON.parse(doc.content);
      const originalText = parsedContent.passages[0];
      console.log('📄 원문:', originalText);
      console.log('📏 원문 길이:', originalText.length);
      
      // 원문에서 문장들 추출 (실제 서비스와 동일한 로직)
      const rawSentences = originalText.split('.');
      const sentences = rawSentences
        .map(s => s.trim())
        .filter(s => s.length > 30)
        .filter(s => /[a-zA-Z]/.test(s))
        .filter(s => !/^[가-힣]/.test(s))
        .map(s => s + '.');
      
      console.log('📝 추출된 문장들:');
      sentences.forEach((sentence, idx) => {
        console.log(`  ${idx + 1}. "${sentence}"`);
      });
      
      // 기본 레벨 (3개 그룹) 테스트
      console.log('\n--- 기본 레벨 (3개 그룹) ---');
      const basicProblems = await service.getSmartProblems(1, i + 1, ['order'], 1, {
        orderDifficulty: 'basic'
      });
      
      if (basicProblems.length > 0) {
        const problem = basicProblems[0];
        console.log('✅ 문제 생성 성공');
        console.log('📝 주어진 문장:', problem.mainText);
        
        // 선택지들 확인
        console.log('📋 선택지들:');
        problem.sentences.forEach(choice => {
          console.log(`  ${choice.label}: "${choice.text}"`);
        });
        
        // 내용 누락 체크
        const allChoicesText = problem.sentences.map(s => s.text).join(' ');
        const fullProblemText = problem.mainText + ' ' + allChoicesText;
        
        console.log('\n🔍 내용 누락 체크:');
        console.log('원문 단어 수:', originalText.split(' ').length);
        console.log('문제 단어 수:', fullProblemText.split(' ').length);
        
        // 원문의 핵심 단어들이 문제에 모두 포함되었는지 확인
        const originalWords = originalText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const problemWords = fullProblemText.toLowerCase().split(/\s+/);
        
        const missingWords = originalWords.filter(word => 
          !problemWords.some(pWord => pWord.includes(word.replace(/[.,;:!?]/g, '')))
        );
        
        if (missingWords.length > 0) {
          console.log('❌ 누락된 단어들:', missingWords);
        } else {
          console.log('✅ 모든 주요 내용이 포함됨');
        }
        
        console.log('🎯 정답:', problem.correctOrder);
        console.log('📊 객관식 정답:', problem.answer + '번');
      } else {
        console.log('❌ 문제 생성 실패');
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 데이터베이스 설정
async function setupTestData() {
  try {
    await database.connect();
    
    // 테스트 문서들 삽입
    for (let i = 0; i < sampleDocuments.length; i++) {
      const doc = sampleDocuments[i];
      await database.run(
        'INSERT OR REPLACE INTO documents (id, title, content, uploaded_by, upload_date, category) VALUES (?, ?, ?, ?, ?, ?)',
        [i + 1, doc.title, doc.content, 1, new Date().toISOString(), 'test']
      );
    }
    
    console.log('✅ 테스트 데이터 설정 완료\n');
  } catch (error) {
    console.error('❌ 테스트 데이터 설정 실패:', error);
  }
}

// 실행
(async () => {
  await setupTestData();
  await testOrderProblemGeneration();
  console.log('🎉 순서배열 테스트 완료!');
})();