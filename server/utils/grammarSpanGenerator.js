const SYMBOLS = ['①', '②', '③', '④', '⑤'];

const PLURAL_PRONOUNS = new Set(['they', 'we', 'you', 'both', 'many', 'several', 'few', 'others', 'these', 'those', 'all', 'some', 'most']);
const IRREGULAR_PLURALS = new Set(['children', 'people', 'men', 'women', 'mice', 'geese', 'teeth', 'feet', 'police', 'cattle', 'criteria', 'phenomena', 'data', 'media', 'bacteria', 'couple']);
const S_ENDING_SINGULAR = new Set(['news', 'mathematics', 'physics', 'economics', 'ethics', 'politics', 'series', 'species', 'means', 'headquarters', 'athletics']);
const SINGULAR_PRONOUNS = new Set(['he', 'she', 'it', 'this', 'that', 'each', 'every', 'anyone', 'everyone', 'someone', 'anybody', 'somebody', 'nobody', 'one', 'either', 'neither']);

function tokenize(text) {
  const tokens = [];
  const wordIndices = [];
  const regex = /([A-Za-z']+|\d+|[^\w\s]+|\s+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const isWord = /^[A-Za-z']+$/.test(value);
    tokens.push({ value, isWord });
    if (isWord) wordIndices.push(tokens.length - 1);
  }
  return { tokens, wordIndices };
}

function isPluralSubjectWord(word) {
  if (!word) return false;
  const lower = word.toLowerCase();
  if (PLURAL_PRONOUNS.has(lower) || IRREGULAR_PLURALS.has(lower)) return true;
  if (lower.endsWith('s') && !S_ENDING_SINGULAR.has(lower) && lower.length > 1) {
    return lower !== 'is' && lower !== 'was' && lower !== 'his' && lower !== 'this' && lower !== 'its' && lower !== 'as' && lower !== 'us';
  }
  return false;
}

function isSingularSubjectWord(word) {
  if (!word) return false;
  const lower = word.toLowerCase();
  if (SINGULAR_PRONOUNS.has(lower)) return true;
  if (IRREGULAR_PLURALS.has(lower)) return false;
  if (PLURAL_PRONOUNS.has(lower)) return false;
  if (lower.endsWith('s') && !S_ENDING_SINGULAR.has(lower)) return false;
  return true;
}

function findPreviousWord(tokens, wordIndices, position, distance = 3) {
  for (let idx = position - 1; idx >= 0 && position - idx <= distance; idx--) {
    const tokenIndex = wordIndices[idx];
    if (tokenIndex !== undefined) return { token: tokens[tokenIndex], index: tokenIndex };
  }
  return null;
}

function findNextWord(tokens, wordIndices, position, distance = 3) {
  for (let idx = position + 1; idx < wordIndices.length && idx - position <= distance; idx++) {
    const tokenIndex = wordIndices[idx];
    if (tokenIndex !== undefined) return { token: tokens[tokenIndex], index: tokenIndex };
  }
  return null;
}

function introduceSubjectVerbError(tokens, wordIndices) {
  for (let i = 0; i < wordIndices.length; i++) {
    const tokenIndex = wordIndices[i];
    const token = tokens[tokenIndex];
    const lower = token.value.toLowerCase();
    const prev = findPreviousWord(tokens, wordIndices, i);
    if (!prev) continue;
    const subject = prev.token.value;

    const makeMessage = (correct, wrong) => `주어 '${subject}'에는 '${correct}'가 어울리지만 '${wrong}'로 잘못 쓰였습니다.`;

    if ((lower === 'are' || lower === 'were' || lower === 'have' || lower === 'do') && isPluralSubjectWord(subject)) {
      const replacements = { are: 'is', were: 'was', have: 'has', do: 'does' };
      const wrong = replacements[lower];
      tokens[tokenIndex] = { value: wrong, isWord: true };
      return { index: tokenIndex, explanation: makeMessage(token.value, wrong) };
    }

    if ((lower === 'is' || lower === 'was' || lower === 'has' || lower === 'does') && isSingularSubjectWord(subject)) {
      const replacements = { is: 'are', was: 'were', has: 'have', does: 'do' };
      const wrong = replacements[lower];
      tokens[tokenIndex] = { value: wrong, isWord: true };
      return { index: tokenIndex, explanation: makeMessage(token.value, wrong) };
    }
  }
  return null;
}

function introduceArticleError(tokens, wordIndices) {
  for (let i = 0; i < wordIndices.length; i++) {
    const tokenIndex = wordIndices[i];
    const lower = tokens[tokenIndex].value.toLowerCase();
    if (lower !== 'a' && lower !== 'an') continue;
    const next = findNextWord(tokens, wordIndices, i, 1);
    if (!next) continue;
    const nextWord = next.token.value;
    const startsWithVowel = /^[aeiou]/i.test(nextWord);
    if (lower === 'a' && startsWithVowel) {
      tokens[tokenIndex] = { value: 'an', isWord: true };
      return { index: tokenIndex, explanation: `자음이 아닌 모음으로 시작하는 단어 '${nextWord}' 앞에는 'an'을 써야 합니다.` };
    }
    if (lower === 'an' && !startsWithVowel) {
      tokens[tokenIndex] = { value: 'a', isWord: true };
      return { index: tokenIndex, explanation: `자음으로 시작하는 단어 '${nextWord}' 앞에는 'a'를 써야 합니다.` };
    }
  }
  return null;
}

function introducePronounError(tokens, wordIndices) {
  for (const idx of wordIndices) {
    const lower = tokens[idx].value.toLowerCase();
    if (lower === 'there') {
      tokens[idx] = { value: 'their', isWord: true };
      return { index: idx, explanation: "장소를 의미하는 'there' 대신 소유격 'their'가 쓰여야 합니다." };
    }
    if (lower === 'their') {
      tokens[idx] = { value: 'there', isWord: true };
      return { index: idx, explanation: "소유를 나타내야 하므로 'their'가 맞지만 'there'로 잘못 쓰였습니다." };
    }
  }
  return null;
}

function introduceGrammarError(tokens, wordIndices) {
  const strategies = [introduceSubjectVerbError, introduceArticleError, introducePronounError];
  for (const strategy of strategies) {
    const result = strategy(tokens, wordIndices);
    if (result) return result;
  }
  return null;
}

function selectHighlightIndices(wordIndices, incorrectIndex, count = 4) {
  const candidates = wordIndices.filter((idx) => idx !== incorrectIndex);
  candidates.sort((a, b) => a - b);
  const selected = [];
  for (const idx of candidates) {
    if (selected.length >= count) break;
    if (Math.abs(idx - incorrectIndex) <= 2) continue;
    selected.push(idx);
  }
  while (selected.length < count && candidates.length) {
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected.includes(idx) && Math.abs(idx - incorrectIndex) > 0) {
      selected.push(idx);
    }
  }
  return selected;
}

function buildSnippet(tokens, targetIndex, window = 4) {
  let start = targetIndex;
  let wordsBefore = 0;
  while (start > 0 && wordsBefore < window) {
    start -= 1;
    if (tokens[start].isWord) wordsBefore += 1;
  }
  let end = targetIndex;
  let wordsAfter = 0;
  while (end < tokens.length - 1 && wordsAfter < window) {
    end += 1;
    if (tokens[end].isWord) wordsAfter += 1;
  }
  const slice = tokens.slice(start, end + 1).map((token, idx) => {
    if (start + idx === targetIndex) {
      return `<u>${token.value}</u>`;
    }
    return token.value;
  });
  return slice.join('').replace(/\s+/g, ' ').trim();
}

function buildMainText(tokens, highlights) {
  const map = new Map(highlights.map((item, idx) => [item, idx]));
  return tokens
    .map((token, idx) => {
      if (!token.isWord) return token.value;
      if (map.has(idx)) {
        const symbol = SYMBOLS[map.get(idx)] || '';
        return `<u>${symbol} ${token.value}</u>`;
      }
      return token.value;
    })
    .join('');
}

function generateGrammarSpanProblem(passage) {
  try {
    const text = String(passage || '').replace(/\s+/g, ' ').trim();
    if (text.length < 60) return null;
    const { tokens, wordIndices } = tokenize(text);
    if (wordIndices.length < 8) return null;

    const mutatedTokens = tokens.map((token) => ({ ...token }));
    const result = introduceGrammarError(mutatedTokens, wordIndices);
    if (!result) return null;

    const incorrectIndex = result.index;
    const highlightIndices = [incorrectIndex, ...selectHighlightIndices(wordIndices, incorrectIndex, 4)].sort((a, b) => a - b);

    if (highlightIndices.length < 5) return null;

    const mainText = buildMainText(mutatedTokens, highlightIndices);
    const choices = highlightIndices.map((tokenIndex, idx) => {
      const snippet = buildSnippet(mutatedTokens, tokenIndex);
      return `${SYMBOLS[idx]} ${snippet}`;
    });

    const correctAnswer = highlightIndices.findIndex((idx) => idx === incorrectIndex) + 1;

    return {
      question: 'Q. 밑줄 친 부분 중 문맥상 어법상 옳지 않은 것을 고르시오.',
      text: mainText,
      choices,
      correctAnswer,
      explanation: result.explanation || '밑줄 친 표현이 문법에 맞지 않습니다.',
      options: choices,
      answer: String(correctAnswer)
    };
  } catch (err) {
    return null;
  }
}

module.exports = { generateGrammarSpanProblem };
