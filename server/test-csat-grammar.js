/**
 * CSAT 어법문제 생성기 테스트
 */

const { generateCSATGrammarProblem } = require('./utils/csatGrammarGenerator');

// 샘플 테스트용 지문 (PDF에서 가져온 것)
const testPassage = `One well-known shift took place when the accepted view — that the Earth was the center of the universe-changed to one where we understood that we are only inhabitants on one planet orbiting the Sun. With each person who grasped the solar system view, it became easier for the next person to do so. So it is with the notion that the world revolves around the human economy. This is slowly being replaced by the view that the economy is a part of the larger system of material flows that connect all living things. When this perspective shifts into place, it will be obvious that our economic well-being requires that we account for, and respond to, factors of ecological health. Unfortunately we do not have a century or two make the change. By clarifying the nature of the old and new perspectives, and by identifying actions on which we might cooperate to move the process along, we can help accelerate the shift.`;

async function testCSATGrammar() {
  try {
    console.log('🎯 CSAT 어법문제 생성기 테스트 시작\n');
    
    // 여러 시드로 테스트
    for (let i = 0; i < 3; i++) {
      console.log(`📝 테스트 ${i + 1}:`);
      
      try {
        const problem = generateCSATGrammarProblem(testPassage, {
          seed: Date.now() + i * 1000
        });
        
        console.log(`✅ 생성 성공!`);
        console.log(`📋 문제: ${problem.question}`);
        console.log(`📊 선택지:`);
        problem.choices.forEach((choice, index) => {
          const marker = index === problem.correctAnswer ? ' ← 정답' : '';
          console.log(`  ${choice}${marker}`);
        });
        console.log(`💡 해설: ${problem.explanation}`);
        console.log(`🔍 패턴: ${problem.metadata?.pattern}`);
        console.log('─'.repeat(80));
        
      } catch (err) {
        console.log(`❌ 실패: ${err.message}`);
        console.log('─'.repeat(80));
      }
    }
    
  } catch (error) {
    console.error('전체 테스트 실패:', error);
  }
}

// 테스트 실행
testCSATGrammar();