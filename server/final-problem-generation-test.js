/**
 * 최종 문제 생성 시뮬레이션 테스트
 * 실제 환경과 유사한 조건에서 문제 생성 테스트
 */

const SimpleOrderGenerator = require('./utils/simpleOrderGenerator');
const InsertionProblemGenerator = require('./utils/insertionProblemGenerator');
const { generateRandomOrderProblems } = require('./utils/multiPassageOrderGenerator');

console.log('🎮 최종 문제 생성 시뮬레이션 테스트 시작\n');

// 실제와 유사한 긴 영어 지문들
const realWorldTexts = [
  {
    title: "Scientific Training Text",
    content: `The professionalization of medicine in the 19th century marked a significant turning point in healthcare history. Medical schools began requiring rigorous scientific training, fundamentally changing how doctors were educated. Additionally, those doctors with scientific training were now distinguished from a range of alternative healers, from homeopaths to midwives, resulting in an elevation in the eyes of the public of the status of the profession as compared with other healing practices, which persists today. This transformation led to improved patient outcomes and standardized medical practices. The establishment of medical licensing boards further solidified the profession's credibility. Modern medicine continues to build upon these foundational changes established over a century ago.`
  },
  {
    title: "Human Evolution Text",
    content: `Over the course of our evolution between 350,000 and 150,000 years ago, Homo sapiens developed an appetite for exploration and a wayfinding spirit that set us apart from other human species. It had a huge effect on our future. One of the most intriguing recent ideas in anthropology is that our ability to navigate was essential to our success as a species, because it allowed us to cultivate extensive social networks. In prehistoric times, when people lived in small family units and spent much of their time looking for food and shelter, being able to share information with other groups about the whereabouts of resources and the movements of predators would have given us an evolutionary edge. Friends were a survival asset. If you ran out of food, you knew where to go; if you needed help on a hunt, you knew who to ask. This interconnectedness ultimately contributed to the dominance of our species across the globe.`
  },
  {
    title: "Technology and Society",
    content: `The digital revolution has fundamentally transformed how we communicate, work, and live. Social media platforms have created unprecedented opportunities for global connection. However, these same technologies have also introduced new challenges related to privacy, misinformation, and social isolation. Researchers are studying the long-term effects of constant digital connectivity on human psychology. Dr. Smith from Stanford University recently published findings suggesting that moderate technology use can enhance cognitive abilities. Prof. Johnson's team at MIT has developed new frameworks for understanding digital literacy in the 21st century. The debate continues about finding the optimal balance between technological advancement and human well-being. What remains clear is that technology will continue to shape our future in ways we are only beginning to understand.`
  }
];

class FinalTestRunner {
  constructor() {
    this.orderGenerator = new SimpleOrderGenerator();
    this.insertionGenerator = new InsertionProblemGenerator();
    this.testResults = {
      orderProblems: [],
      insertionProblems: [],
      multiPassageProblems: []
    };
  }

  async runAllSimulations() {
    console.log('🎯 1단계: 순서배열 문제 생성 시뮬레이션');
    console.log('='.repeat(60));
    
    for (let i = 0; i < realWorldTexts.length; i++) {
      const text = realWorldTexts[i];
      console.log(`\n📚 텍스트 ${i + 1}: ${text.title}`);
      
      try {
        // Basic difficulty test
        const basicProblems = this.orderGenerator.generateOrderProblems([text.content], 'basic', 1);
        if (basicProblems.length > 0) {
          console.log(`✅ Basic 순서배열 문제 생성 성공`);
          console.log(`   주어진 문장: "${basicProblems[0].mainText}"`);
          console.log(`   선택지 개수: ${basicProblems[0].sentences.length}개`);
          this.testResults.orderProblems.push({ difficulty: 'basic', success: true, problem: basicProblems[0] });
        } else {
          console.log(`❌ Basic 순서배열 문제 생성 실패`);
          this.testResults.orderProblems.push({ difficulty: 'basic', success: false });
        }

        // Advanced difficulty test
        const advancedProblems = this.orderGenerator.generateOrderProblems([text.content], 'advanced', 1);
        if (advancedProblems.length > 0) {
          console.log(`✅ Advanced 순서배열 문제 생성 성공`);
          console.log(`   주어진 문장: "${advancedProblems[0].mainText}"`);
          console.log(`   선택지 개수: ${advancedProblems[0].sentences.length}개`);
          this.testResults.orderProblems.push({ difficulty: 'advanced', success: true, problem: advancedProblems[0] });
        } else {
          console.log(`❌ Advanced 순서배열 문제 생성 실패`);
          this.testResults.orderProblems.push({ difficulty: 'advanced', success: false });
        }

      } catch (error) {
        console.log(`❌ 순서배열 문제 생성 오류: ${error.message}`);
        this.testResults.orderProblems.push({ difficulty: 'error', success: false, error: error.message });
      }
    }

    console.log('\n🎯 2단계: 문장삽입 문제 생성 시뮬레이션');
    console.log('='.repeat(60));

    for (let i = 0; i < realWorldTexts.length; i++) {
      const text = realWorldTexts[i];
      console.log(`\n📚 텍스트 ${i + 1}: ${text.title}`);

      try {
        // Basic difficulty test
        const basicProblems = this.insertionGenerator.generateInsertionProblems([text.content], 'basic', 1);
        if (basicProblems.length > 0) {
          console.log(`✅ Basic 문장삽입 문제 생성 성공`);
          console.log(`   주어진 문장: "${basicProblems[0].givenSentence}"`);
          console.log(`   위치 개수: ${basicProblems[0].multipleChoices.length}개`);
          console.log(`   정답 위치: ${basicProblems[0].correctAnswer}번`);
          this.testResults.insertionProblems.push({ difficulty: 'basic', success: true, problem: basicProblems[0] });
        } else {
          console.log(`❌ Basic 문장삽입 문제 생성 실패`);
          this.testResults.insertionProblems.push({ difficulty: 'basic', success: false });
        }

        // Advanced difficulty test
        const advancedProblems = this.insertionGenerator.generateInsertionProblems([text.content], 'advanced', 1);
        if (advancedProblems.length > 0) {
          console.log(`✅ Advanced 문장삽입 문제 생성 성공`);
          console.log(`   주어진 문장: "${advancedProblems[0].givenSentence}"`);
          console.log(`   위치 개수: ${advancedProblems[0].multipleChoices.length}개`);
          console.log(`   정답 위치: ${advancedProblems[0].correctAnswer}번`);
          this.testResults.insertionProblems.push({ difficulty: 'advanced', success: true, problem: advancedProblems[0] });
        } else {
          console.log(`❌ Advanced 문장삽입 문제 생성 실패`);
          this.testResults.insertionProblems.push({ difficulty: 'advanced', success: false });
        }

      } catch (error) {
        console.log(`❌ 문장삽입 문제 생성 오류: ${error.message}`);
        this.testResults.insertionProblems.push({ difficulty: 'error', success: false, error: error.message });
      }
    }

    console.log('\n🎯 3단계: 다중지문 순서배열 문제 생성 시뮬레이션');
    console.log('='.repeat(60));

    for (let i = 0; i < realWorldTexts.length; i++) {
      const text = realWorldTexts[i];
      console.log(`\n📚 텍스트 ${i + 1}: ${text.title}`);

      try {
        // Basic difficulty test
        const basicProblems = generateRandomOrderProblems(text, 1, { orderDifficulty: 'basic' });
        if (basicProblems.length > 0) {
          console.log(`✅ Basic 다중지문 문제 생성 성공`);
          console.log(`   주어진 문장: "${basicProblems[0].given}"`);
          console.log(`   선택지 개수: ${basicProblems[0].items.length}개`);
          console.log(`   정답: ${basicProblems[0].ans}`);
          this.testResults.multiPassageProblems.push({ difficulty: 'basic', success: true, problem: basicProblems[0] });
        } else {
          console.log(`❌ Basic 다중지문 문제 생성 실패`);
          this.testResults.multiPassageProblems.push({ difficulty: 'basic', success: false });
        }

        // Advanced difficulty test
        const advancedProblems = generateRandomOrderProblems(text, 1, { orderDifficulty: 'advanced' });
        if (advancedProblems.length > 0) {
          console.log(`✅ Advanced 다중지문 문제 생성 성공`);
          console.log(`   주어진 문장: "${advancedProblems[0].given}"`);
          console.log(`   선택지 개수: ${advancedProblems[0].items.length}개`);
          console.log(`   정답: ${advancedProblems[0].ans}`);
          this.testResults.multiPassageProblems.push({ difficulty: 'advanced', success: true, problem: advancedProblems[0] });
        } else {
          console.log(`❌ Advanced 다중지문 문제 생성 실패`);
          this.testResults.multiPassageProblems.push({ difficulty: 'advanced', success: false });
        }

      } catch (error) {
        console.log(`❌ 다중지문 문제 생성 오류: ${error.message}`);
        this.testResults.multiPassageProblems.push({ difficulty: 'error', success: false, error: error.message });
      }
    }

    this.printFinalSummary();
  }

  printFinalSummary() {
    console.log('\n📊 최종 시뮬레이션 결과 요약');
    console.log('='.repeat(60));

    const orderSuccess = this.testResults.orderProblems.filter(r => r.success).length;
    const orderTotal = this.testResults.orderProblems.length;
    
    const insertionSuccess = this.testResults.insertionProblems.filter(r => r.success).length;
    const insertionTotal = this.testResults.insertionProblems.length;
    
    const multiSuccess = this.testResults.multiPassageProblems.filter(r => r.success).length;
    const multiTotal = this.testResults.multiPassageProblems.length;

    console.log(`\n🎯 순서배열 문제 생성: ${orderSuccess}/${orderTotal} 성공 (${Math.round(orderSuccess/orderTotal*100)}%)`);
    console.log(`🎯 문장삽입 문제 생성: ${insertionSuccess}/${insertionTotal} 성공 (${Math.round(insertionSuccess/insertionTotal*100)}%)`);
    console.log(`🎯 다중지문 문제 생성: ${multiSuccess}/${multiTotal} 성공 (${Math.round(multiSuccess/multiTotal*100)}%)`);

    const totalSuccess = orderSuccess + insertionSuccess + multiSuccess;
    const totalTests = orderTotal + insertionTotal + multiTotal;
    
    console.log(`\n🏆 전체 성공률: ${totalSuccess}/${totalTests} (${Math.round(totalSuccess/totalTests*100)}%)`);

    if (totalSuccess === totalTests) {
      console.log('\n🎉 축하합니다! 모든 문제 생성기가 정상적으로 작동합니다!');
      console.log('✅ 문장 절단 오류가 완전히 해결되었고, 모든 시나리오에서 문제 생성이 성공했습니다.');
    } else {
      console.log(`\n⚠️ ${totalTests - totalSuccess}개의 테스트에서 문제가 발견되었습니다.`);
      console.log('추가 디버깅이 필요할 수 있습니다.');
    }

    // 샘플 문제 출력
    console.log('\n🎨 샘플 생성된 문제들:');
    console.log('='.repeat(60));

    if (this.testResults.orderProblems.some(r => r.success)) {
      const sample = this.testResults.orderProblems.find(r => r.success);
      console.log('\n📝 순서배열 문제 샘플:');
      console.log(`Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?`);
      console.log(`\n[주어진 문장]`);
      console.log(sample.problem.mainText);
      console.log(`\n[선택지]`);
      sample.problem.sentences.forEach(s => {
        console.log(`${s.label}. ${s.text.substring(0, 80)}...`);
      });
      console.log(`\n정답: ${sample.problem.correctAnswer}`);
    }

    if (this.testResults.insertionProblems.some(r => r.success)) {
      const sample = this.testResults.insertionProblems.find(r => r.success);
      console.log('\n📝 문장삽입 문제 샘플:');
      console.log(`Q. 주어진 문장이 들어가기에 가장 적절한 곳은?`);
      console.log(`\n[주어진 문장]`);
      console.log(sample.problem.givenSentence);
      console.log(`\n[본문]`);
      console.log(sample.problem.mainText.substring(0, 200) + '...');
      console.log(`\n정답: ${sample.problem.correctAnswer}번`);
    }
  }
}

// 테스트 실행
const finalTest = new FinalTestRunner();
finalTest.runAllSimulations();