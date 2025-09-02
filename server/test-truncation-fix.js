/**
 * Test script to verify the sentence truncation fix
 */

const SimpleOrderGenerator = require('./utils/simpleOrderGenerator');
const InsertionProblemGenerator = require('./utils/insertionProblemGenerator');
const { generateRandomOrderProblems } = require('./utils/multiPassageOrderGenerator');

console.log('🔧 문장 절단 오류 수정 테스트 시작\n');

// Test case 1: "today." ending issue
const testText1 = `Additionally, those doctors with scientific training were now distinguished from a range of alternative healers, from homeopaths to midwives, resulting in an elevation in the eyes of the public of the status of the profession as compared with other healing practices, which persists today.`;

console.log('📝 테스트 케이스 1: "today." 절단 문제');
console.log('원문:', testText1);

const orderGenerator = new SimpleOrderGenerator();
const sentences1 = orderGenerator.splitIntoSentences(testText1);
console.log('분리된 문장:');
sentences1.forEach((s, i) => {
  console.log(`  ${i + 1}: "${s}"`);
});

const lastSentence = sentences1[sentences1.length - 1];
const hasToday = lastSentence.includes('today');
console.log(`✅ "today" 포함 여부: ${hasToday ? '정상' : '❌ 누락'}`);
console.log(`✅ 마지막 문장: "${lastSentence}"\n`);

// Test case 2: Missing "Friends were a survival asset." issue
const testText2 = `Over the course of our evolution between 350,000 and 150,000 years ago, Homo sapiens developed an appetite for exploration and a wayfinding spirit that set us apart from other human species. It had a huge effect on our future. One of the most intriguing recent ideas in anthropology is that our ability to navigate was essential to our success as a species, because it allowed us to cultivate extensive social networks. In prehistoric times, when people lived in small family units and spent much of their time looking for food and shelter, being able to share information with other groups about the whereabouts of resources and the movements of predators would have given us an evolutionary edge. Friends were a survival asset. If you ran out of food, you knew where to go; if you needed help on a hunt, you knew who to ask.`;

console.log('📝 테스트 케이스 2: "Friends were a survival asset." 누락 문제');
console.log('원문:', testText2);

const sentences2 = orderGenerator.splitIntoSentences(testText2);
console.log('분리된 문장:');
sentences2.forEach((s, i) => {
  console.log(`  ${i + 1}: "${s}"`);
});

const hasFriends = sentences2.some(s => s.includes('Friends were a survival asset'));
console.log(`✅ "Friends were a survival asset" 포함 여부: ${hasFriends ? '정상' : '❌ 누락'}`);

// Test the full text reconstruction
const reconstructed = sentences2.join(' ');
const originalWords = testText2.split(/\s+/);
const reconstructedWords = reconstructed.split(/\s+/);
console.log(`✅ 단어 개수 보존: 원본 ${originalWords.length}개 → 재구성 ${reconstructedWords.length}개`);
console.log(`✅ 내용 보존율: ${Math.round((reconstructedWords.length / originalWords.length) * 100)}%\n`);

// Test case 3: Insertion problem generator
console.log('📝 테스트 케이스 3: 문장 삽입 문제 생성기');
const insertionGenerator = new InsertionProblemGenerator();
const extractedSentences = insertionGenerator.extractEnglishSentences(testText2);
console.log('추출된 문장:');
extractedSentences.forEach((s, i) => {
  console.log(`  ${i + 1}: "${s}"`);
});

const hasFriendsInExtracted = extractedSentences.some(s => s.includes('Friends were a survival asset'));
console.log(`✅ 문장삽입 생성기에서 "Friends were a survival asset" 포함: ${hasFriendsInExtracted ? '정상' : '❌ 누락'}\n`);

// Test case 4: Multi-passage generator
console.log('📝 테스트 케이스 4: 다중 지문 순서배열 생성기');
const testDocument = {
  title: 'Test Document',
  content: testText1 + '\n\n' + testText2
};

try {
  const problems = generateRandomOrderProblems(testDocument, 1, { orderDifficulty: 'basic' });
  console.log('생성된 문제:');
  problems.forEach((problem, i) => {
    console.log(`문제 ${i + 1}:`);
    console.log(`  주어진 문장: "${problem.given}"`);
    console.log(`  선택지:`);
    problem.items.forEach(item => {
      console.log(`    ${item.l}: "${item.x}"`);
    });
    
    // Check if original content is preserved
    const allContent = problem.given + ' ' + problem.items.map(item => item.x).join(' ');
    const hasAllKeywords = allContent.includes('today') || allContent.includes('Friends were a survival asset');
    console.log(`  ✅ 핵심 내용 보존: ${hasAllKeywords ? '정상' : '❌ 일부 누락'}`);
  });
} catch (error) {
  console.error('❌ 다중 지문 생성 실패:', error.message);
}

console.log('\n🎯 테스트 완료! 위 결과를 확인하여 문장 절단 오류가 해결되었는지 검증하세요.');