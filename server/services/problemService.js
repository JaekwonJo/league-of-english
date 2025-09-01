const database = require('../models/database');
const templates = require('../config/problem-templates.json');
const config = require('../config/server.config.json');
const { make: makeOrderProblem } = require('../utils/seq_strict_final');
const { generateRandomOrderProblems, printProblemWithEffects } = require('../utils/multiPassageOrderGenerator');
const SimpleOrderGenerator = require('../utils/simpleOrderGenerator');

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
  async getSmartProblems(userId, documentId, types, count = 10, options = {}) {
    const problems = [];
    
    // types가 배열인 경우 객체로 변환
    const typeMap = Array.isArray(types) 
      ? types.reduce((acc, type) => ({ ...acc, [type]: Math.ceil(count / types.length) }), {})
      : types;
    
    // 각 유형별로 문제 가져오기
    console.log('🔍 typeMap:', typeMap);
    for (const [type, requestedCount] of Object.entries(typeMap)) {
      console.log('🔍 처리중인 타입:', { type, requestedCount });
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
          'SELECT title, content FROM documents WHERE id = ?',
          [documentId]
        );
        
        if (document) {
          const newProblems = await this.generateProblems(
            document,
            type,
            needed,
            documentId,
            options
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
    console.log('🔍 getExistingProblems 파라미터:', { userId, documentId, type, limit, parsedLimit: parseInt(limit) });
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
    
    const problems = await database.all(query, [parseInt(documentId), type, parseInt(limit)]);
    
    // JSON 파싱 및 구조화된 데이터 복원
    return problems.map(p => {
      const parsedProblem = {
        ...p,
        options: JSON.parse(p.options || '[]')
      };

      // 순서배열 문제인 경우 구조화된 데이터 복원
      if (p.type === 'order' && p.main_text) {
        parsedProblem.mainText = p.main_text;
        parsedProblem.sentences = JSON.parse(p.sentences || '[]');
        parsedProblem.metadata = JSON.parse(p.metadata || '{}');
        parsedProblem.instruction = '✨ Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.';
      }

      return parsedProblem;
    });
  }

  /**
   * 문제 생성 (규칙 기반 or AI)
   */
  async generateProblems(document, type, count, documentId, options = {}) {
    const problems = [];
    
    // 규칙 기반 문제 타입
    const ruleBasedTypes = ['order', 'insertion'];
    
    if (ruleBasedTypes.includes(type)) {
      // 규칙 기반 생성
      for (let i = 0; i < count; i++) {
        try {
          const problem = this.generateRuleBasedProblem(document, type, options);
          if (problem) {
            // DB에 저장
            const saved = await this.saveProblem(problem, documentId);
            problems.push(saved);
          }
        } catch (error) {
          console.error(`규칙 기반 문제 생성 실패:`, error);
          // 실패해도 기본 구조 데이터 생성
          const fallbackProblem = {
            type: 'order',
            instruction: '✨ Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.',
            mainText: 'This is a sample English sentence for testing purposes.',
            sentences: [
              {label: 'A', text: 'First part of the English passage for testing.'},
              {label: 'B', text: 'Second part of the English passage for testing.'},
              {label: 'C', text: 'Third part of the English passage for testing.'}
            ],
            options: ['1. (A)-(B)-(C)', '2. (A)-(C)-(B)', '3. (B)-(A)-(C)', '4. (B)-(C)-(A)', '5. (C)-(A)-(B)'],
            answer: '1',
            explanation: '테스트용 문제입니다.',
            is_ai_generated: false,
            metadata: {
              source: 'Test Source',
              passageNumber: '1',
              originalTitle: 'Test Title'
            }
          };
          console.log('📤 폴백 - 서버에서 클라이언트로 전송하는 데이터:', {
            mainText: fallbackProblem.mainText,
            sentences: fallbackProblem.sentences
          });
          problems.push(fallbackProblem);
        }
      }
    } else if (this.openai) {
      // AI 기반 생성
      for (let i = 0; i < count; i++) {
        try {
          const problem = await this.generateAIProblem(document.content, type);
          if (problem) {
            // DB에 저장
            const saved = await this.saveProblem(problem, documentId);
            problems.push(saved);
          }
        } catch (error) {
          console.error(`AI 문제 생성 실패:`, error);
          // 폴백: 규칙 기반으로 대체
          const fallback = this.generateFallbackProblem(document.content, type);
          if (fallback) problems.push(fallback);
        }
      }
    } else {
      // OpenAI 없으면 폴백
      for (let i = 0; i < count; i++) {
        const fallback = this.generateFallbackProblem(document.content, type);
        if (fallback) problems.push(fallback);
      }
    }
    
    return problems;
  }

  /**
   * 규칙 기반 문제 생성
   */
  generateRuleBasedProblem(document, type, options = {}) {
    if (type === 'order') {
      return this.generateOrderProblem(document, options);
    } else if (type === 'insertion') {
      return this.generateInsertionProblem(document.content);
    }
    
    return null;
  }

  /**
   * 순서 배열 문제 생성 (새로운 간단한 방식)
   */
  generateOrderProblem(document, options = {}) {
    try {
      console.log('🎯 간단한 순서배열 문제 생성 시작...');
      console.log('📊 옵션:', JSON.stringify(options, null, 2));
      
      // 새 파서 결과 확인 (parsedContent가 있는지)
      let passages = [];
      
      if (document.parsedContent && document.parsedContent.passages) {
        passages = document.parsedContent.passages;
        console.log('✅ 새 파서 결과 사용:', passages.length, '개 지문');
      } else if (typeof document.content === 'string') {
        // 기존 방식으로 지문 분리 시도
        passages = document.content.split('\n\n---\n\n').filter(p => p.trim().length > 50);
        console.log('📄 기존 방식으로 지문 분리:', passages.length, '개');
      } else {
        throw new Error('사용 가능한 지문 데이터가 없습니다.');
      }

      if (passages.length === 0) {
        throw new Error('추출된 지문이 없습니다.');
      }

      // 간단한 생성기 사용
      const generator = new SimpleOrderGenerator();
      const difficulty = options.orderDifficulty || 'basic';
      const problems = generator.generateOrderProblems(passages, difficulty, 1);
      
      if (problems.length === 0) {
        throw new Error('문제 생성 실패');
      }

      const problem = problems[0];

      // API 응답 형식에 맞게 변환
      const orderProblem = {
        type: 'order',
        instruction: 'Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.',
        mainText: problem.mainText,
        sentences: problem.sentences,
        answer: problem.correctAnswer.split('-').join(''), // A-B-C -> ABC
        explanation: `올바른 순서는 ${problem.correctAnswer}입니다.`,
        is_ai_generated: false,
        metadata: problem.metadata
      };

      console.log('✅ 간단한 순서배열 문제 생성 완료');
      console.log('📤 전송 데이터:', {
        mainText: orderProblem.mainText,
        sentences: orderProblem.sentences.length + '개 선택지',
        answer: orderProblem.answer
      });

      return orderProblem;

    } catch (error) {
      console.error('🚨 간단한 순서배열 생성 실패:', error);
      throw error; // 폴백 없이 바로 실패 처리
    }
  }

  /**
   * seq_strict_final 폴백 생성
   */
  generateOrderProblemFallback(document, options = {}) {
    const difficulty = options.orderDifficulty || 'basic';
    const choiceCount = difficulty === 'advanced' ? 5 : 3;
    
    // 문서 객체를 seq_strict_final 형태로 변환
    const docObj = {
      title: document.title || 'Untitled',
      num: '1',
      p: document.content
    };
    
    const generated = makeOrderProblem(docObj, choiceCount);
    const choices = this.generateOrderChoices(generated.ans, choiceCount);
    
    const fallbackProblem = {
      type: 'order',
      instruction: 'Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.',
      mainText: generated.given,
      sentences: generated.items.map(item => ({
        label: item.l,
        text: item.x.trim()
      })),
      options: choices,
      answer: this.findCorrectAnswerIndex(generated.ans, choices).toString(),
      explanation: `올바른 순서는 ${generated.ans}입니다.`,
      is_ai_generated: false,
      metadata: {
        source: 'Fallback',
        passageNumber: generated.number,
        originalTitle: generated.title
      }
    };
    
    console.log('📤 폴백 - 서버에서 클라이언트로 전송하는 데이터:', {
      mainText: fallbackProblem.mainText,
      sentences: fallbackProblem.sentences
    });
    
    return fallbackProblem;
  }

  /**
   * 순서배열 선택지 생성
   */
  generateOrderChoices(correctAnswer, choiceCount) {
    const letters = 'ABCDE'.slice(0, choiceCount).split('');
    const choices = [];
    
    // 정답 추가
    choices.push(`(${correctAnswer.split('-').join(')-(')})`)
    
    // 오답 생성 (섞인 순서) - choiceCount에 맞춰 선택지 생성
    while (choices.length < 5) {
      const shuffled = [...letters].sort(() => Math.random() - 0.5);
      const option = `(${shuffled.join(')-(')})`;
      if (!choices.includes(option)) {
        choices.push(option);
      }
    }
    
    // 섞기
    const shuffledChoices = [...choices].sort(() => Math.random() - 0.5);
    return shuffledChoices.map((choice, idx) => `${idx + 1}. ${choice}`);
  }

  /**
   * 정답 인덱스 찾기
   */
  findCorrectAnswerIndex(correctAnswer, choices) {
    const correctOption = `(${correctAnswer.split('-').join(')-(')})`;
    const index = choices.findIndex(choice => choice.includes(correctOption));
    return index + 1;
  }

  /**
   * 폴백 순서배열 문제 생성
   */
  generateFallbackOrderProblem(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length < 4) return null;
    
    const firstSentence = sentences[0];
    const remaining = sentences.slice(1, 4);
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    
    return {
      type: 'order',
      question: `Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.\n\n[주어진 문장] ${firstSentence}\n\n${shuffled.map((sent, idx) => `${String.fromCharCode(65 + idx)}. ${sent.trim()}`).join('\n')}`,
      options: ['1. (A)-(B)-(C)', '2. (A)-(C)-(B)', '3. (B)-(A)-(C)', '4. (B)-(C)-(A)', '5. (C)-(A)-(B)'],
      answer: '1',
      explanation: '폴백 문제입니다.',
      is_ai_generated: false
    };
  }

  /**
   * 문장 삽입 문제 생성
   */
  generateInsertionProblem(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
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
      `INSERT INTO problems (document_id, type, question, options, answer, explanation, is_ai_generated, main_text, sentences, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        problem.type,
        problem.question || problem.instruction,
        JSON.stringify(problem.options),
        problem.answer,
        problem.explanation,
        problem.is_ai_generated ? 1 : 0,
        problem.mainText || null,
        JSON.stringify(problem.sentences || null),
        JSON.stringify(problem.metadata || null)
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