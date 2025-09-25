const fs = require('fs');
const path = require('path');
const database = require('../models/database');
const { generateCSATGrammarProblem } = require('../utils/csatGrammarGenerator');

let OpenAI = null;
try {
  OpenAI = require('openai');
} catch {}

const GRAMMAR_MANUAL_PATH = path.join(__dirname, '..', '..', 'problem manual', 'grammar_problem_manual.md');
let cachedGrammarManual = null;

const SUMMARY_TEMPLATE_PATH = path.join(__dirname, '..', '..', 'docs', 'problem-templates', 'summary-two-blank.md');
let cachedSummaryTemplate = null;
const SUMMARY_QUESTION = '\ub2e4\uc74c \uae00\uc744 \uc77d\uace0 (A), (B)\uc5d0 \ub4e4\uc5b4\uac08 \ub9d0\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc744 \uace0\ub974\uc2dc\uc624.';
const SUMMARY_CIRCLED_DIGITS = ['\u2460', '\u2461', '\u2462', '\u2463', '\u2464'];
const SUMMARY_EN_DASH = '\u2013';

function readGrammarManual(limit = 3500) {
  if (cachedGrammarManual === null) {
    try {
      cachedGrammarManual = fs.readFileSync(GRAMMAR_MANUAL_PATH, 'utf8');
    } catch (err) {
      console.warn('[aiProblemService] failed to load grammar manual:', err?.message || err);
      cachedGrammarManual = '';
    }
  }
  if (!cachedGrammarManual) return '';
  return cachedGrammarManual.slice(0, limit);
}

function stripJsonFences(text) {
  if (!text) return '';
  return String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
}

function clipText(text, limit) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)} …`;
}

function normalizeOptions(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (item === null || item === undefined) return null;
      const marker = String.fromCharCode(9312 + index);
      let value = '';
      if (typeof item === 'object' && item !== null) {
        value = String(item.value || item.text || item.option || item.content || item.label || '').trim();
      } else {
        value = String(item).trim();
      }
      if (!value) return null;
      value = value
        .replace(/^[①-⑤]\s*/u, '')
        .replace(/^[0-9]+\.\s*/, '')
        .replace(/^[A-E]\.\s*/i, '')
        .trim();
      if (!value) return null;
      return `${marker} ${value}`;
    })
    .filter(Boolean);
}

function parseAnswerList(value, optionCount, zeroBased = false) {
  if (value === null || value === undefined) return [];
  const tokens = Array.isArray(value) ? value : String(value).split(/[,:;\s]+/);
  const numbers = [];
  for (const token of tokens) {
    if (token === null || token === undefined) continue;
    const str = String(token).trim();
    if (!str || !/^-?\d+$/.test(str)) continue;
    let num = parseInt(str, 10);
    if (Number.isNaN(num)) continue;
    if (zeroBased) num += 1;
    if (num >= 1 && (!optionCount || num <= optionCount)) numbers.push(num);
  }
  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  return unique;
}

function buildGrammarPrompt({ passage, manual, difficulty, docTitle }) {
  const clippedPassage = clipText(passage, 1600);
  const questionInstruction = difficulty === 'advanced'
    ? '학생은 밑줄 친 부분이 문법적으로 옳은 문장을 모두 고르는 문제입니다.'
    : '학생은 밑줄 친 부분에서 문법적으로 옳지 않은 문장을 고르는 문제입니다.';
  const answerField = difficulty === 'advanced'
    ? '"correctAnswers": [1,3], // array of all correct option numbers (sorted)'
    : '"correctAnswer": 3, // number of the incorrect option';

  return `You are a top-tier CSAT English grammar item writer. Use the handbook excerpt and the passage to craft ONE ${difficulty} grammar problem.\n\nHandbook excerpt (Korean guidance):\n${manual}\n\nPassage from '${docTitle}':\n${clippedPassage}\n\n${questionInstruction}\nRules:\n- Provide exactly five options, each string must begin with a circled numeral (①~⑤).\n- Underline the key grammar target inside each option using <u> ... </u>.\n- Every option must closely follow sentences or clauses from the passage (trim or combine if needed, never invent new content).\n- The explanation must be in Korean and reference the grammar point.\n- Include a short Korean source label if helpful (예: 'p3-no.21').\n- For basic difficulty, exactly one option must be grammatically incorrect. For advanced difficulty, at least two options must be grammatically correct.\n- Return only valid JSON with the shape:\n{\n  "type": "${difficulty === 'advanced' ? 'grammar_multi' : 'grammar'}",\n  "question": "다음 중 ...",\n  "options": ["① ...", "② ...", "③ ...", "④ ...", "⑤ ..."],\n  ${answerField}\n  "explanation": "…",\n  "context": ["sentence1", "sentence2"],\n  "sourceLabel": "p3-no.21",\n  "grammarPoint": "주어-동사 수일치"\n}\nNo commentary outside the JSON.`;
}

function formatGrammarFromModel(raw, context) {
  if (!raw || typeof raw !== 'object') return null;
  const options = normalizeOptions(raw.options || raw.choices || raw.sentences || []);
  const slicedOptions = options.slice(0, 5);
  if (slicedOptions.length < 5) return null;
  const optionCount = slicedOptions.length;

  const question = String(
    raw.question ||
      (context.difficulty === 'advanced'
        ? '다음 중 밑줄 친 부분이 문법적으로 옳은 문장을 모두 고르시오.'
        : '다음 중 밑줄 친 부분에서 문법상 옳지 않은 문장을 고르시오.')
  ).trim();

  const answerValues = context.difficulty === 'advanced'
    ? parseAnswerList(raw.correctAnswers || raw.correctAnswer || raw.answer, optionCount)
    : parseAnswerList(raw.correctAnswer || raw.answer, optionCount);

  if (!answerValues.length) return null;
  if (context.difficulty === 'advanced' && answerValues.length < 2) return null;

  const explanation = String(raw.explanation || raw.rationale || '').trim();
  const contextList = Array.isArray(raw.context)
    ? raw.context
    : Array.isArray(raw.contextSentences)
    ? raw.contextSentences
    : [];
  const mainText = contextList.length
    ? contextList.map((item) => String(item).trim()).filter(Boolean).join(' ')
    : String(raw.contextText || raw.mainText || raw.passage || '').trim() || context.passage;

  const metadata = {
    generator: 'openai',
    difficulty: context.difficulty,
    docTitle: context.docTitle,
    order: context.index + 1
  };
  if (raw.sourceLabel) metadata.sourceLabel = String(raw.sourceLabel).trim();
  if (raw.grammarPoint) metadata.grammarPoint = String(raw.grammarPoint).trim();
  if (contextList.length) metadata.contextSentences = contextList.map((item) => String(item).trim()).filter(Boolean);
  if (raw.distractors) metadata.distractors = raw.distractors;
  if (raw.hints) metadata.hints = raw.hints;

  return {
    id: raw.id || `grammar_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: context.difficulty === 'advanced' ? 'grammar_multi' : 'grammar',
    question,
    options: slicedOptions,
    answer: answerValues.join(','),
    explanation,
    difficulty: context.difficulty,
    mainText,
    metadata
  };
﻿function readSummaryTemplate(limit = 3600) {
  if (cachedSummaryTemplate === null) {
    try {
      cachedSummaryTemplate = fs.readFileSync(SUMMARY_TEMPLATE_PATH, 'utf8');
    } catch (err) {
      console.warn('[aiProblemService] failed to load summary template:', err?.message || err);
      cachedSummaryTemplate = '';
    }
  }
  if (!cachedSummaryTemplate) return '';
  return cachedSummaryTemplate.slice(0, limit);
}

function normalizeSummaryOptions(options = []) {
  const flat = [];
  const pushCandidate = (value) => {
    if (value === null || value === undefined) return;
    const str = String(value).trim();
    if (str) flat.push(str);
  };

  if (!Array.isArray(options)) {
    pushCandidate(options);
  } else {
    options.forEach((option) => {
      if (option === null || option === undefined) return;
      if (Array.isArray(option)) {
        option.forEach((item) => pushCandidate(item));
        return;
      }
      if (typeof option === 'object') {
        const left = option.left || option.first || option.a || option.A;
        const right = option.right || option.second || option.b || option.B;
        if (left && right) {
          const leftStr = String(left).trim();
          const rightStr = String(right).trim();
          if (leftStr && rightStr) {
            flat.push(`${leftStr} ${SUMMARY_EN_DASH} ${rightStr}`);
            return;
          }
        }
        if ('text' in option || 'value' in option) {
          pushCandidate(option.text || option.value);
          return;
        }
        if (Array.isArray(option.options)) {
          option.options.forEach((item) => pushCandidate(item));
          return;
        }
      }
      pushCandidate(option);
    });
  }

  const sanitized = [];
  for (let i = 0; i < SUMMARY_CIRCLED_DIGITS.length; i += 1) {
    const base = flat[i];
    if (!base) return null;
    let text = String(base)
      .replace(/^[\u2460-\u2468]\s*/, '')
      .replace(/^[0-9]+\.?\s*/, '')
      .replace(/^[A-E]\.?\s*/i, '')
      .trim();
    if (!text) return null;
    if (!text.includes(SUMMARY_EN_DASH)) {
      const parts = text.split(/[-\u2013-\u2014]/).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        text = `${parts[0]} ${SUMMARY_EN_DASH} ${parts[1]}`;
      } else {
        return null;
      }
    } else {
      text = text.replace(/\s*[-\u2013-\u2014]\s*/, ` ${SUMMARY_EN_DASH} `);
    }
    sanitized.push(`${SUMMARY_CIRCLED_DIGITS[i]} ${text}`);
  }
  return sanitized.length === SUMMARY_CIRCLED_DIGITS.length ? sanitized : null;
}

function buildSummaryPrompt({ passage, docTitle, manual }) {
  const clippedPassage = clipText(passage, 1800);
  const manualSnippet = manual ? `Summary template (Korean excerpt):\n${manual}\n\n` : '';
  return [
    'You are an expert CSAT English problem writer. Create exactly ONE summary question with two blanks (A) and (B).',
    manualSnippet,
    `Passage title: ${docTitle}`,
    `Passage (preserve line breaks):\n${clippedPassage}`,
    '',
    'Return only valid JSON matching this schema:',
    '{',
    `  "type": "summary",`,
    `  "question": "${SUMMARY_QUESTION}",`,
    '  "summarySentence": "(A) ... (B) ...",',
    '  "options": [',
    '    "\u2460 phrase \u2013 phrase",',
    '    "\u2461 phrase \u2013 phrase",',
    '    "\u2462 phrase \u2013 phrase",',
    '    "\u2463 phrase \u2013 phrase",',
    '    "\u2464 phrase \u2013 phrase"',
    '  ],',
    '  "correctAnswer": 3,',
    '  "explanation": "\ud55c\uad6d\uc5b4 \ud574\uc124",',
    '  "sourceLabel": "\ucd9c\ucc98: 2024 \ud559\ub144\ub3c4 ...",',
    '  "summaryPattern": "\ud328\ud134",',
    '  "keywords": ["word1", "word2"],',
    '  "difficulty": "basic"',
    '}',
    'Rules:',
    '- Keep (A) and (B) exactly as uppercase letters inside parentheses.',
    '- Provide exactly five options labeled with circled digits ①-⑤ and join the pair with an en dash (–).',
    '- Options must be concise English phrases that plausibly complete the summary.',
    '- Ensure exactly one correct option and make the distractors plausible but wrong.',
    '- Write the explanation in Korean referencing the passage.',
    '- Respond with JSON only; do not include markdown fencing.'
  ].filter(Boolean).join('\n');
}

function formatSummaryFromModel(raw, context) {
  if (!raw || typeof raw !== 'object') return null;
  const summarySentence = String(raw.summarySentence || raw.summary || raw.summaryText || '').trim();
  if (!summarySentence || summarySentence.indexOf('(A)') === -1 || summarySentence.indexOf('(B)') === -1) return null;

  const options = normalizeSummaryOptions(raw.options || raw.choices || raw.pairs || []);
  if (!options || options.length !== SUMMARY_CIRCLED_DIGITS.length) return null;

  const answerKeys = ['correctAnswer', 'answer', 'correctAnswers', 'answers'];
  let answerValue = null;
  for (const key of answerKeys) {
    if (key in raw) {
      const parsed = parseAnswerList(raw[key], options.length);
      if (parsed.length) {
        answerValue = parsed[0];
        break;
      }
    }
  }
  if (!answerValue || answerValue < 1 || answerValue > options.length) return null;

  const explanation = String(raw.explanation || raw.rationale || '').trim();
  const difficultyRaw = String(raw.difficulty || '').trim().toLowerCase();
  const difficulty = difficultyRaw && ['basic', 'advanced'].includes(difficultyRaw) ? difficultyRaw : 'basic';
  const sourceLabel = String(raw.sourceLabel || raw.source || '').trim();

  const metadata = {};
  if (raw.summaryPattern) {
    const pattern = String(raw.summaryPattern).trim();
    if (pattern) metadata.summaryPattern = pattern;
  }
  if (Array.isArray(raw.keywords)) {
    const keywords = raw.keywords.map((kw) => String(kw).trim()).filter(Boolean);
    if (keywords.length) metadata.keywords = keywords;
  }
  metadata.passageIndex = context.index + 1;
  metadata.documentTitle = context.docTitle;
  if (raw.difficulty && difficultyRaw !== difficulty) metadata.generatedDifficulty = difficultyRaw;

  const result = {
    id: raw.id || `summary_ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'summary',
    question: SUMMARY_QUESTION,
    summarySentence,
    options,
    answer: String(answerValue),
    explanation,
    mainText: context.passage,
    sourceLabel: sourceLabel || `\ucd9c\ucc98: ${context.docTitle}`,
    difficulty
  };

  if (!result.explanation) delete result.explanation;
  if (!result.sourceLabel) delete result.sourceLabel;

  if (raw.summarySentenceKor) {
    const kor = String(raw.summarySentenceKor).trim();
    if (kor) result.summarySentenceKor = kor;
  }

  if (Object.keys(metadata).length) {
    result.metadata = metadata;
  }

  return result;
}

function fallbackSummaryProblem(passage, docTitle, index) {
  const summarySentence = 'According to the passage, (A) support encourages readers to build lasting (B) for success.';
  const options = [
    `${SUMMARY_CIRCLED_DIGITS[0]} casual praise ${SUMMARY_EN_DASH} hesitation`,
    `${SUMMARY_CIRCLED_DIGITS[1]} short-term rewards ${SUMMARY_EN_DASH} distraction`,
    `${SUMMARY_CIRCLED_DIGITS[2]} consistent guidance ${SUMMARY_EN_DASH} confidence`,
    `${SUMMARY_CIRCLED_DIGITS[3]} random excuses ${SUMMARY_EN_DASH} frustration`,
    `${SUMMARY_CIRCLED_DIGITS[4]} passive waiting ${SUMMARY_EN_DASH} indifference`
  ];
  const metadata = {
    generator: 'fallback',
    passageIndex: index + 1,
    documentTitle: docTitle
  };
  return {
    id: `summary_fallback_${Date.now()}_${index}`,
    type: 'summary',
    question: SUMMARY_QUESTION,
    summarySentence,
    options,
    answer: '3',
    explanation: '\uae00\uc740 \uc9c0\uc18d\uc801\uc778 \uc9c0\uc6d0\uc774 \uc790\uc2e0\uac10\uc744 \ud0a4\uc6b4\ub2e4\ub294 \ub0b4\uc6a9\uc744 \uc804\ud569\ub2c8\ub2e4.',
    difficulty: 'basic',
    mainText: passage,
    sourceLabel: `\ucd9c\ucc98: ${docTitle}`,
    metadata
  };
}

function fallbackGrammarBasic(passage, docTitle, index) {
  try {
    const base = generateCSATGrammarProblem(passage, { difficulty: 'basic', seed: Date.now() + index });
    if (!base || !Array.isArray(base.choices)) return null;
    const options = normalizeOptions(base.choices).slice(0, 5);
    if (options.length < 5) return null;
    const answers = parseAnswerList(base.correctAnswer || base.answer, options.length);
    const answer = answers.length ? answers[0] : 1;
    return {
      id: `grammar_fallback_${Date.now()}_${index}`,
      type: 'grammar',
      question: base.question || '다음 중 밑줄 친 부분에서 문법상 옳지 않은 문장을 고르시오.',
      options,
      answer: String(answer),
      explanation: base.explanation || '동사의 수나 시제를 확인하세요.',
      difficulty: 'basic',
      mainText: base.text || passage,
      metadata: {
        generator: 'fallback',
        difficulty: 'basic',
        docTitle
      }
    };
  } catch (err) {
    console.warn('[aiProblemService] fallback basic grammar failed:', err?.message || err);
    return null;
  }
}

function fallbackGrammarAdvanced(passage, docTitle, index) {
  const basic = fallbackGrammarBasic(passage, docTitle, index);
  if (!basic) return null;
  const options = basic.options;
  const incorrect = parseAnswerList(basic.answer, options.length)[0] || 1;
  const correct = [];
  for (let i = 1; i <= options.length; i += 1) {
    if (i !== incorrect) correct.push(i);
  }
  return {
    id: `grammar_multi_fallback_${Date.now()}_${index}`,
    type: 'grammar_multi',
    question: '다음 중 밑줄 친 부분이 문법적으로 옳은 문장을 모두 고르시오.',
    options,
    answer: correct.join(','),
    explanation: basic.explanation
      ? `${basic.explanation} 나머지 문장은 원문의 구조를 유지해 문법적으로 옳습니다.`
      : '밑줄 친 부분에 오류가 없는 문장을 모두 고르세요.',
    difficulty: 'advanced',
    mainText: basic.mainText,
    metadata: {
      generator: 'fallback',
      difficulty: 'advanced',
      docTitle,
      referenceIncorrect: incorrect
    }
  };
}

class AIProblemService {
  async getPassages(documentId) {
    const doc = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (!doc) throw new Error('Document not found');

    let passages = [];
    try {
      const parsed = JSON.parse(doc.content);
      if (Array.isArray(parsed.passages) && parsed.passages.length) {
        passages = parsed.passages.map((item) => String(item || ''));
      } else if (parsed.content && typeof parsed.content === 'string') {
        passages = parsed.content
          .split(/\n{2,}/)
          .map((s) => s.trim())
          .filter((s) => s.length > 40);
      }
    } catch (err) {
      // ignore JSON parse errors
    }

    if (!passages.length && typeof doc.content === 'string') {
      passages = String(doc.content || '')
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter((s) => s.length > 40);
    }
    if (!passages.length) {
      passages = [String(doc.content || '')];
    }

    return { passages, document: doc };
  }

  async countCached(documentId, type) {
    const row = await database.get('SELECT COUNT(*) AS cnt FROM problems WHERE document_id = ? AND type = ?', [documentId, type]);
    return row?.cnt || 0;
  }

  async fetchCached(documentId, type, limit) {
    return database.all(
      'SELECT * FROM problems WHERE document_id = ? AND type = ? ORDER BY RANDOM() LIMIT ?',
      [documentId, type, parseInt(limit)]
    );
  }

  async saveProblems(documentId, type, problems) {
    for (const p of problems) {
      const options = JSON.stringify(p.options || p.choices || []);
      const answer = Array.isArray(p.answer)
        ? p.answer.join(',')
        : String(p.correctAnswer ?? p.answer ?? '');
      const explanation = p.explanation || '';
      const difficulty = p.difficulty || 'basic';
      const mainText = p.mainText || p.text || null;
      const sentences = Array.isArray(p.sentences) ? JSON.stringify(p.sentences) : null;
      const metadata = p.metadata ? JSON.stringify(p.metadata) : null;

      await database.run(
        `INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, is_ai_generated, main_text, sentences, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          documentId,
          type,
          p.question || '',
          options,
          answer,
          explanation,
          difficulty,
          mainText,
          sentences,
          metadata
        ]
      );
    }
  }

  getOpenAI() {
    if (!process.env.OPENAI_API_KEY || !OpenAI) return null;
    if (!this._openai) this._openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return this._openai;
  }

  async generateBlank(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    if (openai) {
      for (let i = 0; i < count; i += 1) {
        const p = passages[i % passages.length];
        const prompt = `You are an English test item writer. Create ONE cloze (fill-in-the-blank) multiple-choice question from the passage. Return strict JSON only.\nPassage:\n${p}\n\nJSON shape:\n{\n  "type": "blank",\n  "question": "Korean: 다음 글의 빈칸에 들어갈 말로 가장 알맞은 것은?",\n  "text": "Passage excerpt with one blank: _____",\n  "options": ["option1","option2","option3","option4"],\n  "correctAnswer": 1,\n  "explanation": "short rationale in Korean"\n}`;
        try {
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          });
          const txt = stripJsonFences(resp.choices?.[0]?.message?.content || '');
          const obj = JSON.parse(txt);
          obj.type = 'blank';
          problems.push(obj);
          continue;
        } catch (e) {
          // fallthrough to rule-based
        }
        problems.push(...await this.generateBlankRule([p], 1));
      }
      return problems;
    }

    return this.generateBlankRule(passages, count);
  }

  async generateBlankRule(passages, count) {
    const problems = [];
    for (let i = 0; i < count; i += 1) {
      const p = passages[i % passages.length];
      const words = (p.match(/\b[A-Za-z]{5,}\b/g) || []).slice(0, 200);
      if (words.length < 4) continue;
      const answerWord = words[Math.floor(Math.random() * words.length)];
      const questionText = p.replace(new RegExp(`\\b${answerWord}\\b`), '_____');
      const distractors = shuffleUnique(words.filter((w) => w.toLowerCase() !== answerWord.toLowerCase()), 3);
      const options = shuffleUnique([answerWord, ...distractors], 4);
      const correct = options.findIndex((w) => w === answerWord) + 1;
      problems.push({
        type: 'blank',
        question: '다음 글의 빈칸에 들어갈 말로 가장 알맞은 것은?',
        text: questionText,
        options,
        correctAnswer: correct,
        explanation: `정답: ${answerWord}`,
        difficulty: 'basic'
      });
    }
    return problems;
  }

  async generateVocab(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i += 1) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Create ONE vocabulary synonym MCQ from the passage. Return JSON only.\nPassage:\n${p}\nJSON:\n{"type":"vocabulary","question":"문맥상 밑줄 친 단어와 의미가 가장 가까운 것을 고르시오.","text":"... with <u>target</u> underlined ...","options":["A","B","C","D"],"correctAnswer":1,"explanation":"short Korean rationale"}`;
        try {
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          });
          const txt = stripJsonFences(resp.choices?.[0]?.message?.content || '');
          const obj = JSON.parse(txt);
          obj.type = 'vocabulary';
          problems.push(obj);
          continue;
        } catch {}
      }
      const words = (p.match(/\b[A-Za-z]{6,}\b/g) || []).slice(0, 200);
      if (words.length < 4) continue;
      const target = words[Math.floor(Math.random() * words.length)];
      const options = shuffleUnique([target, ...shuffleUnique(words.filter((w) => w !== target), 3)], 4);
      const correct = options.findIndex((o) => o === target) + 1;
      problems.push({
        type: 'vocabulary',
        question: `문맥상 '${target}'과 의미가 가까운 단어를 고르시오.`,
        options,
        correctAnswer: correct,
        explanation: '문맥을 통해 의미를 확인하세요.',
        difficulty: 'basic'
      });
    }
    return problems;
  }

  async generateTitle(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i += 1) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Make ONE 'best title' MCQ for the passage. Return JSON only with fields: type='title', question, options[4], correctAnswer(1-4), explanation(Korean). Passage:\n${p}`;
        try {
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }]
          });
          const obj = JSON.parse(stripJsonFences(resp.choices?.[0]?.message?.content || ''));
          obj.type = 'title';
          problems.push(obj);
          continue;
        } catch {}
      }
      const first = (p.split(/(?<=[.!?])\s+/)[0] || '').trim().slice(0, 60);
      const base = first.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 5).join(' ');
      const candidates = shuffleUnique([`${base}` || 'Main Idea', 'A Letter to the Principal', 'Preparing for Exams', 'Library Hours Extension'], 4);
      problems.push({
        type: 'title',
        question: '다음 글의 제목으로 가장 적절한 것은?',
        options: candidates,
        correctAnswer: 1,
        explanation: '글 전체 흐름을 요약해보세요.',
        difficulty: 'basic'
      });
    }
    return problems;
  }

  async generateTopic(documentId, count = 5) {
    const { passages } = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i += 1) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Make ONE 'main topic' MCQ for the passage. JSON fields: type='theme', question, options[4], correctAnswer(1-4), explanation(Korean). Passage:\n${p}`;
        try {
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }]
          });
          const obj = JSON.parse(stripJsonFences(resp.choices?.[0]?.message?.content || ''));
          obj.type = 'theme';
          problems.push(obj);
          continue;
        } catch {}
      }
      const candidates = ['환경 보호', '학교 정책', '시험 준비', '도서관 이용'];
      problems.push({
        type: 'theme',
        question: '다음 글의 주제로 가장 적절한 것은?',
        options: shuffleUnique(candidates, 4),
        correctAnswer: 2,
        explanation: '주제를 나타내는 핵심 문장을 찾아보세요.',
        difficulty: 'basic'
      });
    }
    return problems;
  }

  async generateSummary(documentId, count = 5) {
    const { passages, document } = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    const docTitle = document?.title || `Document ${documentId}`;
    const manual = readSummaryTemplate(2400);

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;

      if (openai) {
        try {
          const prompt = buildSummaryPrompt({ passage, docTitle, manual });
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.35,
            max_tokens: 700,
            messages: [{ role: 'user', content: prompt }]
          });
          const rawText = stripJsonFences(resp.choices?.[0]?.message?.content || '');
          const parsed = JSON.parse(rawText);
          const formatted = formatSummaryFromModel(parsed, { passage, docTitle, index: i });
          if (formatted) {
            problems.push(formatted);
            continue;
          }
        } catch (err) {
          console.warn('[aiProblemService] summary generation failed:', err?.message || err);
        }
      }

      problems.push(fallbackSummaryProblem(passage, docTitle, i));
    }

    return problems;
  }

  async generateGrammar(documentId, count = 5, options = {}) {
    const { difficulty = 'basic' } = options;
    const mode = String(difficulty || 'basic').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
    const { passages, document } = await this.getPassages(documentId);
    const manual = readGrammarManual();
    const openai = this.getOpenAI();
    const problems = [];
    const docTitle = document?.title || `Document ${documentId}`;

    for (let i = 0; i < count; i += 1) {
      const passage = passages[i % passages.length];
      if (!passage) continue;

      if (openai) {
        try {
          const prompt = buildGrammarPrompt({ passage, manual, difficulty: mode, docTitle });
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: mode === 'advanced' ? 0.2 : 0.35,
            max_tokens: 900,
            messages: [{ role: 'user', content: prompt }]
          });
          const rawText = stripJsonFences(resp.choices?.[0]?.message?.content || '');
          const parsed = JSON.parse(rawText);
          const formatted = formatGrammarFromModel(parsed, { difficulty: mode, passage, docTitle, index: i });
          if (formatted) {
            problems.push(formatted);
            continue;
          }
        } catch (err) {
          console.warn(`[ai-grammar:${mode}]`, err?.message || err);
        }
      }

      const fallback = mode === 'advanced'
        ? fallbackGrammarAdvanced(passage, docTitle, i)
        : fallbackGrammarBasic(passage, docTitle, i);
      if (fallback) problems.push(fallback);
    }

    return problems;
  }
}

function shuffleUnique(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

module.exports = new AIProblemService();
