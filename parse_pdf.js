const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
(async () => {
  const parser = new NewPDFParser();
  const text = fs.readFileSync('tmp_pdf_text.txt', 'utf8');
  const { title, sources, passages } = await parser.parse(text);
  console.log('Document Title:', title);
  passages.forEach((passage, index) => {
    const label = sources[index] || `Passage ${index + 1}`;
    console.log(`\n[${index + 1}] Source: ${label}`);
    console.log(passage);
  });
})();
