const { buildGrammarPrompt } = require('../../utils/eobeopTemplate');

function buildPrompt({
  passage,
  docTitle,
  passageIndex = 0,
  manualExcerpt = '',
  variantTag,
  desiredAnswerIndex,
  variant,
  extraDirectives = [],
  lastFailure = ''
}) {
  const directives = [...extraDirectives];
  if (lastFailure) {
    directives.push(`- 지난 시도에서 실패한 이유: ${lastFailure}`);
    directives.push('- 위 실패 요인을 반드시 해결해 주세요.');
  }

  return buildGrammarPrompt({
    passage,
    docTitle,
    passageIndex,
    manualExcerpt,
    variantTag,
    desiredAnswerIndex,
    questionText: variant.question,
    answerMode: variant.answerMode,
    targetIncorrectCount: variant.targetIncorrectCount,
    targetCorrectCount: variant.targetCorrectCount,
    extraDirectives: directives
  });
}

module.exports = {
  buildPrompt
};
