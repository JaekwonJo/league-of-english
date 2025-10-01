// Central templates and helpers for CSAT-style problem generation.

const SUMMARY_TEMPLATE = {
  type: 'summary',
  question: ({ questionNumber }) => {
    const number = questionNumber ? String(questionNumber) : '';
    return `다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?${number ? ` [${number}]` : ''}`;
  },
  answerLabel: '정답을 고르시오.',
  optionShape: '① 표현A - 표현B',
  expectedOptionCount: 5
};

function resolveQuestionNumber({ baseQuestionNumber, passageNumber }) {
  if (typeof baseQuestionNumber === 'number') {
    return baseQuestionNumber + (passageNumber ? passageNumber - 1 : 0);
  }
  return passageNumber || null;
}

function extractGlossaryFromPassage(passage = '') {
  const lines = String(passage)
    .split(/\r?\n/)
    .map((line) => line.trim());
  const glossary = [];
  for (const line of lines) {
    const match = line.match(/^\*(.+?):\s*(.+)$/);
    if (match) {
      const term = match[1].trim();
      const meaning = match[2].trim();
      if (term && meaning) {
        glossary.push({ term, meaning });
      }
    }
  }
  return glossary;
}

module.exports = {
  SUMMARY_TEMPLATE,
  resolveQuestionNumber,
  extractGlossaryFromPassage
};

