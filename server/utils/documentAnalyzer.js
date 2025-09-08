/**
 * DocumentAnalyzer
 * Uses OpenAI to analyze passages with rich, structured output
 */

let OpenAI;
try { OpenAI = require('openai'); } catch {}

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

    const prompt = `당신은 한국의 영어 교육 전문가입니다. 아래 영어 지문을 매우 자세히 분석하세요.

항목:
1) 문장별 분석: 각 문장마다 영어원문, 직역(한국어), 의미해석, 생생한 예시, 추가 설명, 필요시 배경지식
2) 심화 해설: 글의 핵심 주장/구조/전개, 문맥과 톤, 중요한 암시 등
3) 핵심 표현: expression, meaning, synonyms, antonyms (연어/관용 포함)
4) 예시/배경: 학습에 도움 되는 예시 2~3개, 배경지식 설명
5) 종합 메타: englishTitle, koreanSummary, authorsClaim, finalSummary (마무리에 가끔 이모지 포함)

분석 대상 지문 No.${passageNumber}:
${passage}

출력 형식(JSON만 반환):
{
  "passageNumber": ${passageNumber},
  "sentenceAnalysis": [
    { "english": "문장", "translation": "직역", "meaning": "의미해석", "example": "예시", "note": "추가설명/배경" }
  ],
  "deepAnalysis": { "interpretation": "핵심 해설", "context": "문맥", "commentary": "자세한 설명" },
  "keyExpressions": [ { "expression": "표현", "meaning": "뜻", "synonyms": ["유의어"], "antonyms": ["반의어"] } ],
  "examplesAndBackground": { "examples": ["예시1", "예시2"], "background": "배경지식" },
  "comprehensive": { "englishTitle": "영어 제목", "koreanSummary": "한줄 요지", "authorsClaim": "작가 주장", "finalSummary": "영요약 + 이모지" }
}`;

    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = (resp.choices?.[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim();
    const obj = JSON.parse(text);
    obj.originalPassage = passage;
    return obj;
  }

  async analyzeIndividualPassagesLegacy(content, options = {}) {
    return this.analyzeIndividualPassages(content, options);
  }

  formatForDatabase(analysisResult) {
    if (analysisResult.sentenceAnalysis) {
      return {
        summary: analysisResult.comprehensive?.finalSummary || '',
        key_points: JSON.stringify(analysisResult.sentenceAnalysis || []),
        vocabulary: JSON.stringify(analysisResult.keyExpressions || []),
        grammar_points: JSON.stringify(analysisResult.deepAnalysis || {}),
        study_guide: JSON.stringify(analysisResult.examplesAndBackground || {}),
        comprehension_questions: JSON.stringify(analysisResult.comprehensive || {})
      };
    }
    return {
      summary: analysisResult.summary || '',
      key_points: JSON.stringify(analysisResult.keyPoints || []),
      vocabulary: JSON.stringify(analysisResult.vocabulary || []),
      grammar_points: JSON.stringify(analysisResult.grammarPoints || []),
      study_guide: analysisResult.studyGuide || '',
      comprehension_questions: JSON.stringify(analysisResult.comprehensionQuestions || [])
    };
  }

  formatFromDatabase(dbResult) {
    return {
      id: dbResult.id,
      documentId: dbResult.document_id,
      passageNumber: dbResult.passage_number,
      originalPassage: dbResult.original_passage,
      sentenceAnalysis: JSON.parse(dbResult.key_points || '[]'),
      deepAnalysis: JSON.parse(dbResult.grammar_points || '{}'),
      keyExpressions: JSON.parse(dbResult.vocabulary || '[]'),
      examplesAndBackground: JSON.parse(dbResult.study_guide || '{}'),
      comprehensive: JSON.parse(dbResult.comprehension_questions || '{}'),
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
}

module.exports = DocumentAnalyzer;

