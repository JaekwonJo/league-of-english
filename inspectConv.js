const fs = require('fs');
const pdfParse = require('pdf-parse');
const NewPDFParser = require('./server/utils/newPdfParser');
(async () => {
  const buffer = fs.readFileSync('C:/Users/jaekw/Documents/웹앱/워크시트메이커 풀버전/LOE_고2_25년_9월.pdf');
  const parsed = await pdfParse(buffer);
  const parser = new NewPDFParser();
  const result = await parser.parse(parsed.text);
  result.passages.forEach((passage, idx) => {
    if (passage.includes('Conversely, among the largely nomadic')) {
      console.log('index', idx + 1);
      console.log(passage);
    }
  });
})();
