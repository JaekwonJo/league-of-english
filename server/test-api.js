/**
 * API 테스트 스크립트 - 문장삽입 문제 생성 테스트
 */

const ProblemService = require('./services/problemService');
const database = require('./models/database');

async function testInsertionAPI() {
  try {
    console.log('🧪 API 테스트: 문장삽입 문제 생성');
    
    // 데이터베이스 연결
    await database.connect();
    
    // 테스트용 문서 데이터
    const testDocument = {
      title: 'Test Environmental Document',
      content: `Environmental protection has become one of the most pressing concerns of the modern world. The rapid industrialization and urbanization have led to significant environmental degradation. Air pollution, water contamination, and deforestation are just a few examples of the challenges we face today. 

Governments and organizations worldwide are implementing various policies to address these issues. However, individual actions also play a crucial role in environmental conservation. Simple steps like reducing energy consumption, recycling, and using public transportation can make a significant difference. 

Education and awareness are essential for creating a sustainable future. We must act now to preserve our planet for future generations. Climate change is accelerating, and the window for effective action is narrowing rapidly.`,
      parsedContent: {
        passages: [
          `Environmental protection has become one of the most pressing concerns of the modern world. The rapid industrialization and urbanization have led to significant environmental degradation. Air pollution, water contamination, and deforestation are just a few examples of the challenges we face today.`,
          `Governments and organizations worldwide are implementing various policies to address these issues. However, individual actions also play a crucial role in environmental conservation. Simple steps like reducing energy consumption, recycling, and using public transportation can make a significant difference.`,
          `Education and awareness are essential for creating a sustainable future. We must act now to preserve our planet for future generations. Climate change is accelerating, and the window for effective action is narrowing rapidly.`
        ]
      }
    };

    // 1. 기본 레벨 테스트
    console.log('\n=== 기본 레벨 문장삽입 테스트 ===');
    const basicOptions = { insertionDifficulty: 'basic' };
    const basicProblem = await ProblemService.generateProblems(
      testDocument, 
      'insertion', 
      1, 
      1, // documentId 
      basicOptions
    );
    
    if (basicProblem.length > 0) {
      console.log('✅ 기본 레벨 성공!');
      console.log('📝 주어진 문장:', basicProblem[0].givenSentence);
      console.log('🎲 선택지 수:', basicProblem[0].multipleChoices.length);
      console.log('✅ 정답:', basicProblem[0].answer);
    } else {
      console.log('❌ 기본 레벨 실패');
    }

    // 2. 고급 레벨 테스트
    console.log('\n=== 고급 레벨 문장삽입 테스트 ===');
    const advancedOptions = { insertionDifficulty: 'advanced' };
    const advancedProblem = await ProblemService.generateProblems(
      testDocument, 
      'insertion', 
      1, 
      1, // documentId 
      advancedOptions
    );
    
    if (advancedProblem.length > 0) {
      console.log('✅ 고급 레벨 성공!');
      console.log('📝 주어진 문장:', advancedProblem[0].givenSentence);
      console.log('🎲 선택지 수:', advancedProblem[0].multipleChoices.length);
      console.log('✅ 정답:', advancedProblem[0].answer);
    } else {
      console.log('❌ 고급 레벨 실패');
    }

    console.log('\n🎉 API 테스트 완료!');

  } catch (error) {
    console.error('🚨 테스트 중 오류:', error);
  } finally {
    process.exit(0);
  }
}

// 테스트 실행
if (require.main === module) {
  testInsertionAPI();
}

module.exports = { testInsertionAPI };