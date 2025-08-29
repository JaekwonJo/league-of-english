const database = require('../models/database');
const templates = require('../config/problem-templates.json');
const config = require('../config/server.config.json');

class ProblemService {
  constructor() {
    this.openai = null;
    this.initOpenAI();
  }

  initOpenAI() {
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('✅ ProblemService: OpenAI 초기화 완료');
    }
  }

  /**
   * 스마트 문제 가져오기 (캐싱 + AI 생성)
   */
  async getSmartProblems(userId, documentId, types, count = 10) {
    const problems = [];
    
    // 각 유형별로 문제 가져오기
    for (const [type, requestedCount] of Object.entries(types)) {
      if (requestedCount <= 0) continue;
      
      // 1. DB에서 기존 문제 찾기 (중복 제외)
      const existingProblems = await this.getExistingProblems(
        userId, 
        documentId, 
        type, 
        requestedCount
      );
      
      problems.push(...existingProblems);
      
      // 2. 부족한 만큼 생성
      const needed = requestedCount - existingProblems.length;
      if (needed > 0) {
        const document = await database.get(
          'SELECT content FROM documents WHERE id = ?',
          [documentId]
        );
        
        if (document) {
          const newProblems = await this.generateProblems(
            document.content,
            type,
            needed,
            documentId
          );
          problems.push(...newProblems);
        }
      }
    }
    
    return this.shuffleArray(problems);
  }

  /**
   * 기존 문제 조회 (중복 제외)
   */
  async getExistingProblems(userId, documentId, type, limit) {
    // 최근 푼 문제 ID 가져오기
    const recentProblems = await database.all(
      `SELECT DISTINCT problem_id FROM study_records 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    
    const excludeIds = recentProblems.map(r => r.problem_id);
    
    // 제외할 ID 목록을 만들어서 쿼리
    const excludeClause = excludeIds.length > 0 
      ? `AND id NOT IN (${excludeIds.join(',')})` 
      : '';
    
    const query = `
      SELECT * FROM problems 
      WHERE document_id = ? 
        AND type = ? 
        ${excludeClause}
      ORDER BY RANDOM() 
      LIMIT ?
    `;
    
    const problems = await database.all(query, [documentId, type, limit]);
    
    // JSON 파싱
    return problems.map(p => ({
      ...p,
      options: JSON.parse(p.options || '[]')
    }));
  }

  /**
   * 문제 생성 (규칙 기반 or AI)
   */
  async generateProblems(text, type, count, documentId) {
    const problems = [];
    
    // 규칙 기반 문제 타입
    const ruleBasedTypes = ['order', 'insertion'];
    
    if (ruleBasedTypes.includes(type)) {
      // 규칙 기반 생성
      for (let i = 0; i < count; i++) {
        try {
          const problem = this.generateRuleBasedProblem(text, type);
          if (problem) {
            // DB에 저장
            const saved = await this.saveProblem(problem, documentId);
            problems.push(saved);
          }
        } catch (error) {
          console.error(`규칙 기반 문제 생성 실패:`, error);
        }
      }
    } else if (this.openai) {
      // AI 기반 생성
      for (let i = 0; i < count; i++) {
        try {
          const problem = await this.generateAIProblem(text, type);
          if (problem) {
            // DB에 저장
            const saved = await this.saveProblem(problem, documentId);
            problems.push(saved);
          }
        } catch (error) {
          console.error(`AI 문제 생성 실패:`, error);
          // 폴백: 규칙 기반으로 대체
          const fallback = this.generateFallbackProblem(text, type);
          if (fallback) problems.push(fallback);
        }
      }
    } else {
      // OpenAI 없으면 폴백
      for (let i = 0; i < count; i++) {
        const fallback = this.generateFallbackProblem(text, type);
        if (fallback) problems.push(fallback);
      }
    }
    
    return problems;
  }

  /**
   * 규칙 기반 문제 생성
   */
  generateRuleBasedProblem(text, type) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    if (type === 'order') {
      return this.generateOrderProblem(sentences);
    } else if (type === 'insertion') {
      return this.generateInsertionProblem(sentences);
    }
    
    return null;
  }

  /**
   * 순서 배열 문제 생성
   */
  generateOrderProblem(sentences) {
    if (sentences.length < 4) return null;
    
    const template = templates.ruleBasedTemplates.order;
    const firstSentence = sentences[0];
    const remaining = sentences.slice(1, 4);
    
    // 섞기
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    
    // 라벨 부여
    const labeled = shuffled.map((sent, idx) => 
      `(${String.fromCharCode(65 + idx)}) ${sent.trim()}`
    );
    
    // 정답 찾기
    const correctOrder = remaining.map(sent => {
      const idx = shuffled.indexOf(sent);
      return String.fromCharCode(65 + idx);
    }).join('-');
    
    const correctAnswer = `(${correctOrder.split('-').join(')-(')})`;
    const answerIndex = template.basicOptions.indexOf(correctAnswer) + 1;
    
    return {
      type: 'order',
      question: `${template.instructions[0]}\n\n${firstSentence}\n\n${labeled.join('\n')}`,
      options: template.basicOptions.map((opt, idx) => `${idx + 1}. ${opt}`),
      answer: answerIndex.toString(),
      explanation: `올바른 순서는 ${correctAnswer}입니다.`,
      is_ai_generated: false
    };
  }

  /**
   * 문장 삽입 문제 생성
   */
  generateInsertionProblem(sentences) {
    if (sentences.length < 5) return null;
    
    const template = templates.ruleBasedTemplates.insertion;
    const insertIndex = Math.floor(Math.random() * 3) + 1;
    const sentenceToInsert = sentences[insertIndex].trim();
    
    // 해당 문장 제거
    const withoutSentence = sentences.filter((_, idx) => idx !== insertIndex);
    
    // 위치 표시 추가
    const markedText = withoutSentence.map((sent, idx) => {
      if (idx === 0) return sent.trim();
      return `${template.markers[idx - 1]} ${sent.trim()}`;
    }).join(' ');
    
    return {
      type: 'insertion',
      question: `${template.instructions[0]}\n\n[삽입할 문장]\n${sentenceToInsert}\n\n${markedText}`,
      options: template.options,
      answer: insertIndex.toString(),
      explanation: `문장은 ${template.options[insertIndex - 1]} 위치에 들어가야 합니다.`,
      is_ai_generated: false
    };
  }

  /**
   * AI 문제 생성
   */
  async generateAIProblem(text, type) {
    if (!this.openai) return null;
    
    const prompt = templates.prompts[type];
    if (!prompt) return null;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user.replace('{text}', text) }
        ],
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens
      });
      
      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      return {
        type: type,
        question: parsed.question,
        options: parsed.options,
        answer: parsed.answer.toString(),
        explanation: parsed.explanation,
        is_ai_generated: true
      };
    } catch (error) {
      console.error('AI 문제 생성 오류:', error);
      return null;
    }
  }

  /**
   * 폴백 문제 생성
   */
  generateFallbackProblem(text, type) {
    // 간단한 기본 문제 생성
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) return null;
    
    return {
      type: type,
      question: `다음 글을 읽고 물음에 답하시오.\n\n${sentences[0]}`,
      options: ['① 옵션 1', '② 옵션 2', '③ 옵션 3', '④ 옵션 4', '⑤ 옵션 5'],
      answer: '1',
      explanation: '임시 문제입니다.',
      is_ai_generated: false
    };
  }

  /**
   * 문제 DB 저장
   */
  async saveProblem(problem, documentId) {
    const result = await database.run(
      `INSERT INTO problems (document_id, type, question, options, answer, explanation, is_ai_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        problem.type,
        problem.question,
        JSON.stringify(problem.options),
        problem.answer,
        problem.explanation,
        problem.is_ai_generated ? 1 : 0
      ]
    );
    
    return {
      id: result.id,
      ...problem
    };
  }

  /**
   * 배열 섞기
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = new ProblemService();