/**
 * 새 PDF 파서 테스트 스크립트
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const NewPDFParser = require('./utils/newPdfParser');

async function testNewParser() {
  console.log('🧪 새로운 PDF 파서 테스트 시작');
  
  // 샘플 텍스트로 먼저 테스트
  const sampleText = `
고1_2024_09월(인천시)-읽기영역(1845번)_본문해석지_문제지

18. p32-수능 대비 ANALYSIS
In today's information age, many companies and teams focus on creativity and speed rather than error prevention. The old industrial mindset of minimizing variation is no longer suitable for innovative organizations.

19. p33-모의고사 문제
As the parent of a gifted child, you need to be aware of common parenting traps. Constantly bragging about your child's abilities can create unnecessary pressure and stress.

20. p34-영어 독해
The concept of artificial intelligence has evolved significantly over the past decades. What once seemed like science fiction is now becoming an integral part of our daily lives.
  `;

  const parser = new NewPDFParser();
  
  try {
    const result = await parser.parse(sampleText);
    
    console.log('\n✅ 파싱 결과:');
    console.log('📚 제목:', result.title);
    console.log('📄 지문 수:', result.totalPassages);
    console.log('📍 출처:', result.sources);
    console.log('\n📝 추출된 지문들:');
    
    result.passages.forEach((passage, index) => {
      console.log(`\n지문 ${index + 1} (${passage.length}자):`);
      console.log(passage);
    });
    
    console.log('\n🎯 전체 연결된 내용:');
    console.log(result.totalContent);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 실제 PDF 파일이 있다면 테스트
async function testWithRealPDF(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    console.log('📄 PDF 파일이 없습니다:', pdfPath);
    return;
  }
  
  console.log('\n📄 실제 PDF 파일 테스트:', pdfPath);
  
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log('📝 PDF에서 추출된 원본 텍스트 길이:', pdfData.text.length);
    console.log('📝 첫 500자:');
    console.log(pdfData.text.substring(0, 500));
    
    const parser = new NewPDFParser();
    const result = await parser.parse(pdfData.text);
    
    console.log('\n✅ 실제 PDF 파싱 결과:');
    console.log('📚 제목:', result.title);
    console.log('📄 지문 수:', result.totalPassages);
    console.log('📍 출처 수:', result.sources.length);
    
  } catch (error) {
    console.error('❌ PDF 테스트 실패:', error);
  }
}

// 테스트 실행
async function runTests() {
  await testNewParser();
  
  // 실제 PDF 파일 경로 (사용자가 제공한 경로)
  const pdfPath = 'c:/Users/jaekw/Documents/워크시트메이커/고1_2024_09월(인천시)-읽기영역(1845번)_본문해석지_문제지.pdf';
  await testWithRealPDF(pdfPath);
}

runTests();