const fs = require('fs');
const pdf = require('pdf-parse');

(async () => {
  try {
    const dataBuffer = fs.readFileSync("기출문제모음/2024년도 10월 2학년 2024년10월고2모의고사_기출100문제.pdf");
    const data = await pdf(dataBuffer);
    console.log('--- PDF START ---');
    console.log(data.text.slice(0, 3000)); // 앞부분 3000자만 확인
    console.log('--- PDF END ---');
    
    // 정답이 뒤에 있는지 확인하기 위해 뒷부분도 살짝
    const len = data.text.length;
    console.log('--- PDF FOOTER ---');
    console.log(data.text.slice(len - 2000, len));
  } catch (e) {
    console.error(e);
  }
})();
