/**
 * DocumentAnalyzer
 * Uses OpenAI to analyze passages with rich, structured output
 */

let OpenAI;
try { OpenAI = require('openai'); } catch {}

const MAX_VARIANTS_PER_PASSAGE = 2;

const ANALYSIS_PROMPT_TEMPLATE = ({ passage, passageNumber }) => `당신은 대한민국 최고의 영어 교수님이자 따뜻한 담임 선생님이에요. 초등학생도 이해할 수 있도록 아주 천천히, 대화하듯 자연스럽게 설명해주세요. 필요한 곳에는 이모지도 가볍게 써서 격려해 주세요.

분석 대상 지문 번호: ${passageNumber}

출력 형식은 JSON만 가능하며, 반드시 아래 키와 구조를 지켜주세요. 설명은 모두 존댓말/대화체, 한 호흡으로 이어지는 강의 스타일로 작성해 주세요.

{
  "variantIndex": 1,
  "sentenceAnalysis": [
    {
      "english": "원문 한 문장",
      "isTopicSentence": true,
      "korean": "아주 쉬운 한글 해석",
      "analysis": "핵심 의미와 글 속 역할을 친절하게 설명",
      "background": "필요한 철학/과학/역사/사회 등 배경 지식 (없으면 간단한 격려)",
      "example": "현실에서 바로 떠올릴 수 있는 생생한 사례",
      "grammar": "어려운 구문이나 어법을 풀어주는 설명",
      "vocabulary": {
        "words": [
          {
            "term": "중요 단어 또는 표현",
            "meaning": "뜻",
            "synonyms": ["동의어"],
            "antonyms": ["반의어"],
            "note": "추가 설명이나 콜로케이션"
          }
        ]
      }
    }
  ],
  "meta": {
    "deepDive": {
      "coreMessage": "지문 전체 핵심",
      "logicalFlow": "문단 흐름과 연결",
      "toneAndStyle": "글의 톤·특징·수사법"
    },
    "englishTitles": [
      { "title": "영어 제목 1", "korean": "한국어 해석", "isQuestion": false },
      { "title": "영어 제목 2", "korean": "한국어 해석", "isQuestion": true },
      { "title": "영어 제목 3", "korean": "한국어 해석", "isQuestion": false }
    ],
    "koreanMainIdea": "저자의 핵심 주장",
    "authorsClaim": "작가가 전달하려는 메시지",
    "englishSummary": "짧고 정확한 한 문장 영어 요약",
    "englishSummaryKorean": "위 영어 요약의 한글 해석",
    "modernApplications": [
      "현대 사회에서 적용할 수 있는 사례 1",
      "현대 사회에서 적용할 수 있는 사례 2"
    ]
  }
}

규칙:
- 모든 문장을 빠짐없이 sentenceAnalysis 배열에 담아주세요.
- 주제문은 isTopicSentence를 true로 표시하고, 설명에서도 ⭐ 등으로 강조해 주세요.
- 각 설명은 초등학생도 이해할 수 있도록 부드러운 존댓말로 작성해주세요.
- grammar, background, example은 비어 있지 않게 꼭 채워주세요 (없다면 왜 없는지 친절히 적어주세요).
- modernApplications에는 최소 2개 이상의 현실 사례를 제공해주세요.
- JSON 이외의 말(코드펜스, 설명 문장 등)은 절대 출력하지 마세요.

분석할 지문:
${passage}`;

class DocumentAnalyzer {
  constructor() {
    this.openai = OpenAI && process.env.OPENAI_API_KEY
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
    if (!this.openai) throw new Error('OpenAI not configured');

    const prompt = ANALYSIS_PROMPT_TEMPLATE({ passage, passageNumber });

    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.55,
      max_tokens: 3200,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = (resp.choices?.[0]?.message?.content || '').trim();
    const clean = raw.replace(/```json\s*|```/g, '');
    const parsed = JSON.parse(clean);
    const normalized = this._normalizeVariantPayload(parsed, passageNumber);
    normalized.originalPassage = passage;
    return normalized;
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

  _normalizeVariantPayload(raw, passageNumber) {
    const variantIndex = Number(raw?.variantIndex) || 1;
    const sentenceAnalysis = Array.isArray(raw?.sentenceAnalysis) ? raw.sentenceAnalysis.map((entry, idx) => ({
      english: String(entry?.english || '').trim(),
      isTopicSentence: Boolean(entry?.isTopicSentence) || idx === 0,
      korean: String(entry?.korean || entry?.translation || '').trim(),
      analysis: String(entry?.analysis || entry?.meaning || '').trim(),
      background: String(entry?.background || entry?.note || '').trim(),
      example: String(entry?.example || '').trim(),
      grammar: String(entry?.grammar || '').trim(),
      vocabulary: {
        words: Array.isArray(entry?.vocabulary?.words)
          ? entry.vocabulary.words.map(this._normalizeVocabularyWord)
          : this._normalizeLegacyVocabulary(entry)
      }
    })).filter(item => item.english) : [];

    const meta = raw?.meta || raw?.comprehensive || {};
    const normalizedMeta = {
      deepDive: {
        coreMessage: String(meta?.deepDive?.coreMessage || meta?.interpretation || '').trim(),
        logicalFlow: String(meta?.deepDive?.logicalFlow || meta?.context || '').trim(),
        toneAndStyle: String(meta?.deepDive?.toneAndStyle || meta?.commentary || '').trim()
      },
      englishTitles: Array.isArray(meta?.englishTitles) ? meta.englishTitles.map((titleEntry, idx) => ({
        title: String(titleEntry?.title || titleEntry).trim(),
        korean: String(titleEntry?.korean || '').trim(),
        isQuestion: Boolean(titleEntry?.isQuestion) || /\?$/.test(String(titleEntry?.title || titleEntry || '')) || idx === 1
      })) : this._generateFallbackTitles(meta),
      koreanMainIdea: String(meta?.koreanMainIdea || meta?.koreanSummary || '').trim(),
      authorsClaim: String(meta?.authorsClaim || '').trim(),
      englishSummary: String(meta?.englishSummary || meta?.finalSummary || '').trim(),
      englishSummaryKorean: String(meta?.englishSummaryKorean || '').trim(),
      modernApplications: Array.isArray(meta?.modernApplications)
        ? meta.modernApplications.map((item) => String(item || '').trim()).filter(Boolean)
        : this._normalizeLegacyApplications(raw)
    };

    return {
      passageNumber,
      variantIndex,
      generatedAt: new Date().toISOString(),
      generator: 'openai',
      sentenceAnalysis,
      meta: normalizedMeta
    };
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
