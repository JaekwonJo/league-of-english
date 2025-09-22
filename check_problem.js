const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
const InsertionProblemGenerator = require('./server/utils/insertionProblemGenerator2');

const target = process.argv[2] || 'p6-no.36';

(async () => {
  const text = fs.readFileSync('tmp_pdf_text.txt', 'utf8');
  const parser = new NewPDFParser();
  const parsed = await parser.parse(text);
  const targetIndex = parsed.sources.findIndex((s) => s.includes(target));
  if (targetIndex === -1) {
    console.log('target not found');
    return;
  }
  const passage = parsed.passages[targetIndex];
  console.log('Source:', parsed.sources[targetIndex]);
  const [problem] = InsertionProblemGenerator.generateInsertionProblems(
    [passage],
    1,
    {},
    { title: parsed.title },
    { sources: parsed.sources }
  );
  console.log(problem);
})();
