/**
 * 문장삽입 문제 생성기 테스트
 */

const InsertionProblemGenerator = require('./utils/insertionProblemGenerator');

// 테스트용 영어 지문
const testPassages = [
  {
    content: `Environmental protection has become one of the most pressing concerns of the modern world. The rapid industrialization and urbanization have led to significant environmental degradation. Air pollution, water contamination, and deforestation are just a few examples of the challenges we face today. Governments and organizations worldwide are implementing various policies to address these issues. However, individual actions also play a crucial role in environmental conservation. Simple steps like reducing energy consumption, recycling, and using public transportation can make a significant difference. Education and awareness are essential for creating a sustainable future. We must act now to preserve our planet for future generations.`
  },
  {
    content: `Artificial intelligence is transforming the way we live and work. Machine learning algorithms can process vast amounts of data in seconds. They help doctors diagnose diseases more accurately and assist engineers in designing safer buildings. However, the rapid development of AI also raises concerns about job displacement. Many traditional jobs may become obsolete as automation increases. Society must adapt to these changes by providing retraining programs for workers. The key is to ensure that AI development benefits all of humanity. Collaboration between governments, businesses, and educational institutions is essential for managing this transition effectively.`
  }
];

async function testInsertionProblem() {
  console.log('🧪 문장삽입 문제 생성기 테스트 시작...\n');
  
  const generator = new InsertionProblemGenerator();
  
  try {
    // 1. 기본 레벨 테스트 (5개 위치)
    console.log('=== 기본 레벨 테스트 (5개 위치) ===');
    const basicProblems = generator.generateInsertionProblems(testPassages, 'basic', 1);
    
    if (basicProblems.length > 0) {
      const problem = basicProblems[0];
      console.log('✅ 기본 레벨 문제 생성 성공!');
      console.log('🎯 문제 제목:', problem.instruction);
      console.log('📝 주어진 문장:', problem.givenSentence);
      console.log('📄 본문 (일부):', problem.mainText.substring(0, 200) + '...');
      console.log('🎲 선택지 개수:', problem.multipleChoices.length);
      console.log('✅ 정답:', problem.correctAnswer);
      console.log('📚 난이도:', problem.metadata.difficulty);
      console.log('');
    } else {
      console.log('❌ 기본 레벨 문제 생성 실패');
    }
    
    // 2. 고급 레벨 테스트 (7개 위치)
    console.log('=== 고급 레벨 테스트 (7개 위치) ===');
    const advancedProblems = generator.generateInsertionProblems(testPassages, 'advanced', 1);
    
    if (advancedProblems.length > 0) {
      const problem = advancedProblems[0];
      console.log('✅ 고급 레벨 문제 생성 성공!');
      console.log('🎯 문제 제목:', problem.instruction);
      console.log('📝 주어진 문장:', problem.givenSentence);
      console.log('📄 본문 (일부):', problem.mainText.substring(0, 200) + '...');
      console.log('🎲 선택지 개수:', problem.multipleChoices.length);
      console.log('✅ 정답:', problem.correctAnswer);
      console.log('📚 난이도:', problem.metadata.difficulty);
      console.log('');
    } else {
      console.log('❌ 고급 레벨 문제 생성 실패');
    }
    
    // 3. 여러 문제 생성 테스트
    console.log('=== 다중 문제 생성 테스트 (기본 3개) ===');
    const multipleProblems = generator.generateInsertionProblems(testPassages, 'basic', 3);
    console.log(`✅ ${multipleProblems.length}개 문제 생성 완료`);
    
    multipleProblems.forEach((problem, idx) => {
      console.log(`📝 문제 ${idx + 1}: 정답 위치 ${problem.correctAnswer}, 선택지 ${problem.multipleChoices.length}개`);
    });
    
  } catch (error) {
    console.error('🚨 테스트 중 오류 발생:', error);
  }
  
  console.log('\n🧪 테스트 완료!');
}

// 테스트 실행
if (require.main === module) {
  testInsertionProblem();
}

module.exports = { testInsertionProblem };