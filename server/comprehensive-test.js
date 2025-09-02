/**
 * 완전한 문장 절단 수정 테스트 스위트
 * 다양한 시나리오와 엣지 케이스를 포함한 포괄적 테스트
 */

const SimpleOrderGenerator = require('./utils/simpleOrderGenerator');
const InsertionProblemGenerator = require('./utils/insertionProblemGenerator');
const { generateRandomOrderProblems } = require('./utils/multiPassageOrderGenerator');

console.log('🔬 포괄적 문장 절단 수정 테스트 시작\n');

// 테스트 데이터 모음
const testCases = {
  // 원본 문제가 있었던 케이스들
  originalProblems: [
    {
      name: "today 절단 케이스",
      text: `Additionally, those doctors with scientific training were now distinguished from a range of alternative healers, from homeopaths to midwives, resulting in an elevation in the eyes of the public of the status of the profession as compared with other healing practices, which persists today.`,
      expectedKeywords: ["today"]
    },
    {
      name: "Friends survival asset 누락 케이스", 
      text: `Over the course of our evolution between 350,000 and 150,000 years ago, Homo sapiens developed an appetite for exploration and a wayfinding spirit that set us apart from other human species. It had a huge effect on our future. One of the most intriguing recent ideas in anthropology is that our ability to navigate was essential to our success as a species, because it allowed us to cultivate extensive social networks. In prehistoric times, when people lived in small family units and spent much of their time looking for food and shelter, being able to share information with other groups about the whereabouts of resources and the movements of predators would have given us an evolutionary edge. Friends were a survival asset. If you ran out of food, you knew where to go; if you needed help on a hunt, you knew who to ask.`,
      expectedKeywords: ["Friends were a survival asset", "today", "go", "ask"]
    }
  ],

  // 다양한 문장부호 패턴
  punctuationVariations: [
    {
      name: "느낌표 혼합",
      text: `What an amazing discovery this was! Scientists couldn't believe their eyes. The results were unprecedented! How could this be possible? It changed everything we knew about the subject.`,
      expectedKeywords: ["amazing", "unprecedented", "everything"]
    },
    {
      name: "물음표 혼합",
      text: `Why do we dream? Scientists have been asking this question for centuries. What happens in our brains during sleep? Recent research suggests several theories. Could dreams be our mind's way of processing memories?`,
      expectedKeywords: ["dream", "centuries", "theories", "memories"]
    },
    {
      name: "복합 문장부호",
      text: `"Really?!" she exclaimed. "I can't believe it..." The news was shocking. What would happen next? Nobody knew for certain!`,
      expectedKeywords: ["exclaimed", "shocking", "certain"]
    }
  ],

  // 긴 문장 케이스
  longSentences: [
    {
      name: "매우 긴 단일 문장",
      text: `This extraordinarily complex and multifaceted phenomenon, which has been studied extensively by researchers from various disciplines including psychology, neuroscience, cognitive science, and behavioral economics, represents one of the most fascinating aspects of human cognition and decision-making processes that we encounter in our daily lives.`,
      expectedKeywords: ["extraordinarily", "phenomenon", "daily lives"]
    },
    {
      name: "긴 문장들의 조합",
      text: `The Industrial Revolution, which began in the late 18th century and continued through the 19th century, fundamentally transformed the way people lived and worked. Manufacturing processes that had once been done by hand were now mechanized, leading to unprecedented productivity increases. This transformation had profound social, economic, and environmental consequences that continue to shape our world today.`,
      expectedKeywords: ["Industrial Revolution", "mechanized", "today"]
    }
  ],

  // 특수 케이스들
  edgeCases: [
    {
      name: "숫자와 약어 포함",
      text: `Dr. Smith arrived at 3:30 p.m. yesterday. The meeting with Prof. Johnson was scheduled for 4:00 p.m. However, Mr. Brown from the U.S.A. was running late. They discussed the Q1 results extensively.`,
      expectedKeywords: ["Dr. Smith", "Prof. Johnson", "U.S.A.", "extensively"]
    },
    {
      name: "인용문 포함",
      text: `"The future belongs to those who believe in the beauty of their dreams," said Eleanor Roosevelt. This quote has inspired millions of people worldwide. "Success is not final, failure is not fatal," Churchill once remarked. These words continue to motivate us today.`,
      expectedKeywords: ["Eleanor Roosevelt", "Churchill", "today"]
    },
    {
      name: "짧은 문장들",
      text: `He ran. She followed. They stopped. The end was near. Victory was theirs.`,
      expectedKeywords: ["ran", "followed", "Victory"]
    }
  ]
};

// 테스트 실행 함수들
class ComprehensiveTestRunner {
  constructor() {
    this.orderGenerator = new SimpleOrderGenerator();
    this.insertionGenerator = new InsertionProblemGenerator();
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = [];
  }

  runTest(testName, testFunction) {
    this.totalTests++;
    console.log(`🧪 테스트: ${testName}`);
    
    try {
      const result = testFunction();
      if (result.success) {
        this.passedTests++;
        console.log(`✅ 통과: ${result.message}`);
      } else {
        this.failedTests.push({ name: testName, reason: result.message });
        console.log(`❌ 실패: ${result.message}`);
      }
    } catch (error) {
      this.failedTests.push({ name: testName, reason: error.message });
      console.log(`❌ 오류: ${error.message}`);
    }
    console.log('');
  }

  // 키워드 보존 테스트
  testKeywordPreservation(testCase) {
    const sentences = this.orderGenerator.splitIntoSentences(testCase.text);
    const fullText = sentences.join(' ');
    
    const missingKeywords = testCase.expectedKeywords.filter(keyword => 
      !fullText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (missingKeywords.length > 0) {
      return {
        success: false,
        message: `누락된 키워드: ${missingKeywords.join(', ')}`
      };
    }
    
    return {
      success: true,
      message: `모든 키워드 보존됨 (${sentences.length}개 문장)`
    };
  }

  // 문장 개수 보존 테스트
  testSentenceCount(testCase) {
    const originalSentenceCount = (testCase.text.match(/[.!?]/g) || []).length;
    const sentences = this.orderGenerator.splitIntoSentences(testCase.text);
    
    // 허용 오차 범위 (±1개)
    const tolerance = 1;
    const difference = Math.abs(originalSentenceCount - sentences.length);
    
    if (difference > tolerance) {
      return {
        success: false,
        message: `문장 개수 불일치: 원본 ${originalSentenceCount}개 → 분리 ${sentences.length}개 (차이: ${difference})`
      };
    }
    
    return {
      success: true,
      message: `문장 개수 보존: ${sentences.length}개 (원본: ${originalSentenceCount}개)`
    };
  }

  // 문장 무결성 테스트
  testSentenceIntegrity(testCase) {
    const sentences = this.orderGenerator.splitIntoSentences(testCase.text);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // 각 문장이 대문자로 시작하는지 확인
      if (!/^[A-Z"]/.test(sentence)) {
        return {
          success: false,
          message: `문장 ${i+1}이 대문자로 시작하지 않음: "${sentence.substring(0, 30)}..."`
        };
      }
      
      // 각 문장이 적절한 문장부호로 끝나는지 확인
      if (!/[.!?"]$/.test(sentence)) {
        return {
          success: false,
          message: `문장 ${i+1}이 문장부호로 끝나지 않음: "${sentence.substring(sentence.length-30)}"`
        };
      }
      
      // 너무 짧은 문장 확인 (의미있는 내용인지)
      if (sentence.replace(/[^a-zA-Z]/g, '').length < 5) {
        return {
          success: false,
          message: `문장 ${i+1}이 너무 짧음: "${sentence}"`
        };
      }
    }
    
    return {
      success: true,
      message: `모든 문장이 올바른 형태 (${sentences.length}개)`
    };
  }

  // 문장 삽입 생성기 테스트
  testInsertionGenerator(testCase) {
    const extractedSentences = this.insertionGenerator.extractEnglishSentences(testCase.text);
    
    if (extractedSentences.length < 3) {
      return {
        success: false,
        message: `추출된 문장이 너무 적음: ${extractedSentences.length}개 (최소 3개 필요)`
      };
    }
    
    const missingKeywords = testCase.expectedKeywords.filter(keyword => 
      !extractedSentences.some(s => s.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    if (missingKeywords.length > 0) {
      return {
        success: false,
        message: `삽입 생성기에서 누락된 키워드: ${missingKeywords.join(', ')}`
      };
    }
    
    return {
      success: true,
      message: `문장 삽입 생성기 정상 작동 (${extractedSentences.length}개 문장)`
    };
  }

  // 다중 지문 생성기 테스트
  testMultiPassageGenerator(testCase) {
    const testDocument = {
      title: `Test: ${testCase.name}`,
      content: testCase.text
    };
    
    try {
      const problems = generateRandomOrderProblems(testDocument, 1, { orderDifficulty: 'basic' });
      
      if (problems.length === 0) {
        return {
          success: false,
          message: '문제 생성 실패'
        };
      }
      
      const problem = problems[0];
      const allContent = problem.given + ' ' + problem.items.map(item => item.x).join(' ');
      
      // 중요 키워드들이 보존되었는지 확인
      const importantKeywords = testCase.expectedKeywords.filter(k => k.length > 3); // 3글자 이상 키워드만
      const missingKeywords = importantKeywords.filter(keyword => 
        !allContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (missingKeywords.length > 0) {
        return {
          success: false,
          message: `다중 지문에서 누락된 키워드: ${missingKeywords.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: `다중 지문 생성기 정상 작동 (${problem.items.length}개 선택지)`
      };
    } catch (error) {
      return {
        success: false,
        message: `다중 지문 생성 오류: ${error.message}`
      };
    }
  }

  // 모든 테스트 실행
  runAllTests() {
    console.log('🔬 1단계: 원본 문제 케이스 테스트');
    console.log('='.repeat(60));
    
    testCases.originalProblems.forEach(testCase => {
      this.runTest(`${testCase.name} - 키워드 보존`, () => this.testKeywordPreservation(testCase));
      this.runTest(`${testCase.name} - 문장 개수`, () => this.testSentenceCount(testCase));
      this.runTest(`${testCase.name} - 문장 무결성`, () => this.testSentenceIntegrity(testCase));
      this.runTest(`${testCase.name} - 문장 삽입 생성기`, () => this.testInsertionGenerator(testCase));
      this.runTest(`${testCase.name} - 다중 지문 생성기`, () => this.testMultiPassageGenerator(testCase));
    });

    console.log('🔬 2단계: 문장부호 변형 테스트');
    console.log('='.repeat(60));
    
    testCases.punctuationVariations.forEach(testCase => {
      this.runTest(`${testCase.name} - 키워드 보존`, () => this.testKeywordPreservation(testCase));
      this.runTest(`${testCase.name} - 문장 무결성`, () => this.testSentenceIntegrity(testCase));
    });

    console.log('🔬 3단계: 긴 문장 테스트');
    console.log('='.repeat(60));
    
    testCases.longSentences.forEach(testCase => {
      this.runTest(`${testCase.name} - 키워드 보존`, () => this.testKeywordPreservation(testCase));
      this.runTest(`${testCase.name} - 문장 무결성`, () => this.testSentenceIntegrity(testCase));
    });

    console.log('🔬 4단계: 엣지 케이스 테스트');
    console.log('='.repeat(60));
    
    testCases.edgeCases.forEach(testCase => {
      this.runTest(`${testCase.name} - 키워드 보존`, () => this.testKeywordPreservation(testCase));
      this.runTest(`${testCase.name} - 문장 무결성`, () => this.testSentenceIntegrity(testCase));
    });

    // 결과 요약
    this.printSummary();
  }

  printSummary() {
    console.log('📊 테스트 결과 요약');
    console.log('='.repeat(60));
    console.log(`총 테스트: ${this.totalTests}개`);
    console.log(`통과: ${this.passedTests}개 (${Math.round(this.passedTests/this.totalTests*100)}%)`);
    console.log(`실패: ${this.failedTests.length}개`);
    
    if (this.failedTests.length > 0) {
      console.log('\n❌ 실패한 테스트들:');
      this.failedTests.forEach((failure, i) => {
        console.log(`${i+1}. ${failure.name}: ${failure.reason}`);
      });
    } else {
      console.log('\n🎉 모든 테스트 통과! 문장 절단 오류가 완전히 해결되었습니다.');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// 테스트 실행
const testRunner = new ComprehensiveTestRunner();
testRunner.runAllTests();