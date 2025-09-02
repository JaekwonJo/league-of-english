/**
 * 특정 문제점들 테스트
 */

const SimpleOrderGenerator = require('./utils/simpleOrderGenerator');
const InsertionProblemGenerator = require('./utils/insertionProblemGenerator');

console.log('🔧 특정 문제점 수정 테스트\n');

const orderGenerator = new SimpleOrderGenerator();
const insertionGenerator = new InsertionProblemGenerator();

// 테스트 케이스들
const testCases = [
  {
    name: "약어 테스트",
    text: `Dr. Smith arrived at 3:30 p.m. yesterday. The meeting with Prof. Johnson was scheduled for 4:00 p.m. However, Mr. Brown from the U.S.A. was running late. They discussed the Q1 results extensively.`,
    expectedParts: ["Dr. Smith", "Prof. Johnson", "U.S.A.", "extensively"]
  },
  {
    name: "today 키워드 누락 테스트",
    text: `Friends were a survival asset in prehistoric times. If you ran out of food, you knew where to go today.`,
    expectedParts: ["Friends were a survival asset", "today"]
  },
  {
    name: "인용문 테스트",
    text: `"Really?!" she exclaimed. "I can't believe it..." The news was shocking. What would happen next?`,
    expectedParts: ["exclaimed", "shocking"]
  },
  {
    name: "짧은 문장 테스트",
    text: `He ran quickly. She followed him. They stopped suddenly. The end was near. Victory was theirs.`,
    expectedParts: ["ran", "followed", "Victory"]
  }
];

// 각 테스트 실행
testCases.forEach((testCase, index) => {
  console.log(`🧪 테스트 ${index + 1}: ${testCase.name}`);
  console.log(`원문: ${testCase.text}`);
  
  // SimpleOrderGenerator 테스트
  const sentences = orderGenerator.splitIntoSentences(testCase.text);
  console.log(`분리된 문장 (${sentences.length}개):`);
  sentences.forEach((s, i) => {
    console.log(`  ${i + 1}: "${s}"`);
  });
  
  // 키워드 보존 확인
  const fullText = sentences.join(' ');
  const missingKeywords = testCase.expectedParts.filter(keyword => 
    !fullText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (missingKeywords.length === 0) {
    console.log(`✅ 모든 키워드 보존됨`);
  } else {
    console.log(`❌ 누락된 키워드: ${missingKeywords.join(', ')}`);
  }
  
  // InsertionProblemGenerator 테스트
  console.log(`\n문장 삽입 생성기 테스트:`);
  try {
    const extractedSentences = insertionGenerator.extractEnglishSentences(testCase.text);
    console.log(`추출된 문장 (${extractedSentences.length}개):`);
    extractedSentences.forEach((s, i) => {
      console.log(`  ${i + 1}: "${s}"`);
    });
    
    const extractedText = extractedSentences.join(' ');
    const missingInExtracted = testCase.expectedParts.filter(keyword => 
      !extractedText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (missingInExtracted.length === 0) {
      console.log(`✅ 삽입 생성기에서도 모든 키워드 보존됨`);
    } else {
      console.log(`❌ 삽입 생성기에서 누락: ${missingInExtracted.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ 삽입 생성기 오류: ${error.message}`);
  }
  
  console.log('\n' + '─'.repeat(60) + '\n');
});

console.log('🎯 특정 문제점 테스트 완료!');