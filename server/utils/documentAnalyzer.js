/**
 * DocumentAnalyzer
 * Uses OpenAI to analyze passages with rich, structured output
 */

let OpenAI;
try { OpenAI = require('openai'); } catch {}

const { readAnalysisManual } = require('./analysisManual');
const { jsonrepair } = require('jsonrepair');
const wordnet = require('wordnet');
const { translateGlossToKorean } = require('./documentProblemFallback');
const { translateText } = require('./translationHelper');

let wordnetReadyPromise = null;

const CONTEXT_BLUEPRINTS = [
  {
    key: 'healthcare',
    match: ['healthcare', 'patient', 'medical', 'clinic', 'hospital', 'nurse'],
    background: [
      '보건·의료 단원에서는 환자와 전문가 사이의 신뢰가 치료 효과를 좌우한다고 배워요.',
      '의료 윤리에서는 환자 중심 소통이 왜 중요한지, 개인정보 보호가 어떤 의미인지 함께 다룹니다.'
    ],
    example: [
      '학교 보건 시간에 모의 진료 활동을 할 때, 질문을 차분히 던지고 환자의 감정을 살피는 모습을 떠올려 보세요.',
      '그렇게 배려하며 소통하면 문장에서 강조한 전문적인 관계가 자연스럽게 만들어져요.'
    ]
  },
  {
    key: 'relationship',
    match: ['relationship', 'trust', 'communication', 'bond', 'connection', 'partnership'],
    background: [
      '사회·윤리 교과서는 신뢰와 의사소통이 공동체를 지탱하는 핵심 요소라고 설명해요.',
      '심리학에서는 안정적인 관계를 만들려면 꾸준한 경청과 존중이 필요하다고 알려 줍니다.'
    ],
    example: [
      '조별 프로젝트에서 서로의 역할을 정할 때, 친구의 의견을 들으며 계획을 세우는 장면을 상상해 보세요.',
      '서로 존중하며 협력하면 글에서 말한 튼튼한 관계가 실제로 만들어집니다.'
    ]
  },
  {
    key: 'selfcare',
    match: ['boundary', 'boundaries', 'self-boundaries', 'limits', 'balance', 'protect'],
    background: [
      '진로와 생활 과목에서는 자신의 한계를 정리하고 지키는 연습이 감정 노동을 줄인다고 배워요.',
      '상담 심리에서는 건강한 경계가 결국 타인과의 관계를 더 오래 지켜 준다고 설명합니다.'
    ],
    example: [
      '친구 고민을 들어줄 때도 밤늦게까지 무리하지 않고, 내가 힘들면 솔직하게 말하는 장면을 떠올려 보세요.',
      '그렇게 현실적인 선을 정하면 문장에서 말한 관계도 지켜지고 나도 지칠 일이 줄어들어요.'
    ]
  },
  {
    key: 'focus',
    match: ['focus', 'attention', 'priority', 'concentration', 'goal'],
    background: [
      '학습 전략 단원에서는 한 번에 한 가지 목표에 집중할 때 성취도가 높아진다고 소개해요.',
      '심리학 연구에서도 집중을 방해하는 요소를 줄이면 뇌가 정보를 더 오래 기억한다고 말합니다.'
    ],
    example: [
      '시험 준비를 할 때 휴대폰을 치우고 오늘 꼭 풀어야 할 문제만 정리하는 모습을 떠올려 보세요.',
      '집중할 대상을 정해두면 문장처럼 환자에게 더 많은 관심을 쏟을 수 있어요.'
    ]
  },
  {
    key: 'default',
    match: [],
    background: [
      '교과서에서는 새로운 개념을 배울 때 관련 사례와 배경지식을 함께 살펴보라고 안내해요.',
      '이 주제를 다른 과목과 연결해 보면 생각의 폭이 넓어지고 이해가 오래갑니다.'
    ],
    example: [
      '우리 반 프로젝트나 일상생활 속에서 이 개념이 쓰일 장면을 하나 골라 보세요.',
      '실제로 적용해 보면 문장의 의미가 훨씬 또렷해집니다.'
    ]
  }
];

const VOCAB_OVERRIDES = [
  {
    match: /healthcare/i,
    meaning: '보건 의료, 건강을 돌보는 모든 활동',
    synonyms: ['medical care', 'health services', 'patient care'],
    antonyms: ['medical neglect', 'lack of care'],
    note: '의료진이 환자의 신체와 마음을 함께 살피는 전 과정을 가리킬 때 자주 써요. 📘'
  },
  {
    match: /patient/i,
    meaning: '치료를 받는 사람, 환자',
    synonyms: ['client', 'care recipient', 'person under treatment'],
    antonyms: ['caregiver'],
    note: '의료 현장에서 도움을 받는 사람을 부드럽게 부를 때 사용돼요. 문맥에 맞는 존칭과 함께 연습해 보세요. 🙌'
  },
  {
    match: /relationship/i,
    meaning: '관계, 서로 이어진 연결',
    synonyms: ['connection', 'partnership', 'rapport'],
    antonyms: ['conflict', 'disconnection'],
    note: '사람 사이의 신뢰와 소통을 묶어 표현할 때 자주 쓰여요. 나만의 예시 문장을 만들어 보세요. 🤝'
  },
  {
    match: /focus/i,
    meaning: '초점, 집중',
    synonyms: ['concentration', 'attention', 'emphasis'],
    antonyms: ['distraction'],
    note: '무엇에 힘을 실어야 하는지 분명히 할 때 쓰는 단어예요. 공부할 때 today\'s focus를 적어 보세요. 🎯'
  },
  {
    match: /boundary/i,
    meaning: '경계, 한계선',
    synonyms: ['limit', 'line', 'threshold'],
    antonyms: ['limitlessness', 'overextension'],
    note: '자신을 지키기 위해 정해 두는 선을 말할 때 쓰여요. 상황별로 말로 표현하는 연습을 해 보세요. 🛡️'
  }
];

const MAX_VARIANTS_PER_PASSAGE = 2;
const ANALYSIS_MANUAL_SNIPPET = readAnalysisManual(2600);

function buildAnalysisPrompt({ passage, passageNumber, variantIndex, retryNotes }) {
const guidance = [
  '당신은 대한민국 최고의 영어 교수님이자 따뜻한 담임 선생님이에요.',
  '결과물은 초등학생도 이해할 수 있는 학습용 artifact입니다. 친근한 존댓말 대화체로 길고 자세하게 설명해 주세요.',
  'sentenceAnalysis 배열의 각 항목에는 english, isTopicSentence, korean, analysis, background, example, grammar, vocabulary.words 필드를 반드시 포함해 주세요.',
  'english 필드에는 원문 문장을 그대로 적고, 주제문(isTopicSentence=true)은 **굵은 글씨**로 감싸 주세요.',
  'korean·analysis·background·example 필드는 각각 "*** 한글 해석:", "*** 분석:", "*** 이 문장에 필요한 배경지식:", "*** 이 문장에 필요한 사례:"로 시작하게 작성하고, 두세 문장 이상 친절하게 설명하면서 이모지를 한두 개 넣어 주세요.',
  'grammar 필드는 "어법 포인트:"로 시작해 복잡한 구문과 시제를 두 문장 이상으로 풀어 설명해 주세요.',
  'vocabulary.words에는 최소 두 개 이상의 핵심 어휘를 넣고, 각 항목에 term, meaning, synonyms(최소 두 개), antonyms(최소 한 개), note(사용 팁)을 빠짐없이 채워 주세요.',
  'vocabulary.intro 필드에는 "*** 어휘 포인트:"로 시작하는 문장을 작성해 어떤 단어를 집중해서 공부하면 좋은지 부드럽게 안내해 주세요.',
  'meta.deepDive, englishTitles(3개, 하나는 의문문), koreanMainIdea, authorsClaim, englishSummary, englishSummaryKorean, modernApplications(최소 세 가지 행동 지침)도 모두 채워 주세요.',
  'JSON 외의 설명이나 마크다운은 절대 출력하지 말고 하나의 JSON 객체만 반환하세요.'
].join('\n');

  const manualSection = ANALYSIS_MANUAL_SNIPPET
    ? `분석 가이드 전문 (일부 발췌):\n${ANALYSIS_MANUAL_SNIPPET}`
    : '분석 가이드: (로컬 매뉴얼을 불러오지 못했습니다. 아래 요구사항만이라도 꼭 지켜 주세요).';

  const formatBlueprint = `출력 JSON 예시:
{
  "variantIndex": ${variantIndex},
  "sentenceAnalysis": [
    {
      "english": "**원문 한 문장 그대로**",
      "isTopicSentence": true,
      "korean": "아주 쉬운 한글 해석",
      "analysis": "문장이 전달하는 메시지와 글 속 역할을 온화하게 설명하고, 학생을 격려하는 말과 이모지를 함께 남겨 주세요 😊",
      "background": "관련된 철학·과학·역사·사회 지식을 두 문장 이상으로 알려 주세요.",
      "example": "학교나 가정에서 바로 떠올릴 수 있는 현실 예시를 두 문장 이상으로 소개해 주세요.",
      "grammar": "핵심 구문이나 어법을 두 문장 이상으로 설명하고, 학생이 따라 말할 팁을 적어 주세요.",
      "vocabulary": {
        "words": [
          {
            "term": "핵심 단어",
            "meaning": "쉬운 뜻과 뉘앙스 설명",
            "synonyms": ["동의어 1", "동의어 2"],
            "antonyms": ["반의어 1"],
            "note": "예문이나 콜로케이션 등 추가 팁"
          },
          {
            "term": "두 번째 단어",
            "meaning": "학생이 알아야 할 정의",
            "synonyms": ["비슷한 말 1", "비슷한 말 2"],
            "antonyms": ["반대말 1"],
            "note": "수업에서 활용할 팁"
          }
        ]
      }
    }
  ],
  "meta": {
    "deepDive": {
      "coreMessage": "지문 전체 핵심",
      "logicalFlow": "문단 연결",
      "toneAndStyle": "필자의 어조·수사"
    },
    "englishTitles": [
      { "title": "제목 후보 1", "korean": "한글 해석", "isQuestion": false },
      { "title": "제목 후보 2?", "korean": "한글 해석", "isQuestion": true },
      { "title": "제목 후보 3", "korean": "한글 해석", "isQuestion": false }
    ],
    "koreanMainIdea": "저자의 핵심 주장",
    "authorsClaim": "작가가 전달하려는 메시지",
    "englishSummary": "짧고 정확한 영어 요약",
    "englishSummaryKorean": "위 영어 요약의 한국어 번역",
    "modernApplications": ["현대 사회 적용 사례 1", "현대 사회 적용 사례 2", "현대 사회 적용 사례 3"]
  }
}`;

  const retrySection = Array.isArray(retryNotes) && retryNotes.length
    ? `이전 시도에서 고쳐야 할 문제:
- ${retryNotes.join('\n- ')}`
    : '';

  return [
    guidance,
    '',
    manualSection,
    '',
    formatBlueprint,
    '',
    retrySection,
    retrySection ? '' : null,
    `분석 대상 지문 번호: ${passageNumber}`,
    '분석할 지문:',
    passage
  ].filter(Boolean).join('\n');
}

class DocumentAnalyzer {
  constructor() {
    const fastMode = String(process.env.LOE_FAST_MODE || '').trim() === '1';
    this.openai = (!fastMode) && OpenAI && process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  async analyzeIndividualPassages(content, options = {}) {
    const passages = this._extractPassages(content);
    const results = [];
    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];
      const analysis = await this.analyzeIndividualPassage(passage, i + 1);
      results.push(analysis);
      await new Promise(r => setTimeout(r, 800));
    }
    return results;
  }

  async analyzeIndividualPassage(passage, passageNumber) {
    if (!this.openai) {
      return this._buildFallbackVariant(passage, passageNumber, ['openai_not_configured']);
    }

    const failureNotes = [];
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const prompt = buildAnalysisPrompt({
        passage,
        passageNumber,
        variantIndex: attempt,
        retryNotes: Array.from(new Set(failureNotes))
      });

      try {
        const resp = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: attempt === 1 ? 0.4 : 0.35,
          max_tokens: 3200,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
        });

        const raw = (resp.choices?.[0]?.message?.content || '').trim();
        const clean = raw.replace(/```json\s*|```/g, '');

        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch (parseError) {
          try {
            const repaired = jsonrepair(clean);
            parsed = JSON.parse(repaired);
            failureNotes.push(`auto-repaired JSON: ${parseError.message}`);
          } catch (repairError) {
            throw new Error(`json_parse_error: ${repairError.message}`);
          }
        }

        const context = { passageNumber, failureReasons: [] };
        const normalized = this._normalizeVariantPayload(parsed, context);
        normalized.variantIndex = attempt;
        normalized.originalPassage = passage;

        const issues = this._validateVariant(normalized, context.failureReasons);
        if (issues.length) {
          failureNotes.push(...issues);
          throw new Error(`analysis validation issues: ${issues.join('; ')}`);
        }

        return normalized;
      } catch (error) {
        const message = String(error?.message || '미확인 오류');
        failureNotes.push(message);
        if (attempt >= maxAttempts) {
          console.warn(`[analysis] falling back to heuristic variant: ${message}`);
          return this._buildFallbackVariant(passage, passageNumber, failureNotes);
        }
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }

    return this._buildFallbackVariant(passage, passageNumber, failureNotes);
  }

  async analyzeIndividualPassagesLegacy(content, options = {}) {
    return this.analyzeIndividualPassages(content, options);
  }

  formatForDatabase(variants = []) {
    if (!Array.isArray(variants)) {
      return {
        summary: '',
        key_points: '[]',
        vocabulary: '[]',
        grammar_points: '{}',
        study_guide: '[]',
        comprehension_questions: '{}',
        variants: JSON.stringify([])
      };
    }

    const firstVariant = variants[0] || {};
    return {
      summary: firstVariant?.meta?.englishSummaryKorean || '',
      key_points: JSON.stringify(firstVariant?.sentenceAnalysis || []),
      vocabulary: JSON.stringify(firstVariant?.sentenceAnalysis?.flatMap((item) => item?.vocabulary?.words || []) || []),
      grammar_points: JSON.stringify(firstVariant?.meta?.deepDive || {}),
      study_guide: JSON.stringify(firstVariant?.meta?.modernApplications || []),
      comprehension_questions: JSON.stringify(firstVariant?.meta || {}),
      variants: JSON.stringify(variants.slice(0, MAX_VARIANTS_PER_PASSAGE))
    };
  }

  formatFromDatabase(dbResult) {
    const variants = this._coerceVariantsFromRow(dbResult);
    return {
      id: dbResult.id,
      documentId: dbResult.document_id,
      passageNumber: dbResult.passage_number,
      originalPassage: dbResult.original_passage,
      variants,
      createdAt: dbResult.created_at
    };
  }

  _extractPassages(content) {
    try {
      const parsed = JSON.parse(content);
      const arr = parsed.passages || [];
      if (!Array.isArray(arr) || arr.length === 0) throw new Error('no passages');
      return arr;
    } catch {
      throw new Error('문서 형식이 올바르지 않습니다.');
    }
  }

  _normalizeVariantPayload(raw, context = {}) {
    const failureReasons = Array.isArray(context?.failureReasons) ? context.failureReasons : null;
    const registerFailure = (msg) => {
      const message = String(msg || 'analysis validation error');
      if (failureReasons && !failureReasons.includes(message)) {
        failureReasons.push(message);
      }
      return message;
    };
    const raise = (msg) => {
      throw new Error(registerFailure(msg));
    };

    const passageNumber = Number(context?.passageNumber) || Number(raw?.passageNumber) || 1;
    const variantIndex = Number(raw?.variantIndex) || Number(context?.variantIndex) || 1;

    if (!Array.isArray(raw?.sentenceAnalysis) || raw.sentenceAnalysis.length === 0) {
      raise('sentenceAnalysis 배열이 비어 있습니다. 모든 문장을 빠짐없이 분석해 주세요.');
    }

    const sentenceAnalysis = raw.sentenceAnalysis.map((entry, idx) => {
      const englishRaw = String(entry?.english || '').trim();
      if (!englishRaw) raise(`sentenceAnalysis[${idx + 1}] 영어 원문이 누락되었습니다.`);

      const isTopicSentence = Boolean(entry?.isTopicSentence) || idx === 0;
      const english = isTopicSentence && !/^\*\*.*\*\*$/.test(englishRaw)
        ? `**${englishRaw.replace(/\*\*/g, '').trim()}**`
        : englishRaw;

      const koreanRaw = String(entry?.korean || entry?.translation || '').trim();
      if (!koreanRaw) raise(`sentenceAnalysis[${idx + 1}] 한글 해석이 필요합니다.`);

      const analysisRaw = String(entry?.analysis || entry?.meaning || '').trim();
      if (analysisRaw.length < 60) raise(`sentenceAnalysis[${idx + 1}] 해설을 60자 이상으로 따뜻하게 풀어 주세요.`);

      const backgroundRaw = String(entry?.background || entry?.note || '').trim();
      if (backgroundRaw.length < 40) raise(`sentenceAnalysis[${idx + 1}] 배경 지식을 40자 이상으로 알려 주세요.`);

      const exampleRaw = String(entry?.example || '').trim();
      if (exampleRaw.length < 40) raise(`sentenceAnalysis[${idx + 1}] 실생활 사례를 40자 이상으로 적어 주세요.`);

      const grammarRaw = String(entry?.grammar || '').trim();
      if (grammarRaw.length < 40) raise(`sentenceAnalysis[${idx + 1}] 어법 설명을 40자 이상으로 작성해 주세요.`);

      const vocabularyEntries = Array.isArray(entry?.vocabulary?.words)
        ? entry.vocabulary.words.map(this._normalizeVocabularyWord)
        : this._normalizeLegacyVocabulary(entry);

      let vocabWords = vocabularyEntries
        .map((word) => ({
          term: String(word.term || '').trim(),
          meaning: String(word.meaning || '').trim(),
          synonyms: Array.isArray(word.synonyms) ? [...new Set(word.synonyms.map((syn) => String(syn || '').trim()).filter(Boolean))] : [],
          antonyms: Array.isArray(word.antonyms) ? [...new Set(word.antonyms.map((ant) => String(ant || '').trim()).filter(Boolean))] : [],
          note: String(word.note || '').trim()
        }))
        .filter((word) => word.term && word.meaning);

      if (vocabWords.length < 2) {
        raise(`sentenceAnalysis[${idx + 1}] 어휘 표에는 최소 두 개 이상의 핵심 단어를 넣어 주세요.`);
      }

      vocabWords = vocabWords.map((word, wordIdx) => {
        if (word.meaning.length < 12) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] meaning을 더 구체적으로 작성해 주세요.`);
        if (word.synonyms.length < 2) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] synonyms를 두 개 이상 채워 주세요.`);
        if (word.antonyms.length < 1) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] antonyms를 최소 한 개 이상 채워 주세요.`);
        if (!word.note || word.note.length < 8) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] note에 활용 팁을 적어 주세요.`);
        return word;
      });

      const korean = this._ensurePrefixedLine(koreanRaw, '한글 해석');
      const analysis = this._ensurePrefixedLine(analysisRaw, '분석');
      const background = this._ensurePrefixedLine(backgroundRaw, '이 문장에 필요한 배경지식');
      const example = this._ensurePrefixedLine(exampleRaw, '이 문장에 필요한 사례');
      const grammar = this._ensureGrammarLine(grammarRaw);
      const vocabIntroSource = entry?.vocabulary?.intro || entry?.vocabularyIntro || '';
      const vocabIntro = vocabIntroSource
        ? this._ensurePrefixedLine(vocabIntroSource, '어휘 포인트')
        : this._buildVocabularyIntro(vocabWords);

      return {
        english,
        isTopicSentence,
        korean,
        analysis,
        background,
        example,
        grammar,
        vocabulary: { intro: vocabIntro, words: vocabWords }
      };
    });
    
    const meta = raw?.meta || raw?.comprehensive || {};
    const deepDive = {
      coreMessage: String(meta?.deepDive?.coreMessage || meta?.interpretation || '').trim(),
      logicalFlow: String(meta?.deepDive?.logicalFlow || meta?.context || '').trim(),
      toneAndStyle: String(meta?.deepDive?.toneAndStyle || meta?.commentary || '').trim()
    };

    if (!deepDive.coreMessage) raise('deepDive.coreMessage를 채워 주세요. (지문의 핵심 메시지)');
    if (deepDive.coreMessage.length < 40) raise('deepDive.coreMessage를 40자 이상으로 풍부하게 설명해 주세요.');
    if (!deepDive.logicalFlow) raise('deepDive.logicalFlow가 비어 있습니다. 문단 연결을 설명해 주세요.');
    if (deepDive.logicalFlow.length < 40) raise('deepDive.logicalFlow를 40자 이상으로 구체화해 주세요.');
    if (!deepDive.toneAndStyle) raise('deepDive.toneAndStyle을 작성해 주세요. 필자의 어조/수사를 담아 주세요.');
    if (deepDive.toneAndStyle.length < 40) raise('deepDive.toneAndStyle을 40자 이상으로 설명해 주세요.');

    const englishTitlesRaw = Array.isArray(meta?.englishTitles)
      ? meta.englishTitles
      : this._generateFallbackTitles(meta);
    let englishTitles = englishTitlesRaw
      .map((titleEntry, idx) => ({
        title: String(titleEntry?.title || titleEntry || '').trim(),
        korean: String(titleEntry?.korean || '').trim(),
        isQuestion: Boolean(titleEntry?.isQuestion) || /\?$/.test(String(titleEntry?.title || titleEntry || '')) || idx === 1
      }))
      .filter((item) => item.title);

    englishTitles = this._ensureEnglishTitles(englishTitles, {
      englishSummary: meta?.englishSummary,
      englishSummaryKorean: meta?.englishSummaryKorean,
      koreanMainIdea: meta?.koreanMainIdea,
      authorsClaim: meta?.authorsClaim,
      passageNumber: Number(passageNumber) || 0
    });

    const koreanMainIdea = String(meta?.koreanMainIdea || meta?.koreanSummary || '').trim();
    if (!koreanMainIdea) raise('koreanMainIdea 항목이 비어 있습니다. 지문의 주제를 한국어로 정리해 주세요.');
    if (koreanMainIdea.length < 40) raise('koreanMainIdea를 40자 이상으로 정리해 주세요.');

    const authorsClaim = String(meta?.authorsClaim || '').trim();
    if (!authorsClaim) raise('authorsClaim을 작성해 주세요. (필자의 주장)');
    if (authorsClaim.length < 40) raise('authorsClaim을 40자 이상으로 자세히 풀어 주세요.');

    const englishSummary = String(meta?.englishSummary || meta?.finalSummary || '').trim();
    if (!englishSummary) raise('englishSummary가 누락되었습니다. 한 문장 영어 요약을 작성해 주세요.');
    if (englishSummary.split(/\s+/).filter(Boolean).length < 12) raise('englishSummary는 12단어 이상으로 핵심을 정리해 주세요.');

    const englishSummaryKorean = String(meta?.englishSummaryKorean || '').trim();
    if (!englishSummaryKorean) raise('englishSummaryKorean이 필요합니다. 영어 요약을 한국어로 번역해 주세요.');
    if (englishSummaryKorean.length < 40) raise('englishSummaryKorean을 40자 이상으로 자세히 설명해 주세요.');


    const modernApplications = Array.isArray(meta?.modernApplications)
      ? meta.modernApplications.map((item) => String(item || '').trim()).filter(Boolean)
      : this._normalizeLegacyApplications(raw);
    if (modernApplications.length < 3) {
      raise('modernApplications 항목에는 최소 3개의 현실 적용 사례가 필요합니다.');
    }
    modernApplications.forEach((entry, idx) => {
      if (entry.length < 40) {
        raise(`modernApplications[${idx + 1}]을 40자 이상으로 구체적으로 작성해 주세요.`);
      }
    });
    return {
      passageNumber,
      variantIndex,
      generatedAt: new Date().toISOString(),
      generator: 'openai',
      sentenceAnalysis,
      meta: {
        deepDive,
        englishTitles,
        koreanMainIdea,
        authorsClaim,
        englishSummary,
        englishSummaryKorean,
        modernApplications
      }
    };
  }

  _ensurePrefixedLine(value, label, prefix = '***') {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';

    const escape = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixPattern = new RegExp(`^${escape(prefix)}\s*${escape(label)}`, 'i');
    if (prefixPattern.test(trimmed)) {
      return trimmed;
    }

    const labelPattern = new RegExp(`^${escape(label)}\s*[:：]\s*`, 'i');
    const cleaned = trimmed.replace(labelPattern, '').trim();
    return `${prefix} ${label}: ${cleaned}`;
  }

  _ensureGrammarLine(value, label = '어법 포인트') {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';

    const escape = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingPattern = new RegExp(`^(?:✏️\s*)?${escape(label)}`, 'i');
    if (existingPattern.test(trimmed)) {
      return trimmed;
    }

    const labelPattern = new RegExp(`^(?:✏️\s*)?${escape(label)}\s*[:：]\s*`, 'i');
    const cleaned = trimmed.replace(labelPattern, '').trim();
    return `✏️ ${label}: ${cleaned}`;
  }

  _buildVocabularyIntro(words = []) {
    const terms = (Array.isArray(words) ? words : [])
      .map((word) => (word?.term ? String(word.term).trim() : ''))
      .filter(Boolean);
    const highlighted = terms.slice(0, 3).join(', ');
    const body = highlighted
      ? `이번 문장에서는 ${highlighted} 등을 집중해서 배워 볼게요. 동의어와 반의어까지 함께 익히면 실력이 쑥쑥 자라요! 😊`
      : '이번 문장의 핵심 어휘를 하나씩 정리해 볼게요. 동의어와 반의어까지 챙기면 어휘력이 단단해집니다! 😊';
    return this._ensurePrefixedLine(body, '어휘 포인트');
  }

  _validateVariant(variant, failureReasons = []) {
    const issues = [];
    const note = (msg) => {
      const message = String(msg || 'analysis validation issue');
      if (!issues.includes(message)) issues.push(message);
      if (Array.isArray(failureReasons) && !failureReasons.includes(message)) {
        failureReasons.push(message);
      }
    };
    const warn = (msg) => {
      const message = String(msg || 'analysis validation warning');
      if (Array.isArray(failureReasons) && !failureReasons.includes(message)) {
        failureReasons.push(message);
      }
    };

    if (!variant || typeof variant !== 'object') {
      note('분석 결과가 비어 있습니다.');
      return issues;
    }

    if (!Array.isArray(variant.sentenceAnalysis) || variant.sentenceAnalysis.length === 0) {
      note('sentenceAnalysis가 생성되지 않았습니다.');
      return issues;
    }

    variant.sentenceAnalysis.forEach((item, idx) => {
      if ((item.analysis || '').length < 40) {
        note(`문장 ${idx + 1} 해설을 더 풍부하게 작성해 주세요. (40자 이상)`);
      }
      if ((item.background || '').length < 20) {
        note(`문장 ${idx + 1} 배경 설명을 좀 더 자세히 적어 주세요.`);
      }
      if ((item.example || '').length < 20) {
        note(`문장 ${idx + 1} 예시는 현실적인 장면으로 자세히 적어 주세요.`);
      }
      if ((item.grammar || '').length < 20) {
        note(`문장 ${idx + 1} 어법 설명이 짧아요. 핵심 문법 포인트를 풀어주세요.`);
      }
      const vocabWords = item?.vocabulary?.words || [];
      if (!Array.isArray(vocabWords) || vocabWords.length === 0) {
        warn(`문장 ${idx + 1} 어휘 표를 채워 주세요.`);
      } else {
        item.vocabulary.words = vocabWords.map((entry) => this._normalizeVocabularyWord(entry)).filter((word) => word.term && word.meaning);
        if (item.vocabulary.words.length === 0) {
          warn(`문장 ${idx + 1} 어휘 표에 term과 meaning을 채워 주세요.`);
        }
      }
    });

    const meta = variant.meta || {};
    if ((meta.koreanMainIdea || '').length < 20) {
      note('koreanMainIdea를 20자 이상으로 자세히 정리해 주세요.');
    }
    if ((meta.authorsClaim || '').length < 20) {
      note('authorsClaim을 좀 더 구체적으로 작성해 주세요.');
    }
    if ((meta.englishSummary || '').split(/\s+/).filter(Boolean).length < 8) {
      note('영어 요약문은 최소 8단어 이상으로 작성해 주세요.');
    }
    if (!Array.isArray(meta.modernApplications) || meta.modernApplications.length < 2) {
      note('현대 적용 사례를 최소 2개 이상 작성해 주세요.');
    } else {
      meta.modernApplications.forEach((entry, idx) => {
        if (String(entry || '').length < 20) {
          note(`현대 적용 사례 ${idx + 1}을 더 구체적으로 설명해 주세요.`);
        }
      });
    }

    return issues;
  }

  _normalizeVocabularyWord(entry) {
    return {
      term: String(entry?.term || entry?.word || '').trim(),
      meaning: String(entry?.meaning || '').trim(),
      synonyms: Array.isArray(entry?.synonyms) ? entry.synonyms.map((syn) => String(syn || '').trim()).filter(Boolean) : [],
      antonyms: Array.isArray(entry?.antonyms) ? entry.antonyms.map((ant) => String(ant || '').trim()).filter(Boolean) : [],
      note: String(entry?.note || entry?.usage || '').trim()
    };
  }

  async _buildFallbackVariant(passage, passageNumber, failureNotes = []) {
    const cleanPassage = String(passage || '').trim();
    const sentences = cleanPassage
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const sourceSentences = sentences.length ? sentences : [cleanPassage].filter(Boolean);
    const totalSentences = sourceSentences.length || 1;

    const sentenceAnalysis = await Promise.all(sourceSentences.map(async (sentence, idx) => {
      const englishRaw = String(sentence || '').trim();
      const topicSentence = idx === 0;
      const highlightedEnglish = topicSentence && !/^\*\*.*\*\*$/.test(englishRaw)
        ? `**${englishRaw.replace(/\*\*/g, '').trim()}**`
        : englishRaw;

      const keywords = this._extractFallbackKeywords(englishRaw, 4);
      const translation = await this._safeTranslateSentence(englishRaw, keywords);
      const koreanKeywords = await this._translateKeywords(keywords);
      const highlightedKorean = this._highlightKoreanText(translation, koreanKeywords);
      const baseKorean = `${highlightedKorean || this._buildGenericKoreanGist(englishRaw, keywords, koreanKeywords)} 😊`;

      const analysisRaw = this._composeSentenceAnalysis({
        translation,
        koreanKeywords,
        englishSentence: englishRaw,
        idx,
        total: totalSentences
      });
      const backgroundRaw = this._composeBackground(koreanKeywords, keywords, idx);
      const exampleRaw = this._composeExample(koreanKeywords, keywords, idx);
      const grammarRaw = this._composeGrammarNotes(englishRaw, idx);
      const vocabularyWords = await this._buildVocabularyEntries(keywords);
      const vocabularyIntro = this._buildVocabularyIntro(vocabularyWords);

      return {
        english: highlightedEnglish,
        isTopicSentence: topicSentence,
        korean: this._ensurePrefixedLine(baseKorean, '한글 해석'),
        analysis: this._ensurePrefixedLine(analysisRaw, '분석'),
        background: this._ensurePrefixedLine(backgroundRaw, '이 문장에 필요한 배경지식'),
        example: this._ensurePrefixedLine(exampleRaw, '이 문장에 필요한 사례'),
        grammar: this._ensureGrammarLine(grammarRaw),
        vocabulary: { intro: vocabularyIntro, words: vocabularyWords }
      };
    }));

    const fallbackSummary = 'Caring mentors show how steady routines protect trust and attention.';
    const fallbackSummaryKo = '배려 깊은 선생님은 꾸준한 루틴이 신뢰와 집중력을 지켜 준다고 알려 줍니다.';

    const englishTitles = this._ensureEnglishTitles([], {
      englishSummary: fallbackSummary,
      englishSummaryKorean: fallbackSummaryKo,
      koreanMainIdea: '이 지문은 신뢰를 지키는 마음가짐과 실천법을 다정하게 설명합니다.',
      authorsClaim: '독자에게 따뜻한 태도로 관계와 집중을 동시에 다루라고 권하는 글이에요.',
      passageNumber
    });

    return {
      passageNumber,
      variantIndex: 1,
      generatedAt: new Date().toISOString(),
      generator: 'fallback',
      sentenceAnalysis,
      meta: {
        deepDive: {
          coreMessage: '이 글은 서로를 존중하며 경계를 세우면 신뢰가 단단해진다는 메시지를 전합니다.',
          logicalFlow: '필요성을 제시하고, 실천 방법과 기대 효과를 차례로 보여 주는 구조라고 설명해 주세요.',
          toneAndStyle: '따뜻한 조언과 실무적 지침이 함께 담긴 차분한 어조라는 점을 되새겨 주세요.'
        },
        englishTitles,
        koreanMainIdea: '차근차근한 안내 속에서 학생이 바로 실천할 수 있는 관계 전략이 정리되어 있습니다.',
        authorsClaim: '배려 깊은 행동과 전문성을 함께 갖추면 삶의 여러 장면에서 신뢰를 얻을 수 있다는 주장을 전합니다.',
        englishSummary: fallbackSummary,
        englishSummaryKorean: fallbackSummaryKo,
        modernApplications: this._buildModernApplications(sentenceAnalysis),
        rescueNotes: Array.isArray(failureNotes) ? failureNotes.slice(0, 6) : []
      }
    };
  }

  async _safeTranslateSentence(sentence, keywords = []) {
    const trimmed = String(sentence || '').trim();
    if (!trimmed) return '';
    try {
      const translated = await translateText(trimmed, { target: 'ko' });
      if (translated) {
        return translated;
      }
    } catch (error) {
      console.warn('[analysis-fallback] translate error', error?.message || error);
    }
    return this._buildGenericKoreanGist(trimmed, keywords, []);
  }

  async _translateKeywords(keywords = []) {
    const results = [];
    for (const keyword of keywords) {
      const normalized = this._normalizeKeyword(keyword);
      if (!normalized) {
        results.push('');
        continue;
      }
      const gloss = translateGlossToKorean(normalized);
      if (gloss) {
        results.push(gloss);
        continue;
      }
      try {
        const translated = await translateText(normalized, { target: 'ko' });
        results.push(translated || normalized);
      } catch (error) {
        console.warn('[analysis-fallback] keyword translate error', error?.message || error);
        results.push(normalized);
      }
    }
    return results;
  }

  _highlightKoreanText(text = '', koreanKeywords = []) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return '';
    let highlighted = cleanText;
    const used = new Set();
    (koreanKeywords || []).filter(Boolean).forEach((keyword) => {
      if (!/[가-힣]/.test(keyword)) return;
      const sanitized = keyword.replace(/[\\^$.*+?()|[\]{}\-]/g, '\\$&');
      if (!sanitized) return;
      const regex = new RegExp(sanitized, 'g');
      let replaced = false;
      highlighted = highlighted.replace(regex, (match) => {
        replaced = true;
        if (used.has(match)) return match;
        used.add(match);
        return `[${match}]`;
      });
      if (!replaced && !used.has(keyword)) {
        highlighted += ` [${keyword}]`;
        used.add(keyword);
      }
    });
    return highlighted;
  }

  _composeSentenceAnalysis({ translation, koreanKeywords, englishSentence, idx, total }) {
    const gist = this._buildGenericKoreanGist(englishSentence, [], koreanKeywords);
    const translated = translation ? translation.replace(/\s+/g, ' ').trim() : '';
    const translationNote = translated ? `우리말로 옮기면 “${translated}”이라는 뜻이에요.` : '';
    const keyword = (koreanKeywords || []).find((value) => value);
    const keywordHint = keyword ? `'${keyword}'에 주목하면 필자의 의도가 선명해져요.` : '핵심 표현을 직접 표시해 두면 이해가 오래갑니다.';
    const flowRole = this._describeFlowRole(idx, total);
    const practice = idx % 2 === 0
      ? '핵심 문장을 한 줄로 요약해 보고 친구와 비교해 보세요.'
      : '비슷한 상황을 떠올려 자신의 말로 풀어 보세요.';
    return `💡 ${[translationNote, gist, flowRole, keywordHint, practice].filter(Boolean).join(' ')}`.replace(/\s+/g, ' ').trim();
  }

  _describeFlowRole(idx, total) {
    if (idx === 0) {
      return '글의 첫머리에서 주제를 소개하며 분위기를 잡아 줍니다.';
    }
    if (idx === total - 1) {
      return '마지막 문장이라 앞 내용을 정리하고 다정하게 마무리해 줍니다.';
    }
    return '중간에서 앞 문장의 생각을 이어 받아 구체적인 설명을 덧붙이는 연결 고리 역할을 해요.';
  }

  _composeBackground(koreanKeywords = [], englishKeywords = [], idx = 0) {
    const blueprint = this._selectContextBlueprint(englishKeywords);
    const mainKeyword = (koreanKeywords.find((value) => value) || englishKeywords[0] || '이 주제');
    const backgrounds = Array.isArray(blueprint?.background) && blueprint.background.length
      ? blueprint.background
      : [
          '관련 교과서 단원에서 다뤘던 사례를 다시 찾아보면 이해가 더 단단해져요.',
          '비슷한 주제를 다룬 기사나 다큐멘터리를 찾아보며 배운 내용을 확장해 보세요.'
        ];
    const primaryLine = backgrounds[idx % backgrounds.length].replace('이 주제', mainKeyword);
    const extensionPool = [
      '학습 노트에 핵심 개념과 배경을 나란히 정리해 보세요.',
      '친구와 서로 다른 배경 정보를 공유하며 폭넓게 생각해 보세요.',
      '관련 용어를 다시 찾아보고 나만의 예시를 덧붙이면 기억이 오래갑니다.'
    ];
    const extension = extensionPool[idx % extensionPool.length];
    return `📚 ${primaryLine} ${extension}`;
  }

  _composeExample(koreanKeywords = [], englishKeywords = [], idx = 0) {
    const blueprint = this._selectContextBlueprint(englishKeywords);
    const mainKeyword = (koreanKeywords.find((value) => value) || englishKeywords[0] || '이 개념');
    const examples = Array.isArray(blueprint?.example) && blueprint.example.length
      ? blueprint.example
      : [
          '하루 계획표에 작은 실천 항목을 적고 체크하면서 변화 과정을 느껴 보세요.',
          '가족이나 친구와 역할을 나눠 상황극을 해 보면 행동 요령이 더 잘 떠오릅니다.'
        ];
    const primaryLine = examples[idx % examples.length]
      .replace('이 개념', mainKeyword)
      .replace('이 주제', mainKeyword);
    const practicePool = [
      '실천 기록을 짧게 남기고 다음에 개선할 점을 적어 보세요.',
      '실제 사례 사진이나 자료를 찾아 스크랩북을 만들어 보세요.',
      '나만의 팁을 친구와 공유하며 서로 피드백을 주고받아 보세요.'
    ];
    const practice = practicePool[idx % practicePool.length];
    return `🏫 ${primaryLine} ${practice}`;
  }

  _composeGrammarNotes(sentence = '', idx = 0) {
    const features = this._identifyGrammarFeatures(sentence);
    if (!features.length) {
      const fallbackMessages = [
        '✏️ 주어와 동사의 연결, 시제를 확인하며 소리 내어 읽어 보세요. 강세를 표시하면 의미가 또렷해집니다!',
        '✏️ 쉼표와 접속사를 기준으로 문장을 덩어리로 나눠 읽으면 구조가 눈에 들어옵니다.',
        '✏️ 핵심 단어에 톤을 살짝 올려 읽어 보면 강조점이 자연스럽게 드러나요.'
      ];
      return fallbackMessages[idx % fallbackMessages.length];
    }
    const detail = features.join(' ');
    return `✏️ ${detail} 소리 내어 읽으며 강세와 리듬을 익히면 문장이 훨씬 자연스럽게 느껴져요!`;
  }

  _identifyGrammarFeatures(sentence = '') {
    const lower = String(sentence || '').toLowerCase();
    const features = [];
    if (/^when\s/.test(lower)) {
      features.push('When으로 시작한 부사절이 조건을 먼저 말하고, 뒤 문장에서 핵심 메시지를 전달합니다.');
    }
    if (/^by\s+[a-z\-]+ing/.test(lower) || /,\s*by\s+[a-z\-]+ing/.test(lower)) {
      features.push('By + 동명사 구조가 “~함으로써”의 의미를 만들어 앞뒤 내용의 인과관계를 자연스럽게 이어 줍니다.');
    }
    if (/it\s+is\s+(very\s+)?important\s+to/i.test(sentence)) {
      features.push('It is + 형용사 + to부정사 구조는 가주어 it을 쓰고, 뒤의 to부정사가 진주어 역할을 하는 표현이에요.');
    }
    if (/self-/.test(lower)) {
      features.push('self- 접두사가 붙은 명사는 “자기 자신과 관련된” 의미를 더해요.');
    }
    if (/\bbe\s+[a-z]+ed\b/.test(lower)) {
      features.push('be + 과거분사 형태가 수동태를 만들어 행동의 대상이 되는 사람을 강조합니다.');
    }
    if (!features.length && sentence.includes(',')) {
      features.push('콤마(,)가 절을 나누어 주어 호흡을 조절하면 의미가 더 또렷해집니다.');
    }
    return features;
  }

  async _buildVocabularyEntries(keywords = []) {
    const entries = [];
    const seen = new Set();

    for (const keyword of keywords) {
      const term = String(keyword || '').trim();
      if (!term) continue;
      const normalized = term.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const override = this._findVocabularyOverride(term);
      let meaning = override?.meaning || translateGlossToKorean(term) || '';
      if (!meaning) {
        try {
          meaning = await translateText(term, { target: 'ko' });
        } catch (error) {
          console.warn('[analysis-fallback] vocab translate error', error?.message || error);
        }
      }
      meaning = (meaning || '').replace(/\s+/g, ' ').trim() || `${term}의 의미를 우리말로 정리해 보세요.`;

      let synonyms = override?.synonyms || await this._getWordnetSynonyms(term);
      synonyms = this._finalizeSynonymList(term, synonyms);

      let antonyms = override?.antonyms || await this._getWordnetAntonyms(term);
      antonyms = this._finalizeAntonymList(term, antonyms);

      const note = override?.note || this._composeVocabularyNote(term, meaning);

      entries.push({
        term,
        meaning,
        synonyms,
        antonyms,
        note
      });
    }

    if (!entries.length) {
      entries.push({
        term: 'Key idea',
        meaning: '문장의 중심 내용을 다시 정리해 보는 표현이에요.',
        synonyms: ['central idea', 'main message'],
        antonyms: ['side detail'],
        note: '핵심을 한 문장으로 말해 보는 연습을 하면 글 흐름이 훨씬 잘 보입니다. ✍️'
      });
    }

    while (entries.length < 2) {
      entries.push({
        term: 'Core detail',
        meaning: '세부 내용을 다시 짚어 주어 문장을 깊이 이해하도록 돕는 표현이에요.',
        synonyms: ['essential point', 'key detail'],
        antonyms: ['minor aside'],
        note: 'Core detail을 표시하며 읽으면 중요한 정보가 눈에 잘 들어와요. 친구와 서로 비교해 보세요! ✨'
      });
    }

    return entries.slice(0, 4);
  }

  _findVocabularyOverride(term = '') {
    const lower = String(term || '').toLowerCase();
    return VOCAB_OVERRIDES.find((entry) => entry.match.test(lower)) || null;
  }

  _finalizeSynonymList(term, list = []) {
    const normalizedTerm = String(term || '').toLowerCase();
    const unique = new Set();
    (Array.isArray(list) ? list : []).forEach((item) => {
      const clean = String(item || '').replace(/_/g, ' ').trim();
      if (!clean) return;
      if (clean.toLowerCase() === normalizedTerm) return;
      unique.add(this._capitalizeWord(clean));
    });
    if (unique.size < 2) {
      unique.add(this._capitalizeWord(`core ${normalizedTerm}`));
      unique.add(this._capitalizeWord(`key ${normalizedTerm}`));
    }
    return Array.from(unique).slice(0, 4);
  }

  _finalizeAntonymList(term, list = []) {
    const normalizedTerm = String(term || '').toLowerCase();
    const unique = new Set();
    (Array.isArray(list) ? list : []).forEach((item) => {
      const clean = String(item || '').replace(/_/g, ' ').trim();
      if (!clean) return;
      if (clean.toLowerCase() === normalizedTerm) return;
      unique.add(this._capitalizeWord(clean));
    });
    if (!unique.size) {
      unique.add(this._capitalizeWord(`opposite of ${normalizedTerm}`));
    }
    return Array.from(unique).slice(0, 2);
  }

  _composeVocabularyNote(term, meaning) {
    const cleanMeaning = String(meaning || '').replace(/\s+/g, ' ').trim();
    return `${term}라는 표현은 ${cleanMeaning}라는 뜻이에요. 짧은 예문을 직접 만들어 친구와 서로 피드백해 보세요. ✍️`;
  }

  async _getWordnetSynonyms(term) {
    const normalized = this._normalizeKeyword(term);
    if (!normalized) return [];
    if (!this._wordnetSynonymCache) {
      this._wordnetSynonymCache = new Map();
    }
    if (this._wordnetSynonymCache.has(normalized)) {
      return this._wordnetSynonymCache.get(normalized);
    }

    const synonyms = new Set();
    try {
      const ready = await this._ensureWordnetReady();
      if (!ready) {
        return [];
      }
      const candidates = this._buildWordnetCandidates(normalized);
      for (const candidate of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const entries = await wordnet.lookup(candidate);
          entries.forEach((entry) => {
            (entry?.meta?.words || []).forEach((wordObj) => {
              const word = String(wordObj?.word || '').replace(/_/g, ' ').trim();
              if (word && word.toLowerCase() !== candidate.toLowerCase()) {
                synonyms.add(word);
              }
            });
          });
        } catch (lookupError) {
          // continue trying other candidates
        }
        if (synonyms.size >= 6) {
          break;
        }
      }
    } catch (error) {
      console.warn('[analysis-fallback] wordnet synonym lookup error', error?.message || error);
    }

    const result = Array.from(synonyms).slice(0, 6);
    this._wordnetSynonymCache.set(normalized, result);
    return result;
  }

  async _getWordnetAntonyms(term) {
    const normalized = this._normalizeKeyword(term);
    if (!normalized) return [];
    if (!this._wordnetAntonymCache) {
      this._wordnetAntonymCache = new Map();
    }
    if (this._wordnetAntonymCache.has(normalized)) {
      return this._wordnetAntonymCache.get(normalized);
    }

    const antonyms = new Set();
    try {
      const ready = await this._ensureWordnetReady();
      if (!ready) {
        return [];
      }
      const candidates = this._buildWordnetCandidates(normalized);
      for (const candidate of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const entries = await wordnet.lookup(candidate);
          for (const entry of entries) {
            const pointers = entry?.meta?.pointers || [];
            for (const pointer of pointers) {
              if (pointer.pointerSymbol === '!') {
                // eslint-disable-next-line no-await-in-loop
                const antonymEntry = await wordnet.get(pointer.synsetOffset, pointer.pos);
                (antonymEntry?.meta?.words || []).forEach((wordObj) => {
                  const word = String(wordObj?.word || '').replace(/_/g, ' ').trim();
                  if (word && word.toLowerCase() !== candidate.toLowerCase()) {
                    antonyms.add(word);
                  }
                });
              }
            }
          }
        } catch (lookupError) {
          // ignore
        }
        if (antonyms.size >= 4) {
          break;
        }
      }
    } catch (error) {
      console.warn('[analysis-fallback] wordnet antonym lookup error', error?.message || error);
    }

    const result = Array.from(antonyms).slice(0, 4);
    this._wordnetAntonymCache.set(normalized, result);
    return result;
  }

  async _ensureWordnetReady() {
    if (!wordnetReadyPromise) {
      wordnetReadyPromise = wordnet.init().catch((error) => {
        console.warn('[analysis-fallback] wordnet init failed', error?.message || error);
        return null;
      });
    }
    return wordnetReadyPromise;
  }

  _buildWordnetCandidates(term = '') {
    const clean = String(term || '').toLowerCase();
    const candidates = new Set();
    if (!clean) return [];
    candidates.add(clean.replace(/[-\s]+/g, '_'));
    if (clean.includes('-')) {
      clean.split('-').forEach((piece) => {
        if (piece) candidates.add(piece);
      });
    }
    if (clean.includes(' ')) {
      clean.split(' ').forEach((piece) => {
        if (piece) candidates.add(piece);
      });
    }
    if (clean.endsWith('ies') && clean.length > 4) {
      candidates.add(`${clean.slice(0, -3)}y`);
    }
    if (clean.endsWith('es') && clean.length > 4) {
      candidates.add(clean.slice(0, -2));
    }
    if (clean.endsWith('s') && clean.length > 3) {
      candidates.add(clean.slice(0, -1));
    }
    return Array.from(candidates);
  }

  _selectContextBlueprint(englishKeywords = []) {
    const lowered = (englishKeywords || []).map((kw) => String(kw || '').toLowerCase());
    for (const blueprint of CONTEXT_BLUEPRINTS) {
      if (!blueprint.match.length) continue;
      const matched = blueprint.match.some((token) => lowered.some((word) => word.includes(token)));
      if (matched) {
        return blueprint;
      }
    }
    return CONTEXT_BLUEPRINTS.find((item) => item.key === 'default');
  }

  _buildModernApplications(sentenceAnalysis = []) {
    const firstEntry = sentenceAnalysis?.[0];
    const vocabTerms = Array.isArray(firstEntry?.vocabulary?.words)
      ? firstEntry.vocabulary.words.map((item) => String(item?.term || '')).filter(Boolean)
      : [];
    const blueprint = this._selectContextBlueprint(vocabTerms);

    if (blueprint?.key === 'healthcare') {
      return [
        '실습 시간에 환자 역할 놀이를 할 때, 상대의 감정을 먼저 묻고 진료 절차를 차분히 설명해 보세요.',
        '현장에서 쓰이는 전문 표현과 따뜻한 말투를 함께 익혀 팀원과 피드백을 주고받아 보세요.',
        '자원봉사나 진로 체험에 참여할 때는 안전 수칙과 개인정보 보호 원칙을 먼저 점검해 두세요.'
      ];
    }
    if (blueprint?.key === 'relationship') {
      return [
        '조별 프로젝트에서 회의 전에 체크인 질문을 한 번씩 나누며 서로의 상태를 확인해 보세요.',
        '갈등이 생기면 I-message로 느낀 점을 말하고, 해결책을 함께 찾는 연습을 해 보세요.',
        '주기적으로 고마웠던 일을 기록하고 공유하면 팀 신뢰도가 자연스럽게 올라갑니다.'
      ];
    }
    if (blueprint?.key === 'selfcare') {
      return [
        '일과 공부 시간을 정할 때 휴식 블록을 먼저 확보하고, 도움 요청 기준을 메모해 두세요.',
        '감정이 과하게 흔들릴 때 사용할 완충 문장을 준비해 두면 관계가 훨씬 편안해집니다.',
        '하루가 끝나면 지킨 경계와 놓친 경계를 체크하며 다음날 계획을 수정해 보세요.'
      ];
    }
    if (blueprint?.key === 'focus') {
      return [
        '공부 전 3분 동안 오늘의 집중 목표를 노트에 적고, 방해 요소를 미리 치워 보세요.',
        '수업 중 중요한 부분은 색상이나 기호로 표시해 시각적인 초점을 잡아 보세요.',
        '하루를 마무리하며 “오늘 내가 집중을 유지한 장면”을 기록하면 다음날 동기가 생깁니다.'
      ];
    }
    return [
      '새로 배운 개념을 자신의 말로 요약하고, 실제 생활에서 활용할 장면을 한 가지씩 적어 보세요.',
      '친구와 짝을 이루어 서로의 요약을 비교하고 더 명확한 표현으로 바꿔 보세요.',
      '배운 내용을 가족이나 동생에게 설명해 보며 이해한 정도를 점검하세요.'
    ];
  }

  _buildGenericKoreanGist(sentence, keywords = [], koreanKeywords = []) {
    const mainKeyword = (koreanKeywords.find((value) => value) || keywords[0] || '핵심 아이디어');
    const secondKeyword = (koreanKeywords.slice(1).find((value) => value) || keywords[1] || '관련 개념');
    if (secondKeyword && secondKeyword !== mainKeyword) {
      return `${mainKeyword}과(와) ${secondKeyword}의 연결을 보여 주며 생각의 폭을 넓혀 주는 문장입니다.`;
    }
    return `${mainKeyword}의 의미를 또렷하게 잡아 주는 핵심 문장입니다.`;
  }

  _normalizeKeyword(keyword) {
    return String(keyword || '').replace(/[^A-Za-z\s'-]/g, ' ').trim();
  }

  _capitalizeWord(text = '') {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    return trimmed[0].toUpperCase() + trimmed.slice(1);
  }

  _extractFallbackKeywords(sentence, limit = 2) {
    const matches = String(sentence || '')
      .match(/[A-Za-z][A-Za-z'\-]{4,}/g)
      || [];
    const unique = [];
    matches.forEach((word) => {
      const normalized = word.toLowerCase();
      if (!unique.some((entry) => entry.norm === normalized)) {
        unique.push({ word, norm: normalized });
      }
    });
    if (!unique.length) {
      return ['Focus'];
    }
    return unique
      .slice(0, Math.max(1, limit))
      .map((entry) => entry.word.replace(/^[a-z]/, (char) => char.toUpperCase()));
  }

  _normalizeLegacyVocabulary(entry) {
    const expression = entry?.expression || entry?.term;
    if (!expression) return [];
    return [
      {
        term: String(expression).trim(),
        meaning: String(entry?.meaning || '').trim(),
        synonyms: Array.isArray(entry?.synonyms) ? entry.synonyms : [],
        antonyms: Array.isArray(entry?.antonyms) ? entry.antonyms : [],
        note: ''
      }
    ];
  }

  _generateFallbackTitles(meta = {}) {
    const base = String(meta?.englishTitle || meta?.englishSummary || '').trim();
    if (!base) return [];
    return [
      { title: base, korean: String(meta?.koreanSummary || '').trim(), isQuestion: /\?$/.test(base) }
    ];
  }

  _ensureEnglishTitles(existing = [], meta = {}) {
    const results = [];
    const seen = new Set();
    const fallbackKorean = String(meta.koreanMainIdea || meta.englishSummaryKorean || meta.authorsClaim || '').trim()
      || '지문의 핵심을 다시 생각해 보아요.';

    const push = (title, korean, isQuestion = false) => {
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) return;
      const normalized = cleanTitle.toLowerCase();
      if (seen.has(normalized)) return;
      const cleanKorean = String(korean || '').trim() || fallbackKorean;
      const normalizedTitle = cleanTitle.replace(/\?+$/, '');
      const finalTitle = isQuestion ? `${normalizedTitle}?` : normalizedTitle;
      results.push({
        title: finalTitle,
        korean: cleanKorean,
        isQuestion: Boolean(isQuestion) || /\?$/.test(cleanTitle)
      });
      seen.add(normalized);
    };

    (Array.isArray(existing) ? existing : []).forEach((item) => {
      push(item?.title, item?.korean, item?.isQuestion);
    });

    if (results.length < 3) {
      const englishSummary = String(meta.englishSummary || '').trim().replace(/\s+/g, ' ');
      if (englishSummary) {
        const trimmed = englishSummary.replace(/\.$/, '');
        push(trimmed, meta.englishSummaryKorean, false);
        const snippet = trimmed.split(/\s+/).slice(0, 6).join(' ');
        push(`Key Insight: ${snippet}`, meta.englishSummaryKorean, false);
        push(`Why ${snippet}?`, meta.englishSummaryKorean, true);
      }
    }

    if (results.length < 3) {
      const passageNum = Number(meta.passageNumber) || null;
      const baseLabel = passageNum ? `Passage ${passageNum}` : 'This Passage';
      push(`${baseLabel} Key Idea`, fallbackKorean, false);
      push(`What Happens in ${baseLabel}?`, fallbackKorean, true);
    }

    return results.slice(0, 3);
  }

  _normalizeLegacyApplications(raw) {
    const examples = raw?.examplesAndBackground?.examples;
    if (Array.isArray(examples)) {
      return examples.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return [];
  }

  _coerceVariantsFromRow(row) {
    try {
      const parsed = row?.variants ? JSON.parse(row.variants) : null;
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.slice(0, MAX_VARIANTS_PER_PASSAGE);
      }
    } catch (error) {
      console.warn('[analysis] failed to parse variants column:', error?.message || error);
    }

    // fallback to legacy columns
    const legacyVariant = {
      passageNumber: row?.passage_number,
      variantIndex: 1,
      generatedAt: row?.created_at || new Date().toISOString(),
      generator: 'openai',
      sentenceAnalysis: this._safeParse(row?.key_points, []),
      meta: {
        deepDive: this._safeParse(row?.grammar_points, {}),
        englishTitles: [],
        koreanMainIdea: '',
        authorsClaim: '',
        englishSummary: '',
        englishSummaryKorean: '',
        modernApplications: this._safeParse(row?.study_guide, [])
      }
    };
    return [legacyVariant];
  }

  _safeParse(value, fallback) {
    try {
      return JSON.parse(value || '') || fallback;
    } catch {
      return fallback;
    }
  }
}

module.exports = DocumentAnalyzer;
module.exports.MAX_VARIANTS_PER_PASSAGE = MAX_VARIANTS_PER_PASSAGE;
