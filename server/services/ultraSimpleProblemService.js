const OrderProblemGenerator = require('../utils/orderProblemGenerator');
const InsertionProblemGenerator = require('../utils/insertionProblemGenerator2');
const { generateCSATGrammarProblem, generateAdvancedGrammarProblem } = require('../utils/csatGrammarGenerator');
const AI = require('./aiProblemService');

class UltraSimpleProblemService {
  async getSmartProblems(userId, documentId, types, count, options = {}) {
    const database = require('../models/database');
    const document = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (!document) throw new Error('문서를 찾을 수 없습니다.');

    let passages = [];
    let parsedContent = null;
    try {
      const parsed = JSON.parse(document.content);
      parsedContent = parsed;
      if (Array.isArray(parsed.passages) && parsed.passages.length > 0) {
        passages = parsed.passages;
      } else if (parsed.content && typeof parsed.content === 'string') {
        const blocks = parsed.content
          .split(/\n{2,}/)
          .map(s => s.trim())
          .filter(s => s.length > 40);
        passages = blocks.length ? blocks : [parsed.content];
      }
    } catch {
      if (typeof document.content === 'string') {
        const blocks = document.content
          .split(/\n{2,}/)
          .map(s => s.trim())
          .filter(s => s.length > 40);
        passages = blocks.length ? blocks : [document.content];
      }
    }
    if (!Array.isArray(passages) || passages.length === 0) throw new Error('지문이 비어 있습니다.');

    // 유형별 개수 계산
    const countsByType = {};
    if (Array.isArray(types)) {
      const total = Math.max(0, parseInt(count) || 0);
      const k = types.length || 1;
      const base = Math.floor(total / k);
      let rem = total % k;
      types.forEach(t => { countsByType[t] = base + (rem > 0 ? 1 : 0); rem = Math.max(0, rem - 1); });
    } else if (types && typeof types === 'object') {
      for (const [t, c] of Object.entries(types)) countsByType[t] = Math.max(0, parseInt(c) || 0);
    } else if (typeof types === 'string') {
      countsByType[types] = Math.max(0, parseInt(count) || 0);
    }

    const out = [];
    for (const [tRaw, c] of Object.entries(countsByType)) {
      if (!c || c <= 0) continue;
      const t = String(tRaw);
      if (t === 'order') {
        out.push(...OrderProblemGenerator.generateOrderProblems(passages, c, options, document, parsedContent));
      } else if (t === 'insertion') {
        out.push(...InsertionProblemGenerator.generateInsertionProblems(passages, c, options, document, parsedContent));
      } else if (t === 'grammar') {
        const arr = this.generateGrammarProblems(passages, c, options, document, parsedContent).map(p => ({
          ...p,
          answer: String(p.correctAnswer),
          options: p.choices || p.options || []
        }));
        out.push(...arr);
      } else if (t === 'blank') {
        const arr = await AI.generateBlank(documentId, c);
        out.push(...arr);
      } else if (t === 'vocabulary' || t === 'vocab') {
        const arr = await AI.generateVocab(documentId, c);
        out.push(...arr.map(p => ({ ...p, type: 'vocabulary' })));
      } else if (t === 'title') {
        const arr = await AI.generateTitle(documentId, c);
        out.push(...arr);
      } else if (t === 'theme' || t === 'topic') {
        const arr = await AI.generateTopic(documentId, c);
        out.push(...arr.map(p => ({ ...p, type: 'theme' })));
      } else if (t === 'summary') {
        const arr = await AI.generateSummary(documentId, c);
        out.push(...arr);
      } else if (t === 'implicit') {
        const arr = await AI.generateImplicit(documentId, c);
        out.push(...arr);
      }
    }

    // 마지막 안전장치
    if ((!out || out.length === 0) && (countsByType['grammar'] || countsByType['grammar_count'])) {
      try {
        const fallback = generateCSATGrammarProblem(String(passages[0] || 'This is a sample sentence.'));
        out.push({
          ...fallback,
          id: `grammar_${Date.now()}_fallback`,
          type: fallback.type === 'grammar_count' ? 'grammar_count' : 'grammar',
          answer: String(fallback.correctAnswer),
          options: fallback.choices || fallback.options || []
        });
      } catch (_) {
        out.push({
          id: `grammar_${Date.now()}_sample`,
          type: 'grammar',
          question: '다음 중 밑줄 친 부분에 문법 오류가 있는 문장은?',
          options: [
            '1. She has many books.',
            '2. They are playing soccer.',
            '3. He go to school every day.',
            '4. We were happy yesterday.',
            '5. I will call you later.'
          ],
          answer: '3',
          difficulty: options.grammarDifficulty || 'basic'
        });
      }
    }

    return out;
  }

  generateGrammarProblems(passages, count, options = {}, document, parsedContent) {
    const problems = [];
    let success = 0, attempt = 0;
    while (success < count && attempt < count * 3) {
      try {
        const idx = success % passages.length;
        const psg = passages[idx];
        const gp = options.grammarDifficulty === 'advanced'
          ? generateAdvancedGrammarProblem(psg, { seed: Date.now() + attempt })
          : generateCSATGrammarProblem(psg, { seed: Date.now() + attempt, difficulty: options.grammarDifficulty || 'basic' });
        if (!gp || !gp.question) throw new Error('invalid grammar result');
        problems.push({
          id: `grammar_${Date.now()}_${success}`,
          type: gp.type || 'grammar',
          difficulty: gp.difficulty || (options.grammarDifficulty || 'basic'),
          question: gp.question,
          choices: gp.choices,
          correctAnswer: gp.correctAnswer,
          explanation: gp.explanation,
          text: gp.text,
          documentTitle: document.title || '문서',
          category: document.category || 'general',
          passageNumber: idx + 1,
          source: `지문${idx + 1}`,
          metadata: { ...(gp.metadata || {}), source: 'CSAT_grammar_generator', passageIndex: idx, passageNumber: idx + 1 }
        });
        success++;
      } catch {}
      attempt++;
    }
    return problems;
  }
}

module.exports = UltraSimpleProblemService;
