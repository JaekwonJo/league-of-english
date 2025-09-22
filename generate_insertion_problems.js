const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
const InsertionProblemGenerator = require('./server/utils/insertionProblemGenerator2');

(async () => {
  try {
    const rawText = fs.readFileSync('tmp_pdf_text.txt', 'utf8');
    const parser = new NewPDFParser();
    const parsed = await parser.parse(rawText);

    const documentInfo = { title: parsed.title || 'Document' };
    const results = [];
    const failures = [];

    parsed.passages.forEach((passage, index) => {
      const label = parsed.sources[index] || `Passage ${index + 1}`;
      const problems = InsertionProblemGenerator.generateInsertionProblems(
        [passage],
        1,
        {},
        documentInfo,
        null
      );

      if (Array.isArray(problems) && problems.length > 0) {
        const problem = problems[0];
        const correctPosition = parseInt(problem.answer, 10);
        problem.metadata = {
          ...problem.metadata,
          originalTitle: documentInfo.title,
          problemNumber: label,
          source: label,
          originalPageNumber: index + 1,
          correctPosition,
          sourceLabel: label,
          passageIndex: index + 1
        };
        results.push({
          source: label,
          passage,
          problem
        });
      } else {
        failures.push({ index: index + 1, source: label, reason: 'No problem generated' });
      }
    });

    const output = {
      documentTitle: parsed.title,
      totalPassages: parsed.passages.length,
      generatedCount: results.length,
      skippedCount: failures.length,
      generatedAt: new Date().toISOString(),
      results,
      failures
    };

    fs.writeFileSync('generated_insertion_problems.json', JSON.stringify(output, null, 2), 'utf8');

    console.log(`Generated ${results.length} insertion problems. Skipped ${failures.length}.`);
  } catch (error) {
    console.error('Failed to generate insertion problems:', error);
    process.exit(1);
  }
})();
