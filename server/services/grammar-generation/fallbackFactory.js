const { buildFallbackProblems } = require('../../utils/fallbackProblemFactory');

async function createFallback({ docTitle, passage, count = 1, reason = 'openai_failed' }) {
  const problems = await buildFallbackProblems({
    type: 'grammar',
    count,
    docTitle,
    reasonTag: reason,
    context: {
      passages: passage ? [passage] : []
    }
  });
  return problems;
}

module.exports = {
  createFallback
};
