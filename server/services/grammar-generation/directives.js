function deriveGrammarDirectives(lastFailure = '') {
  const rawMessage = String(lastFailure || '');
  const message = rawMessage.toLowerCase();
  if (!rawMessage) return [];
  const directives = [];
  if (message.includes('underline') || message.includes('밑줄')) {
    directives.push('- Underline exactly five segments with <u>...</u> in both the passage and each option.');
  }
  if (message.includes('자동으로 추가') || message.includes('missing underline')) {
    directives.push('- 밑줄은 문제 속 오류 구간만 감싸도록 정확히 표시하고, 각 보기는 최소 한 단어 이상의 밑줄을 포함해야 합니다.');
  }
  if (message.includes('option') && message.includes('5')) {
    directives.push('- Provide exactly five options labelled with the circled digits ①-⑤.');
  }
  if (/(1-4|1~4|one to four)/i.test(rawMessage) || message.includes('1-4 word')) {
    directives.push('- Each option must be a natural 1-4 word English expression that begins with a letter.');
  }
  if (message.includes('reason')) {
    directives.push('- Fill the "reason" field for every option (정답 포함) with a concise Korean sentence.');
  }
  if (message.includes('korean')) {
    directives.push('- Keep the explanation and option reasons entirely in Korean.');
  }
  if (message.includes('answer count mismatch')) {
    directives.push('- 지정된 정답 개수에 맞게 correctAnswers 배열과 status 값을 정확히 맞춰 주세요.');
  } else if (message.includes('incorrect count mismatch')) {
    directives.push('- 요청된 만큼의 오류 밑줄만 변형하고, 나머지는 원문과 동일하게 유지하세요.');
  } else if (message.includes('correct count mismatch')) {
    directives.push('- 요청된 만큼의 올바른 밑줄만 유지하고, 나머지는 문법 오류가 되도록 수정하세요.');
  } else if (message.includes('correct') && message.includes('count')) {
    directives.push('- Ensure the number of incorrect options matches the correctAnswer(s) list.');
  }
  if (message.includes('question') && message.includes('unexpected')) {
    directives.push('- Use the fixed Korean question text for 어법 항목.');
  }
  if (message.includes('passage') && message.includes('missing')) {
    directives.push('- Return the full original passage verbatim; do not summarise or delete sentences.');
  }
  if (message.includes('찾을 수 없음') || message.includes('segment') || message.includes('위치')) {
    directives.push('- Copy each underlined snippet exactly as it appears in the passage (no paraphrasing or trimming).');
  }
  if (
    message.includes('unchanged from original') ||
    message.includes('변경되지') ||
    message.includes('그대로') ||
    message.includes('일치')
  ) {
    directives.push('- 정답이 아닌 밑줄 구간은 원문과 다른 문법 오류가 드러나도록 반드시 하나 이상의 어형/구두점/구문을 바꿔 주세요. 나머지 네 구간은 원문과 철자까지 동일해야 합니다.');
  }
  if (message.includes('mutated segment mismatch')) {
    directives.push('- 오류로 표시된 밑줄마다 원문과 다른 형태가 드러나도록 수정하고, 오류 수만큼 변형이 이루어졌는지 확인하세요.');
  }
  const missingSnippetRegex = /"([^"]+)"\s*위치를? 찾을 수 없음/gi;
  const snippetDirectives = new Set();
  let snippetMatch;
  while ((snippetMatch = missingSnippetRegex.exec(rawMessage)) !== null) {
    const snippet = snippetMatch[1].trim();
    if (snippet.length) {
      snippetDirectives.add(`- Use the exact phrase "${snippet}" in both the passage and the matching option; do not replace or modify this wording.`);
    }
  }
  directives.push(...snippetDirectives);
  if (message.includes('explanation') || message.includes('too short')) {
    directives.push('- Write the explanation in at least 세 문장, covering 핵심 논지 · 정답 근거 · 두 개 이상 오답의 결함.');
  }
  return directives;
}

module.exports = {
  deriveGrammarDirectives
};
