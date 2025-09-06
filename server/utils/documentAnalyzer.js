/**
 * 문서 분석 생성기
 * 업로드된 영어 문서를 AI로 분석하여 핵심 정보 추출
 */

const OpenAI = require('openai');

class DocumentAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * 개별 지문 분석 (새로운 방식)
   * @param {string} content - 문서 내용 (JSON 문자열)
   * @param {Object} options - 분석 옵션
   */
  async analyzeIndividualPassages(content, options = {}) {
    try {
      console.log('🔍 개별 지문 분석 시작...');
      
      // JSON 파싱
      let passages = [];
      try {
        const parsedContent = JSON.parse(content);
        passages = parsedContent.passages || [];
      } catch (e) {
        throw new Error('문서 형식이 올바르지 않습니다.');
      }

      if (passages.length === 0) {
        throw new Error('분석할 지문이 없습니다.');
      }

      console.log(`📚 총 ${passages.length}개 지문 개별 분석 진행`);
      
      const analysisResults = [];
      
      for (let i = 0; i < passages.length; i++) {
        const passage = passages[i];
        console.log(`🔍 지문 ${i + 1}/${passages.length} 분석 중...`);
        
        const analysisResult = await this.analyzeIndividualPassage(passage, i + 1);
        analysisResults.push(analysisResult);
        
        // API 요청 간 간격
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ 모든 지문 분석 완료');
      return analysisResults;
      
    } catch (error) {
      console.error('❌ 개별 지문 분석 실패:', error);
      throw error;
    }
  }

  /**
   * 단일 지문 분석
   * @param {string} passage - 개별 지문
   * @param {number} passageNumber - 지문 번호
   */
  async analyzeIndividualPassage(passage, passageNumber) {
    const analysisPrompt = `
당신은 영어 교육 전문가입니다. 다음 영어 지문을 상세히 분석해주세요.

🎯 분석 항목:
1. 📝 **문장별 분석** (각 문장의 직역과 의미)
2. 🔍 **의미/분석/해설** (지문의 깊이 있는 해석)
3. 💡 **핵심표현 & 동의어/반의어** (중요 표현과 관련 어휘)
4. 📚 **예시/배경지식** (관련 예문과 배경 정보)
5. 📖 **종합 정리** (영어제목, 한글요지, 작가의 주장, 최종 요약문)

📋 **분석할 지문 (${passageNumber}번):**
${passage}

⚠️ **출력 형식:** 정확한 JSON 형태로 반환해주세요.
{
  "passageNumber": ${passageNumber},
  "sentenceAnalysis": [
    {
      "english": "영어 문장",
      "translation": "직역",
      "meaning": "의미 해석"
    }
  ],
  "deepAnalysis": {
    "interpretation": "지문의 심층 해석",
    "context": "문맥적 의미",
    "commentary": "해설"
  },
  "keyExpressions": [
    {
      "expression": "핵심 표현",
      "meaning": "의미",
      "synonyms": ["동의어1", "동의어2"],
      "antonyms": ["반의어1", "반의어2"]
    }
  ],
  "examplesAndBackground": {
    "examples": ["예시 문장1", "예시 문장2"],
    "background": "배경 지식 설명"
  },
  "comprehensive": {
    "englishTitle": "영어 제목",
    "koreanSummary": "한글 요지",
    "authorsClaim": "작가의 주장",
    "finalSummary": "최종 요약문"
  }
}`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.7,
      max_tokens: 3000
    });

    const responseText = completion.choices[0].message.content;
    
    try {
      // ```json 태그 제거
      const cleanJson = responseText.replace(/```json\n?|```\n?/g, '').trim();
      const analysisResult = JSON.parse(cleanJson);
      analysisResult.originalPassage = passage; // 원문 저장
      return analysisResult;
    } catch (parseError) {
      console.error('❌ JSON 파싱 실패:', parseError);
      console.error('원본 응답:', responseText.substring(0, 500));
      throw new Error('AI 응답 파싱 실패');
    }
  }

  /**
   * 종합 문서 분석 (기존 방식)
   * @param {string} content - 문서 내용 (JSON 문자열 또는 일반 텍스트)
   * @param {Object} options - 분석 옵션
   */
  async analyzeDocument(content, options = {}) {
    try {
      console.log('🔍 문서 분석 시작...');
      
      // JSON 파싱 시도
      let textContent = content;
      try {
        const parsedContent = JSON.parse(content);
        if (parsedContent.passages) {
          textContent = parsedContent.passages.join('\n\n');
        }
      } catch (e) {
        // 일반 텍스트로 처리
      }

      const analysisPrompt = `
당신은 영어 교육 전문가입니다. 다음 영어 지문을 종합적으로 분석해주세요.

🎯 분석 항목:
1. 📄 **핵심 요약** (2-3문장, 한국어)
2. 🔑 **주요 포인트** (3-5개 bullet point, 한국어)
3. 📚 **중요 어휘** (10개 내외, 영어→한국어)
4. ✏️ **문법 포인트** (3-4개, 한국어 설명)
5. 📖 **학습 가이드** (효과적 학습법, 한국어)
6. ❓ **이해도 확인 문제** (3개, 한국어 질문)

📋 **분석할 지문:**
${textContent}

⚠️ **출력 형식:** JSON 형태로 정확히 반환해주세요.
{
  "summary": "핵심 요약 내용...",
  "keyPoints": ["포인트1", "포인트2", "포인트3"],
  "vocabulary": [{"word": "영어단어", "meaning": "한국어 뜻"}, ...],
  "grammarPoints": ["문법설명1", "문법설명2", ...],
  "studyGuide": "학습 가이드 내용...",
  "comprehensionQuestions": ["질문1", "질문2", "질문3"]
}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "당신은 영어 교육 전문가로서 학생들이 이해하기 쉽도록 한국어로 분석 결과를 제공합니다. 반드시 JSON 형태로만 응답하세요."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const analysisText = response.choices[0].message.content.trim();
      
      // JSON 파싱 시도
      let analysisResult;
      try {
        // ```json 태그 제거
        const cleanJson = analysisText.replace(/```json\n?|```\n?/g, '').trim();
        analysisResult = JSON.parse(cleanJson);
      } catch (e) {
        console.error('JSON 파싱 실패, 기본 구조로 대체:', e);
        analysisResult = {
          summary: "문서 분석 중 오류가 발생했습니다.",
          keyPoints: ["분석 결과를 파싱할 수 없습니다."],
          vocabulary: [],
          grammarPoints: [],
          studyGuide: "다시 시도해주세요.",
          comprehensionQuestions: []
        };
      }

      console.log('✅ 문서 분석 완료');
      return analysisResult;

    } catch (error) {
      console.error('문서 분석 실패:', error);
      throw new Error('문서 분석 중 오류가 발생했습니다.');
    }
  }

  /**
   * 문서 분석을 DB 저장 형태로 변환
   */
  formatForDatabase(analysisResult) {
    // 새로운 형식인지 확인
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
    // 기존 형식 유지
    return {
      summary: analysisResult.summary || '',
      key_points: JSON.stringify(analysisResult.keyPoints || []),
      vocabulary: JSON.stringify(analysisResult.vocabulary || []),
      grammar_points: JSON.stringify(analysisResult.grammarPoints || []),
      study_guide: analysisResult.studyGuide || '',
      comprehension_questions: JSON.stringify(analysisResult.comprehensionQuestions || [])
    };
  }

  /**
   * DB 저장 형태를 클라이언트 형태로 변환
   */
  formatFromDatabase(dbResult) {
    try {
      // null/undefined 체크
      if (!dbResult) {
        console.error('formatFromDatabase: dbResult is null or undefined');
        return null;
      }
      
      return {
        id: dbResult.id,
        documentId: dbResult.document_id,
        analysisType: dbResult.analysis_type,
        summary: dbResult.summary || '',
        keyPoints: JSON.parse(dbResult.key_points || '[]'),
        vocabulary: JSON.parse(dbResult.vocabulary || '[]'),
        grammarPoints: JSON.parse(dbResult.grammar_points || '[]'),
        studyGuide: dbResult.study_guide || '',
        comprehensionQuestions: JSON.parse(dbResult.comprehension_questions || '[]'),
        createdAt: dbResult.created_at,
        updatedAt: dbResult.updated_at
      };
    } catch (e) {
      console.error('DB 데이터 파싱 실패:', e);
      return {
        id: dbResult.id,
        documentId: dbResult.document_id,
        summary: '데이터 파싱 중 오류가 발생했습니다.',
        keyPoints: [],
        vocabulary: [],
        grammarPoints: [],
        studyGuide: '',
        comprehensionQuestions: []
      };
    }
  }
}

module.exports = DocumentAnalyzer;