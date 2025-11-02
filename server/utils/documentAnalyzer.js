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

const KEYWORD_STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'these', 'those', 'with', 'from', 'their', 'there',
  'have', 'has', 'been', 'were', 'into', 'about', 'which', 'while', 'because',
  'through', 'they', 'them', 'then', 'than', 'also', 'such', 'more', 'most', 'only',
  'other', 'where', 'when', 'after', 'before', 'doing', 'being', 'every', 'across',
  'over', 'under', 'again', 'still', 'even', 'very', 'much', 'many', 'often', 'some'
]);

const KEYWORD_KOREAN_OVERRIDES = new Map([
  ['human', '인간'],
  ['humans', '인간'],
  ['people', '사람들'],
  ['person', '사람'],
  ['social', '사회성'],
  ['society', '사회'],
  ['societies', '사회'],
  ['animal', '동물'],
  ['animals', '동물'],
  ['creatures', '생물'],
  ['culture', '문화'],
  ['cultures', '문화'],
  ['pattern', '패턴'],
  ['patterns', '패턴'],
  ['relationship', '관계'],
  ['relationships', '관계'],
  ['communication', '소통'],
  ['ants', '개미'],
  ['ant', '개미'],
  ['bees', '꿀벌'],
  ['bee', '꿀벌'],
  ['termites', '흰개미'],
  ['termite', '흰개미'],
  ['colony', '군집'],
  ['colonies', '군집'],
  ['freedom', '자유'],
  ['nurture', '양육'],
  ['nature', '본능'],
  ['always', '항상'],
  ['build', '짓다'],
  ['lines', '줄'],
  ['zigzag', '지그재그'],
  ['formations', '구성'],
  ['group', '집단'],
  ['groups', '집단'],
  ['dance', '춤'],
  ['dances', '춤'],
  ['think', '생각하다'],
  ['thinks', '생각하다'],
  ['act', '행동하다'],
  ['acts', '행동하다'],
  ['around', '주변'],
  ['others', '다른 사람들']
]);

const FALLBACK_SYNONYM_MAP = new Map([
  ['humans', ['people', 'humankind']],
  ['humanity', ['mankind', 'human race']],
  ['social', ['communal', 'societal']],
  ['animal', ['creature', 'organism']],
  ['ants', ['insects', 'workers']],
  ['bees', ['honeybees', 'pollinators']],
  ['termites', ['white ants', 'insects']],
  ['patterns', ['routines', 'habits']],
  ['nurture', ['care', 'upbringing']],
  ['culture', ['traditions', 'customs']],
  ['harmony', ['balance', 'unity']],
  ['think', ['reflect', 'consider']],
  ['others', ['peers', 'companions']],
  ['around', ['nearby', 'surrounding']],
  ['freedom', ['liberty', 'flexibility']],
  ['diverse', ['varied', 'wide-ranging']],
  ['dynamic', ['active', 'ever-changing']]
]);

const FALLBACK_ANTONYM_MAP = new Map([
  ['humans', ['animals']],
  ['humanity', ['inhumanity']],
  ['social', ['isolated', 'solitary']],
  ['animal', ['plant']],
  ['ants', ['individuals']],
  ['bees', ['loners']],
  ['termites', ['predators']],
  ['patterns', ['chaos']],
  ['nurture', ['neglect']],
  ['culture', ['bareness']],
  ['harmony', ['conflict']],
  ['think', ['ignore']],
  ['others', ['self']],
  ['around', ['distant']],
  ['freedom', ['constraint']],
  ['diverse', ['uniform']],
  ['dynamic', ['static']]
]);

const ENGLISH_LABEL_OVERRIDES = new Map([
  ['social', 'insect colony'],
  ['sociality', 'insect society'],
  ['termites', 'termite colony'],
  ['ants', 'ant colony'],
  ['bee', 'honeybee'],
  ['bees', 'honeybee colony'],
  ['patterns', 'behavior patterns'],
  ['nurture', 'care'],
  ['culture', 'culture'],
  ['freedom', 'freedom'],
  ['diverse', 'diverse groups'],
  ['dynamic', 'dynamic routines']
]);

const EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;

function buildAnalysisPrompt({ passage, passageNumber, variantIndex, retryNotes }) {
const guidance = [
  '당신은 대한민국 고등학교 영어 시험 출제위원입니다.',
  '결과물은 수능형 학습 분석 카드입니다. 분석적이고 중립적인 어조로 작성하고, 이모지·감탄사·격려 문구는 사용하지 마세요.',
  'sentenceAnalysis 배열의 각 항목에는 english, isTopicSentence, korean, analysis, background, example, grammar, vocabulary.words 필드를 반드시 포함합니다.',
  'english 필드에는 원문 문장을 그대로 적고, 주제문(isTopicSentence=true)은 **굵은 글씨**로 표시합니다.',
  'korean 필드는 "*** 한글 해석:"으로 시작하고 자연스럽게 번역된 문장을 한두 문장으로 정리합니다.',
  'analysis 필드는 "*** 분석:"으로 시작하고, 문장의 논리적 역할과 의미를 2~3문장으로 객관적으로 설명합니다.',
  'background 필드는 "*** 이 문장에 필요한 배경지식:"으로 시작하며, 교과/학문적 맥락이나 시험에서 알아야 할 개념을 2문장 이상 기술합니다. 실천 조언이나 감성 표현은 금지합니다.',
  'example 필드는 "*** 이 문장에 필요한 사례:"로 시작하고, 실제 적용 사례나 시험 제시문 유형을 2문장 이상 예시합니다. 학습 조언이나 감탄은 넣지 마세요.',
  'grammar 필드는 "✏️ 어법 포인트:"로 시작하고, 수능·모의고사에서 확인되는 구문·형태를 간결히 서술합니다.',
  'vocabulary.intro는 "*** 어휘 포인트:"로 시작하고, vocabulary.words에는 핵심 단어를 term·meaning·synonyms·antonyms 형식으로 제공합니다. 각 단어는 동의어 2~3개, 반의어 1~3개로 제한하고 활용 팁은 넣지 않습니다.',
  'meta.englishTitles에는 서로 다른 강조점을 담은 영어 제목 3개를 넣고, 각각 korean 번역을 제공하며 적어도 하나는 의문문이어야 합니다.',
  'meta.koreanMainIdea, meta.authorsClaim, meta.englishSummary, meta.englishSummaryKorean은 모두 시험식 요약 문장으로 작성합니다.',
  'meta.modernApplications에는 학습자가 개념을 점검할 때 참고할 수 있는 확인 질문이나 간단한 점검 과제를 2~3개 적습니다. 감성 표현은 금지합니다.',
  'JSON 외의 형식(마크다운 코드블록, 설명 문장 등)은 출력하지 말고, 하나의 JSON 객체만 반환하세요.'
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
      "korean": "*** 한글 해석: 자연스럽고 쉬운 해석을 덧붙이고 😊",
      "analysis": "*** 분석: 문장이 전달하는 핵심을 2~3문장으로 정리",
      "background": "*** 이 문장에 필요한 배경지식: 관련 교과/학문 정보를 소개",
      "example": "*** 이 문장에 필요한 사례: 실생활 예시를 2문장 이상 제시",
      "grammar": "✏️ 어법 포인트: 알아 두면 좋은 구문 1가지",
      "vocabulary": {
        "intro": "*** 어휘 포인트: 집중해서 외우면 좋은 단어",
        "words": [
          {
            "term": "핵심 단어",
            "meaning": "쉬운 뜻 설명",
            "synonyms": ["동의어 1", "동의어 2"],
            "antonyms": ["반의어"],
            "note": "간단한 활용 팁"
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
      { "title": "English Title 1", "korean": "한글 의미", "isQuestion": false },
      { "title": "English Title 2", "korean": "한글 의미", "isQuestion": false },
      { "title": "English Question Title?", "korean": "한글 의미", "isQuestion": true }
    ],
    "koreanTitle": "간단한 한글 제목",
    "koreanMainIdea": "저자의 핵심 주장",
    "authorsClaim": "작가가 전달하려는 메시지",
    "englishSummary": "짧고 정확한 영어 요약",
    "englishSummaryKorean": "위 영어 요약의 한국어 번역",
    "modernApplications": ["실천 팁 1", "실천 팁 2", "실천 팁 3"]
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
    const fastModeFlag = String(process.env.LOE_FAST_MODE || '').trim();
    const hasOpenAiKey = Boolean(OpenAI && process.env.OPENAI_API_KEY);
    this.fastMode = fastModeFlag === '1' || !hasOpenAiKey;
    this.openai = (!this.fastMode) && hasOpenAiKey
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

      const koreanRaw = this._sanitizeAcademicTone(String(entry?.korean || entry?.translation || ''));
      if (!koreanRaw) raise(`sentenceAnalysis[${idx + 1}] 한글 해석이 필요합니다.`);

      let analysisRaw = this._sanitizeAcademicTone(String(entry?.analysis || entry?.meaning || ''));
      if (!analysisRaw) raise(`sentenceAnalysis[${idx + 1}] 분석 필드를 채워 주세요.`);
      if (analysisRaw.length < 30) raise(`sentenceAnalysis[${idx + 1}] 분석을 30자 이상으로 구체화해 주세요.`);

      let backgroundRaw = this._sanitizeAcademicTone(String(entry?.background || entry?.note || ''));
      if (!backgroundRaw) raise(`sentenceAnalysis[${idx + 1}] 배경지식 항목이 비어 있습니다.`);
      if (backgroundRaw.length < 40) raise(`sentenceAnalysis[${idx + 1}] 배경지식을 40자 이상으로 작성해 주세요.`);

      let exampleRaw = this._sanitizeAcademicTone(String(entry?.example || ''));
      if (!exampleRaw) raise(`sentenceAnalysis[${idx + 1}] 사례 항목을 채워 주세요.`);
      if (exampleRaw.length < 40) raise(`sentenceAnalysis[${idx + 1}] 사례를 40자 이상으로 작성해 주세요.`);

      let grammarRaw = this._sanitizeAcademicTone(String(entry?.grammar || ''));
      if (!grammarRaw) raise(`sentenceAnalysis[${idx + 1}] 어법 포인트를 제시해 주세요.`);
      if (grammarRaw.length < 20) raise(`sentenceAnalysis[${idx + 1}] 어법 포인트를 20자 이상으로 설명해 주세요.`);

      const vocabularyEntries = Array.isArray(entry?.vocabulary?.words)
        ? entry.vocabulary.words.map(this._normalizeVocabularyWord)
        : this._normalizeLegacyVocabulary(entry);

      let vocabWords = vocabularyEntries
        .map((word) => ({
          term: this._sanitizeAcademicTone(String(word.term || '')),
          meaning: this._sanitizeAcademicTone(String(word.meaning || '')),
          synonyms: Array.isArray(word.synonyms)
            ? [...new Set(word.synonyms.map((syn) => this._sanitizeAcademicTone(syn)).filter(Boolean))]
            : [],
          antonyms: Array.isArray(word.antonyms)
            ? [...new Set(word.antonyms.map((ant) => this._sanitizeAcademicTone(ant)).filter(Boolean))]
            : []
        }))
        .filter((word) => word.term && word.meaning);

      if (vocabWords.length < 1) {
        raise(`sentenceAnalysis[${idx + 1}] 어휘 표에는 최소 한 개 이상의 핵심 단어를 넣어 주세요.`);
      }

      vocabWords = vocabWords.map((word, wordIdx) => {
        const synonyms = word.synonyms.slice(0, 3);
        const antonyms = word.antonyms.slice(0, 3);
        if (word.meaning.length < 6) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] meaning을 더 구체적으로 작성해 주세요.`);
        if (synonyms.length < 2) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] synonyms를 두 개 이상 채워 주세요.`);
        if (antonyms.length < 1) raise(`sentenceAnalysis[${idx + 1}] vocabulary.words[${wordIdx + 1}] antonyms를 최소 한 개 이상 채워 주세요.`);
        return {
          term: word.term,
          meaning: word.meaning,
          synonyms,
          antonyms
        };
      });

      const korean = this._sanitizeAcademicTone(this._ensurePrefixedLine(koreanRaw, '한글 해석'));
      const analysis = this._sanitizeAcademicTone(this._ensurePrefixedLine(analysisRaw, '분석'));
      const background = this._sanitizeAcademicTone(this._ensurePrefixedLine(backgroundRaw, '이 문장에 필요한 배경지식'));
      const example = this._sanitizeAcademicTone(this._ensurePrefixedLine(exampleRaw, '이 문장에 필요한 사례'));
      const grammar = this._sanitizeAcademicTone(this._ensureGrammarLine(grammarRaw));
      const vocabIntroSource = entry?.vocabulary?.intro || entry?.vocabularyIntro || '';
      const vocabIntro = this._sanitizeAcademicTone(
        vocabIntroSource
          ? this._ensurePrefixedLine(vocabIntroSource, '어휘 포인트')
          : this._buildVocabularyIntro(vocabWords)
      );

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

    const koreanTitleRaw = String(meta?.koreanTitle || '').trim();
    let koreanMainIdea = String(meta?.koreanMainIdea || meta?.koreanSummary || '').trim();
    if (!koreanMainIdea && koreanTitleRaw) {
      koreanMainIdea = koreanTitleRaw;
    }
    if (!koreanMainIdea) raise('koreanMainIdea 항목이 비어 있습니다. 지문의 주제를 한국어로 정리해 주세요.');
    if (koreanMainIdea.length < 25) raise('koreanMainIdea를 25자 이상으로 정리해 주세요.');
    const koreanTitle = koreanTitleRaw || koreanMainIdea;

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
    if (modernApplications.length < 2) {
      raise('modernApplications 항목에는 최소 2개의 실천 사례가 필요합니다.');
    }
    modernApplications.forEach((entry, idx) => {
      if (entry.length < 25) {
        raise(`modernApplications[${idx + 1}]을 25자 이상으로 구체적으로 작성해 주세요.`);
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
        koreanTitle,
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

  _sanitizeAcademicTone(value) {
    const text = String(value || '').replace(EMOJI_PATTERN, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
    return text.replace(/\s+/g, ' ').trim();
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
    const highlighted = terms.slice(0, 2).join(', ');
    const body = highlighted
      ? `이번 문장의 핵심 어휘 ${highlighted}의 의미와 관련 표현을 정리합니다.`
      : '이번 문장에서 출제 가능성이 높은 어휘의 뜻과 대응 표현을 정리합니다.';
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

    const keywordData = [];
    const sentenceAnalysis = [];

    for (let idx = 0; idx < sourceSentences.length; idx += 1) {
      const englishRaw = String(sourceSentences[idx] || '').trim();
      const topicSentence = idx === 0;
      const highlightedEnglish = topicSentence && !/^\*\*.*\*\*$/.test(englishRaw)
        ? `**${englishRaw.replace(/\*\*/g, '').trim()}**`
        : englishRaw;

      const keywords = this._extractFallbackKeywords(englishRaw, 4);
      const translation = await this._safeTranslateSentence(englishRaw, keywords);
      const koreanKeywords = await this._translateKeywords(keywords);

      keywordData.push({
        englishSentence: englishRaw,
        translation,
        keywords,
        koreanKeywords
      });

      const koreanLine = this._composeKoreanLine({
        translation,
        englishSentence: englishRaw,
        keywords,
        koreanKeywords,
        idx,
        total: totalSentences
      });

      const analysisRaw = this._composeSentenceAnalysis({
        translation,
        koreanKeywords,
        englishSentence: englishRaw,
        keywords,
        idx,
        total: totalSentences
      });

      const backgroundRaw = this._composeBackground(koreanKeywords, keywords, idx);
      const exampleRaw = this._composeExample(koreanKeywords, keywords, idx);
      const grammarRaw = this._composeGrammarNotes(englishRaw, idx);
      let vocabularyWords = await this._buildVocabularyEntries(keywords);
      if (!Array.isArray(vocabularyWords) || !vocabularyWords.length) {
        const fallbackTerm = keywords[0] || englishRaw.split(/\s+/)[0] || 'focus';
        vocabularyWords = [{
          term: fallbackTerm,
          meaning: `${fallbackTerm}의 의미를 다시 정리해 보세요.`,
          synonyms: ['core', 'key idea'],
          antonyms: ['opposite'],
          note: '사전에서 뜻과 예문을 찾아보면 도움이 돼요.'
        }];
      }
      // Enrich vocab entries to meet minimum quality (synonyms≥2, antonyms≥1, note≥8)
      const ensureVocabQuality = (entry) => {
        const term = String(entry?.term || '').trim() || (keywords[0] || 'focus');
        const meaning = String(entry?.meaning || '').trim() || `${term}의 핵심 의미를 정리해 보세요.`;
        const syn = Array.isArray(entry?.synonyms) ? entry.synonyms.filter(Boolean) : [];
        const ant = Array.isArray(entry?.antonyms) ? entry.antonyms.filter(Boolean) : [];
        while (syn.length < 2) {
          const candidates = ['core', 'key idea', 'main'];
          const pick = candidates[syn.length % candidates.length];
          if (!syn.includes(pick)) syn.push(pick);
        }
        if (ant.length < 1) ant.push('opposite');
        const note = (String(entry?.note || '').trim() || '예문과 함께 외우면 좋아요.');
        return { term, meaning, synonyms: syn.slice(0, 3), antonyms: ant.slice(0, 2), note };
      };
      vocabularyWords = vocabularyWords.map(ensureVocabQuality);

      // Ensure at least two vocab words with minimal fields filled
      if (vocabularyWords.length < 2) {
        const nextKeyword = (keywords[1] || keywords[0] || 'support');
        vocabularyWords.push(ensureVocabQuality({
          term: String(nextKeyword),
          meaning: `${nextKeyword}의 기본 뜻을 확인해 보세요.`,
          synonyms: ['related', 'connected'],
          antonyms: ['unrelated'],
          note: '예문 속 쓰임을 함께 비교해 보세요.'
        }));
      }
      vocabularyWords = vocabularyWords.slice(0, 2);
      const vocabularyIntro = this._buildVocabularyIntro(vocabularyWords);

      sentenceAnalysis.push({
        english: highlightedEnglish,
        isTopicSentence: topicSentence,
        korean: this._ensurePrefixedLine(koreanLine, '한글 해석'),
        analysis: this._ensurePrefixedLine(analysisRaw, '분석'),
        background: this._ensurePrefixedLine(backgroundRaw, '이 문장에 필요한 배경지식'),
        example: this._ensurePrefixedLine(exampleRaw, '이 문장에 필요한 사례'),
        grammar: this._ensureGrammarLine(grammarRaw),
        vocabulary: { intro: vocabularyIntro, words: vocabularyWords }
      });
    }

    const aggregatedKeywords = this._aggregateKeywordSummary(keywordData, 6);
    const meta = this._buildFallbackMeta({
      passageNumber,
      sentenceAnalysis,
      keywordData,
      aggregatedKeywords,
      failureNotes
    });

    return {
      passageNumber,
      variantIndex: 1,
      generatedAt: new Date().toISOString(),
      generator: 'fallback',
      sentenceAnalysis,
      meta
    };
  }

  async _safeTranslateSentence(sentence, keywords = []) {
    const trimmed = String(sentence || '').trim();
    if (!trimmed) return '';
    if (this.fastMode) return '';

    try {
      const translated = await translateText(trimmed, { target: 'ko' });
      if (translated) {
        return translated;
      }
    } catch (error) {
      console.warn('[analysis-fallback] translate error', error?.message || error);
    }
    return '';
  }

  async _translateKeywords(keywords = []) {
    const results = [];
    for (const keyword of keywords) {
      const normalized = this._normalizeKeyword(keyword);
      if (!normalized) {
        results.push('');
        continue;
      }
      const normalizedLower = normalized.toLowerCase();
      const gloss = translateGlossToKorean(normalizedLower);
      if (gloss) {
        results.push(gloss);
        continue;
      }
      if (this.fastMode) {
        const override = KEYWORD_KOREAN_OVERRIDES.get(normalizedLower);
        results.push(override || normalized);
        continue;
      }
      try {
        const translated = await translateText(normalized, { target: 'ko' });
        if (translated && translated.toLowerCase() !== normalizedLower) {
          results.push(translated);
          continue;
        }
      } catch (error) {
        console.warn('[analysis-fallback] keyword translate error', error?.message || error);
      }
      const override = KEYWORD_KOREAN_OVERRIDES.get(normalizedLower);
      results.push(override || normalized);
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

  _composeSentenceAnalysis({ koreanKeywords, englishSentence, keywords = [], idx, total }) {
    const keywordDisplay = this._deriveKeywordDisplay(koreanKeywords, keywords, '핵심 주제');
    const theme = this._labelAsTopic(keywordDisplay);
    const flowRole = this._describeFlowRole(idx, total);
    const summary = `${theme}를 중심으로 의미를 전개하며 ${flowRole}`.replace(/\s+/g, ' ').trim();
    return `*** 분석: ${summary}`;
  }

  _composeKoreanLine({ translation, englishSentence, keywords = [], koreanKeywords = [], idx = 0, total = 1 }) {
    const hasKoreanText = Boolean(translation) && /[가-힣]/.test(translation);
    const highlighted = hasKoreanText
      ? this._highlightKoreanText(this._truncateText(translation, 200), koreanKeywords)
      : '';
    if (highlighted) {
      return `*** 한글 해석: ${this._sanitizeAcademicTone(highlighted)}`;
    }

    const keywordDisplay = this._deriveKeywordDisplay(koreanKeywords, keywords, '이 문장');
    const fallback = `${keywordDisplay}의 의미를 정확한 우리말 문장으로 정리할 필요가 있습니다.`;
    return `*** 한글 해석: ${this._sanitizeAcademicTone(fallback)}`;
  }

  _truncateText(value = '', limit = 160) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, limit - 1)}…`;
  }

  _deriveKeywordDisplay(koreanKeywords = [], englishKeywords = [], fallback = '이 주제') {
    const koCandidate = (Array.isArray(koreanKeywords) ? koreanKeywords : []).find((val) => val && val.trim());
    if (koCandidate) return koCandidate.trim();

    const englishCandidate = (Array.isArray(englishKeywords) ? englishKeywords : []).find((val) => {
      const normalized = String(val || '').toLowerCase();
      return normalized && !KEYWORD_STOPWORDS.has(normalized);
    });
    if (englishCandidate) {
      const fallback = this._keywordToKoreanDisplay({ english: englishCandidate });
      if (fallback) return fallback;
      return this._capitalizeWord(String(englishCandidate || '').trim());
    }

    return fallback;
  }

  _decorateKeyword(term = '', suffix = '') {
    const clean = String(term || '').trim();
    if (!clean) return suffix ? `이 ${suffix}` : '이 주제';
    const stripped = clean.replace(/[“”"]/g, '');
    const isKorean = /[가-힣]/.test(stripped);
    const base = isKorean ? stripped : this._capitalizeWord(stripped);
    const wrapped = isKorean ? base : `“${base}”`;
    if (!suffix) {
      return wrapped;
    }
    if (/(주제|개념)$/.test(clean)) {
      return clean;
    }
    if (isKorean) {
      const framed = this._attachParticle(base, ['이라는', '라는']);
      return `${framed} ${suffix}`;
    }
    return `${wrapped}라는 ${suffix}`;
  }

  _keywordWithParticle(term = '', role = 'topic') {
    const clean = String(term || '').trim();
    if (!clean) {
      return role === 'object' ? '이 주제를' : '이 주제는';
    }

    if (/(주제|개념)(은|는|을|를)$/.test(clean)) {
      return clean;
    }
    if (/(주제|개념)$/.test(clean)) {
      return `${clean}${role === 'object' ? '를' : '는'}`;
    }

    const stripped = clean.replace(/[“”"]/g, '');
    if (/[가-힣]/.test(stripped)) {
      const particles = role === 'object' ? ['을', '를'] : ['은', '는'];
      return this._attachParticle(stripped, particles);
    }

    const suffix = role === 'object' ? '라는 주제를' : '라는 주제는';
    return `${clean}${suffix}`;
  }

  _attachParticle(word = '', [withBatchim, withoutBatchim] = ['은', '는']) {
    const clean = String(word || '').trim();
    if (!clean) {
      return withoutBatchim;
    }
    const lastChar = clean.charCodeAt(clean.length - 1);
    if (lastChar >= 0xac00 && lastChar <= 0xd7a3) {
      const hasBatchim = ((lastChar - 0xac00) % 28) !== 0;
      return `${clean}${hasBatchim ? withBatchim : withoutBatchim}`;
    }
    return `${clean}${withoutBatchim}`;
  }

  _labelAsTopic(term = '이 주제') {
    const decorated = this._decorateKeyword(term, '주제');
    return this._keywordWithParticle(decorated, 'object');
  }

  _collectKeywords(sentence = '', limit = 3) {
    const matches = String(sentence || '')
      .match(/\b[A-Za-z][A-Za-z'\-]{4,}\b/g)
      || [];
    if (!matches.length) return [];
    const unique = [];
    matches.forEach((word) => {
      const normalized = word.toLowerCase();
      if (!unique.some((entry) => entry.norm === normalized) && !KEYWORD_STOPWORDS.has(normalized)) {
        unique.push({ word, norm: normalized });
      }
    });
    if (!unique.length) return [];
    const numericLimit = Number.isFinite(Number(limit)) ? Number(limit) : 3;
    const sliceLimit = Math.max(1, numericLimit);
    return unique
      .slice(0, sliceLimit)
      .map((entry) => entry.word.replace(/^[a-z]/, (char) => char.toUpperCase()));
  }

  _aggregateKeywordSummary(keywordData = [], limit = 6) {
    const counts = new Map();
    const englishDisplay = new Map();
    const koreanDisplay = new Map();

    keywordData.forEach((entry) => {
      const keywords = Array.isArray(entry?.keywords) ? entry.keywords : [];
      const koreanKeywords = Array.isArray(entry?.koreanKeywords) ? entry.koreanKeywords : [];
      keywords.forEach((word, idx) => {
        const normalized = String(word || '').toLowerCase();
        if (!normalized || KEYWORD_STOPWORDS.has(normalized)) return;
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
        if (!englishDisplay.has(normalized)) {
          englishDisplay.set(normalized, this._capitalizeWord(String(word || '').trim()));
        }
        const koreanCandidate = String(koreanKeywords[idx] || translateGlossToKorean(word) || '').trim();
        if (koreanCandidate && !koreanDisplay.has(normalized)) {
          koreanDisplay.set(normalized, koreanCandidate);
        }
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, limit))
      .map(([word, count]) => ({
        english: englishDisplay.get(word) || this._capitalizeWord(word),
        korean: koreanDisplay.get(word) || '',
        count
      }));
  }

  _buildFallbackMeta({ passageNumber, sentenceAnalysis = [], keywordData = [], aggregatedKeywords = [], failureNotes = [] }) {
    const topKeyword = aggregatedKeywords[0] || { english: 'People', korean: '사람들' };
    const secondaryKeyword = aggregatedKeywords[1] || null;
    const topicKo = this._keywordToKoreanDisplay(topKeyword) || '주요 주제';
    const contrastKo = secondaryKeyword ? this._keywordToKoreanDisplay(secondaryKeyword) : '';
    const topicEnBase = this._keywordToEnglishLabel(topKeyword.english || 'human');
    const contrastEnBase = this._keywordToEnglishLabel(secondaryKeyword?.english || 'insect colony');
    const topicEnPlural = this._capitalizeWord(this._pluralizeKeyword(topicEnBase));
    const contrastEnPlural = this._capitalizeWord(this._pluralizeKeyword(contrastEnBase));
    const koreanTitleText = contrastKo
      ? `${topicKo}와 ${contrastKo}를 비교해 본문 흐름을 정리해요`
      : `${topicKo}의 핵심 메시지를 한눈에 정리해요`;

    const firstAnalysis = this._firstSentence(this._stripPrefixedLine(sentenceAnalysis[0]?.analysis));
    const middleIndex = Math.max(1, Math.floor(sentenceAnalysis.length / 2));
    const middleAnalysis = this._firstSentence(this._stripPrefixedLine(sentenceAnalysis[middleIndex]?.analysis));
    const lastAnalysis = this._firstSentence(this._stripPrefixedLine(sentenceAnalysis[sentenceAnalysis.length - 1]?.analysis));

    const comparisonLabel = contrastKo
      ? `${this._attachParticle(topicKo, ['과', '와'])} ${contrastKo}`
      : topicKo;
    const firstLabel = this._keywordToKoreanDisplay({
      korean: keywordData[0]?.koreanKeywords?.[0],
      english: keywordData[0]?.keywords?.[0]
    });
    const middleLabel = this._keywordToKoreanDisplay({
      korean: keywordData[middleIndex]?.koreanKeywords?.[0],
      english: keywordData[middleIndex]?.keywords?.[0]
    });
    const lastLabel = this._keywordToKoreanDisplay({
      korean: keywordData[keywordData.length - 1]?.koreanKeywords?.[0],
      english: keywordData[keywordData.length - 1]?.keywords?.[0]
    });

    const deepDive = {
      coreMessage: `${comparisonLabel}의 차이를 보여 주면서 인간 사회가 학습과 문화 덕분에 얼마나 유연해지는지 설명하는 글이에요. 두 소재를 함께 보며 우리 관계가 어떻게 설계되는지 떠올려 보세요.`,
      logicalFlow: `첫 문장은 ${this._describeFlowSummary(firstLabel, 'first')} 이어지는 문단은 ${this._describeFlowSummary(middleLabel, 'middle')} 마지막 문장은 ${this._describeFlowSummary(lastLabel, 'last')}`,
      toneAndStyle: `${contrastKo ? `${contrastKo} 같은 본능적 패턴과` : '타 주제의 사례와'} 대비하며 ${this._attachParticle(topicKo, ['을', '를'])} 차분하고 다정한 설명으로 풀어 주는 비교형 서술이에요.`
    };

    const contrastDescriptor = /coloni/i.test(contrastEnPlural)
      ? contrastEnPlural
      : `${contrastEnPlural} communities`;
    const topicDescriptor = /people|humans|learners|students|teenagers/i.test(topicEnPlural.toLowerCase())
      ? topicEnPlural
      : `${topicEnPlural} groups`;

    const englishSummary = contrastKo
      ? `The passage contrasts highly programmed ${contrastDescriptor} with the flexible, nurture-driven ways ${topicDescriptor} sustain relationships across generations.`
      : `The passage explains how ${topicDescriptor} reshape their bonds through nurture and culture, highlighting the freedom to adapt across generations.`;

    const englishSummaryKorean = contrastKo
      ? `이 글은 ${contrastKo}처럼 정해진 사회와 달리 ${this._attachParticle(topicKo, ['이', '가'])} 양육과 문화에 따라 유연하게 관계를 유지한다고 설명해요.`
      : `이 글은 ${this._attachParticle(topicKo, ['이', '가'])} 양육과 문화가 만든 자유로운 패턴으로 관계를 발전시킨다고 알려 줍니다.`;

    const modernApplications = this._buildModernApplicationsFromTheme({ topicKo, contrastKo });

    const englishTitles = this._ensureEnglishTitles([], {
      englishSummary,
      englishSummaryKorean,
      koreanMainIdea: `${topicKo}이(가) 문화와 학습으로 사회를 만들어 가는 방식을 살펴봅니다.`,
      authorsClaim: `${topicKo}이(가) 스스로 패턴을 조정하며 신뢰를 지킨다는 필자의 메시지를 기억해 보세요.`,
      passageNumber
    });

    return {
      deepDive,
      englishTitles,
      koreanTitle: koreanTitleText,
      koreanMainIdea: `${this._attachParticle(topicKo, ['이', '가'])} 문화와 학습을 통해 사회성을 키운다고 알려 주는 글입니다.`,
      authorsClaim: `저자는 ${this._attachParticle(topicKo, ['이', '가'])} 서로의 행동을 조정하고 배울 때 공동체가 따뜻해진다고 강조합니다.`,
      englishSummary,
      englishSummaryKorean,
      modernApplications,
      rescueNotes: Array.isArray(failureNotes) ? failureNotes.slice(0, 6) : []
    };
  }

  _stripPrefixedLine(value = '') {
    let stripped = String(value || '').replace(/^\*{0,3}\s*[^:：]+[:：]\s*/u, '').trim();
    stripped = stripped.replace(/^💡\s*/, '').trim();
    stripped = stripped.replace(/^우리말로 옮기면 “[^”]+”이라는 뜻이에요\.\s*/u, '').trim();
    return stripped;
  }

  _keywordToKoreanDisplay(keyword = {}) {
    const predefined = String(keyword?.korean || '').trim();
    if (predefined) return predefined;
    const english = String(keyword?.english || '').trim();
    if (!english) return '';
    const override = KEYWORD_KOREAN_OVERRIDES.get(english.toLowerCase());
    if (override) return override;
    const gloss = translateGlossToKorean(english);
    if (gloss) return gloss;
    return this._capitalizeWord(english);
  }

  _keywordToEnglishLabel(word = '') {
    const clean = String(word || '').trim();
    if (!clean) return 'group';
    const override = ENGLISH_LABEL_OVERRIDES.get(clean.toLowerCase());
    if (override) return override;
    return clean;
  }

  _firstSentence(text = '') {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const match = clean.match(/[^.!?]+[.!?]?/);
    return match ? match[0].trim() : clean;
  }

  _pluralizeKeyword(word = '') {
    const clean = String(word || '').trim();
    if (!clean) return 'people';
    const lower = clean.toLowerCase();
    if (clean.includes(' ')) {
      const parts = clean.split(/\s+/);
      const last = parts.pop();
      const pluralLast = this._pluralizeKeyword(last);
      return [...parts, pluralLast].join(' ');
    }
    if (lower === 'people') return 'people';
    if (lower === 'person') return 'people';
    if (lower === 'human') return 'humans';
    if (lower === 'humans') return 'humans';
    if (lower === 'society') return 'societies';
    if (lower === 'societies') return 'societies';
    if (/(al|ive|ous|ful|less|ing|ic)$/i.test(lower)) return clean;
    if (/s$/i.test(clean)) return clean;
    if (/y$/i.test(clean)) {
      return `${clean.slice(0, -1)}ies`;
    }
    return `${clean}s`;
  }

  _buildModernApplicationsFromTheme({ topicKo, contrastKo }) {
    const applications = [];
    const topicLabel = topicKo || '주요 주제';
    const contrastLabelRaw = contrastKo || '정해진 규칙이 많은 사례';
    const contrastLabel = /[가-힣]/.test(contrastLabelRaw)
      ? this._attachParticle(contrastLabelRaw, ['과', '와'])
      : `${contrastLabelRaw}와`;
    applications.push(`${topicLabel} 관점에서 사례를 분류하고 변화 요인을 표로 정리하십시오.`);
    applications.push(`${contrastLabel} 대비하여 자율적으로 조정 가능한 규칙과 고정된 요소를 구분해 보십시오.`);
    applications.push(`${topicLabel} 관련 기출 문항을 찾아 근거 제시 방식과 논리 전개를 비교 분석하십시오.`);
    return applications.slice(0, 3);
  }

  _describeFlowSummary(keyword, position = 'middle') {
    const label = String(keyword || '').trim();
    const topicPhrase = this._formatFlowPhrase(label, 'object', '주제');
    switch (position) {
      case 'first':
        return `${topicPhrase} 소개해 글의 방향을 설정합니다.`;
      case 'last':
        return `${topicPhrase} 다시 환기하며 글을 마무리합니다.`;
      default:
        return `${topicPhrase} 예시와 연결하며 논지를 확장합니다.`;
    }
  }

  _formatFlowPhrase(label, role = 'object', suffix = '주제') {
    const clean = String(label || '').trim();
    if (!clean) {
      return role === 'topic' ? '글의 내용이' : '내용을';
    }

    if (/(다)$/.test(clean) && /[가-힣]/.test(clean)) {
      const stem = clean.replace(/다$/, '');
      const base = `${stem}는 태도`;
      return role === 'topic' ? `${base}가` : `${base}를`;
    }

    const decorated = this._decorateKeyword(clean, suffix);
    if (role === 'topic') {
      return this._keywordWithParticle(decorated, 'topic');
    }
    return this._keywordWithParticle(decorated, 'object');
  }

  _describeFlowRole(idx, total) {
    if (idx === 0) {
      return '글의 도입부에서 주제를 제시합니다.';
    }
    if (idx === total - 1) {
      return '결말에서 앞 문장을 정리하며 논지를 마무리합니다.';
    }
    return '중간에서 앞 문장을 이어 받아 세부 근거를 보강합니다.';
  }

  _composeBackground(koreanKeywords = [], englishKeywords = [], idx = 0) {
    const blueprint = this._selectContextBlueprint(englishKeywords);
    const keywordLabel = this._deriveKeywordDisplay(koreanKeywords, englishKeywords, '이 주제');
    const decorated = this._decorateKeyword(keywordLabel, '주제');
    const backgrounds = Array.isArray(blueprint?.background) && blueprint.background.length
      ? blueprint.background
      : [
          `${decorated}와 관련된 핵심 개념을 교과서에서 다시 확인하면 문맥이 분명해집니다.`,
          `${decorated}가 논의된 대표적 사례(역사·사회·과학)를 정리하면 필자의 논리가 선명해집니다.`
        ];
    return this._sanitizeAcademicTone(backgrounds[idx % backgrounds.length]
      .replace(/이 주제/g, decorated)
      .replace(/이 개념/g, decorated));
  }

  _composeExample(koreanKeywords = [], englishKeywords = [], idx = 0) {
    const blueprint = this._selectContextBlueprint(englishKeywords);
    const keywordLabel = this._deriveKeywordDisplay(koreanKeywords, englishKeywords, '이 개념');
    const decorated = this._decorateKeyword(keywordLabel, '개념');
    const examples = Array.isArray(blueprint?.example) && blueprint.example.length
      ? blueprint.example
      : [
          `${decorated}이 적용된 학교·사회 사례를 확인하면 세부 근거 파악에 도움이 됩니다.`,
          `${decorated}을 다룬 학술 기사나 통계 자료를 비교하면 추론·적용 문제에 대비할 수 있습니다.`
        ];
    return this._sanitizeAcademicTone(examples[idx % examples.length]
      .replace(/이 개념/g, decorated)
      .replace(/이 주제/g, decorated));
  }

  _composeGrammarNotes(sentence = '', idx = 0) {
    const features = this._identifyGrammarFeatures(sentence);
    if (!features.length) {
      const fallbackMessages = [
        '주어와 동사의 일치를 확인하고 시제 변화를 체크하십시오.',
        '쉼표와 접속사를 기준으로 절을 나누면 문장 구조가 선명해집니다.',
        '핵심 단어와 수식 관계를 표시해 두면 시험형 어법 문항을 대비할 수 있습니다.'
      ];
      return fallbackMessages[idx % fallbackMessages.length];
    }
    const detail = features.join(' ');
    return `✏️ ${detail}`;
  }

  _identifyGrammarFeatures(sentence = '') {
    const lower = String(sentence || '').toLowerCase();
    const features = [];
    if (/^when\s/.test(lower)) {
      features.push('When으로 시작한 부사절이 조건을 먼저 제시하고 주절에서 결과를 설명합니다.');
    }
    if (/^by\s+[a-z\-]+ing/.test(lower) || /,\s*by\s+[a-z\-]+ing/.test(lower)) {
      features.push('By + 동명사 구조가 “~함으로써” 의미를 만들어 인과관계를 형성합니다.');
    }
    if (/it\s+is\s+(very\s+)?important\s+to/i.test(sentence)) {
      features.push('It is + 형용사 + to부정사 구조는 가주어 it과 진주어 to부정사를 사용하는 표현입니다.');
    }
    if (/self-/.test(lower)) {
      features.push('self- 접두사가 붙은 명사는 “자기 자신과 관련된” 의미를 강조합니다.');
    }
    if (/\bbe\s+[a-z]+ed\b/.test(lower)) {
      features.push('be + 과거분사 형태가 수동태를 이루어 행위의 대상을 부각합니다.');
    }
    if (!features.length && sentence.includes(',')) {
      features.push('콤마(,)로 절을 구분해 병렬 구조나 삽입을 파악해야 합니다.');
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
      meaning = (meaning || '').replace(/\s+/g, ' ').trim();
      if (!meaning) {
        const display = this._keywordToKoreanDisplay({ english: term });
        meaning = display ? `${display} 의미` : `${term}의 의미를 우리말로 정리해 보세요.`;
      }
      if (/의 의미를 우리말로 정리해 보세요\.$/.test(meaning)) {
        const display = this._keywordToKoreanDisplay({ english: term });
        if (display) {
          meaning = `${display} 의미`;
        }
      }

      let synonyms;
      if (this.fastMode) {
        synonyms = override?.synonyms || this._buildFallbackSynonyms(term);
      } else {
        synonyms = override?.synonyms || await this._getWordnetSynonyms(term);
      }
      synonyms = this._finalizeSynonymList(term, synonyms);

      let antonyms;
      if (this.fastMode) {
        antonyms = override?.antonyms || this._buildFallbackAntonyms(term);
      } else {
        antonyms = override?.antonyms || await this._getWordnetAntonyms(term);
      }
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
      const fallback = FALLBACK_SYNONYM_MAP.get(normalizedTerm);
      if (fallback) {
        fallback.forEach((item) => unique.add(this._capitalizeWord(item)));
      }
    }
    if (unique.size < 2) {
      unique.add(this._capitalizeWord(`related ${normalizedTerm}`));
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
      const fallback = FALLBACK_ANTONYM_MAP.get(normalizedTerm);
      if (fallback && fallback.length) {
        fallback.forEach((item) => unique.add(this._capitalizeWord(item)));
      }
    }
    if (!unique.size) {
      unique.add(this._capitalizeWord(`opposite of ${normalizedTerm}`));
    }
    return Array.from(unique).slice(0, 2);
  }

  _buildFallbackSynonyms(term = '') {
    const normalized = String(term || '').toLowerCase().trim();
    if (!normalized) return [];
    const preset = FALLBACK_SYNONYM_MAP.get(normalized);
    if (preset && preset.length) {
      return preset;
    }
    return [
      `similar ${normalized}`,
      `${normalized} idea`,
      `core ${normalized}`
    ];
  }

  _buildFallbackAntonyms(term = '') {
    const normalized = String(term || '').toLowerCase().trim();
    if (!normalized) return [];
    const preset = FALLBACK_ANTONYM_MAP.get(normalized);
    if (preset && preset.length) {
      return preset;
    }
    return [`opposite of ${normalized}`];
  }

  _composeVocabularyNote(term, meaning) {
    const cleanMeaning = String(meaning || '').replace(/\s+/g, ' ').trim();
    return `${term}라는 표현은 ${cleanMeaning}라는 뜻이에요. 짧은 예문을 직접 만들어 친구와 서로 피드백해 보세요. ✍️`;
  }

  async _getWordnetSynonyms(term) {
    if (this.fastMode) return [];
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
    if (this.fastMode) return [];
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
    const cleaned = String(sentence || '').trim();
    // 키워드가 없으면 중립 설명으로 처리
    if (!Array.isArray(keywords) || keywords.length === 0) {
      // 문장 위치에 따른 기본 설명(주제문/설명/마무리)
      if (/^[A-Z]/.test(cleaned)) return '주제를 제시하며 글의 방향을 잡아 주는 문장입니다.';
      if (/for example|for instance|e\.g\./i.test(cleaned)) return '앞선 내용을 뒷받침하는 구체적 예시를 제시하는 문장입니다.';
      return '앞 문장을 이어 받아 내용을 구체화하고 흐름을 자연스럽게 연결하는 문장입니다.';
    }
    const mainKeyword = (koreanKeywords.find((v) => v) || keywords[0]).toString();
    const secondKeyword = (koreanKeywords.slice(1).find((v) => v) || keywords[1] || '').toString();
    if (secondKeyword && secondKeyword !== mainKeyword) {
      return `${mainKeyword}와 ${secondKeyword}의 관계를 보여 주며 내용을 확장하는 문장입니다.`;
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
    return this._collectKeywords(sentence, limit || 2);
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
    let hasQuestion = false;

    const push = (title, korean, isQuestion = false) => {
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) return;
      const normalized = cleanTitle.toLowerCase().replace(/\?+$/, '');
      if (seen.has(normalized)) return;
      const cleanKorean = String(korean || '').trim() || fallbackKorean;
      const normalizedTitle = cleanTitle.replace(/\?+$/, '');
      const finalTitle = (isQuestion || /\?$/.test(cleanTitle)) ? `${normalizedTitle}?` : normalizedTitle;
      const questionFlag = finalTitle.endsWith('?');
      results.push({
        title: finalTitle,
        korean: cleanKorean,
        isQuestion: questionFlag
      });
      seen.add(finalTitle.toLowerCase().replace(/\?+$/, ''));
      if (questionFlag) {
        hasQuestion = true;
      }
    };

    (Array.isArray(existing) ? existing : []).forEach((item) => {
      push(item?.title, item?.korean, item?.isQuestion);
    });

    const englishSummary = String(meta.englishSummary || '').trim().replace(/\s+/g, ' ');
    const trimmedSummary = englishSummary ? englishSummary.replace(/\.$/, '') : '';
    if (trimmedSummary) {
      push(trimmedSummary, meta.englishSummaryKorean, false);
    }

    if (results.length < 3 && trimmedSummary) {
      const summaryWords = trimmedSummary.split(/\s+/);
      const snippet = summaryWords.slice(0, Math.min(6, summaryWords.length)).join(' ');
      if (snippet && snippet.toLowerCase() !== trimmedSummary.toLowerCase()) {
        push(`Key Insight: ${snippet}`, meta.englishSummaryKorean, false);
      }
    }

    if (!hasQuestion) {
      const questionTitle = trimmedSummary
        ? `Why Does This Passage Highlight ${this._capitalizeWord(trimmedSummary.split(/\s+/)[0] || 'Its Message')}?`
        : 'Why Does This Passage Matter?';
      push(questionTitle, fallbackKorean, true);
    }

    if (results.length < 3) {
      push('From Insight to Action', fallbackKorean, false);
    }

    const fallbackPool = [
      { title: 'Professor\'s Highlight', korean: fallbackKorean },
      { title: 'Guided Reading Focus', korean: fallbackKorean }
    ];
    fallbackPool.forEach((item) => {
      if (results.length < 3) {
        push(item.title, item.korean, false);
      }
    });

    while (results.length < 3) {
      push(`Learning Spotlight ${results.length + 1}`, fallbackKorean, false);
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
