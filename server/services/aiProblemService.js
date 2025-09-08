const database = require('../models/database');
let OpenAI = null;
try { OpenAI = require('openai'); } catch {}

class AIProblemService {
  async getPassages(documentId) {
    const doc = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (!doc) throw new Error('문서를 찾을 수 없습니다.');
    try {
      const parsed = JSON.parse(doc.content);
      return Array.isArray(parsed.passages) ? parsed.passages : [parsed.content || ''];
    } catch {
      return [doc.content];
    }
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
      await database.run(
        `INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, is_ai_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          documentId,
          type,
          p.question,
          JSON.stringify(p.options || []),
          String(p.correctAnswer ?? p.answer ?? ''),
          p.explanation || '',
          p.difficulty || 'basic'
        ]
      );
    }
  }

  getOpenAI() {
    if (!process.env.OPENAI_API_KEY || !OpenAI) return null;
    if (!this._openai) this._openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return this._openai;
  }

  // Blank-fill (AI preferred, fallback to rule-based)
  async generateBlank(documentId, count = 5) {
    const passages = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    if (openai) {
      for (let i = 0; i < count; i++) {
        const p = passages[i % passages.length];
        const prompt = `You are an English test item writer. Create ONE cloze (fill-in-the-blank) multiple-choice question from the passage. Return strict JSON only.
Passage:
${p}

JSON shape:
{
  "type": "blank",
  "question": "Korean: 다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?",
  "text": "Passage excerpt with one blank: _____",
  "options": ["option1","option2","option3","option4"],
  "correctAnswer": 1,
  "explanation": "short rationale in Korean"
}`;
        try {
          const resp = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
          const txt = (resp.choices?.[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim();
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

    // fallback rule-based
    return this.generateBlankRule(passages, count);
  }

  async generateBlankRule(passages, count) {
    const problems = [];
    for (let i = 0; i < count; i++) {
      const p = passages[i % passages.length];
      const words = (p.match(/\b[A-Za-z]{5,}\b/g) || []).slice(0, 200);
      if (words.length < 4) continue;
      const answerWord = words[Math.floor(Math.random() * words.length)];
      const questionText = p.replace(new RegExp(`\\b${answerWord}\\b`), '_____');
      const distractors = shuffleUnique(words.filter(w => w.toLowerCase() !== answerWord.toLowerCase()), 3);
      const options = shuffleUnique([answerWord, ...distractors], 4);
      const correct = options.findIndex(w => w === answerWord) + 1;
      problems.push({
        type: 'blank',
        question: '다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?',
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
    const passages = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i++) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Create ONE vocabulary synonym MCQ from the passage. Return JSON only.
Passage:
${p}
JSON:
{"type":"vocabulary","question":"문맥상 밑줄 친 단어와 의미가 가장 가까운 것은?","text":"... with <u>target</u> underlined ...","options":["A","B","C","D"],"correctAnswer":1,"explanation":"short Korean rationale"}`;
        try {
          const resp = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
          const txt = (resp.choices?.[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim();
          const obj = JSON.parse(txt);
          obj.type = 'vocabulary';
          problems.push(obj);
          continue;
        } catch {}
      }
      // fallback quick
      const words = (p.match(/\b[A-Za-z]{6,}\b/g) || []).slice(0, 200);
      if (words.length < 4) continue;
      const target = words[Math.floor(Math.random() * words.length)];
      const options = shuffleUnique([target, ...shuffleUnique(words.filter(w => w !== target), 3)], 4);
      const correct = options.findIndex(o => o === target) + 1;
      problems.push({ type: 'vocabulary', question: `문맥상 '${target}'과 가장 의미가 가까운 단어를 고르시오.`, options, correctAnswer: correct, explanation: '휴리스틱', difficulty: 'basic' });
    }
    return problems;
  }

  async generateTitle(documentId, count = 5) {
    const passages = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i++) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Make ONE 'best title' MCQ for the passage. Return JSON only with fields: type='title', question, options[4], correctAnswer(1-4), explanation(Korean). Passage:\n${p}`;
        try {
          const resp = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 400, messages: [{ role: 'user', content: prompt }] });
          const obj = JSON.parse((resp.choices?.[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim());
          obj.type = 'title';
          problems.push(obj); continue;
        } catch {}
      }
      const first = (p.split(/(?<=[.!?])\s+/)[0] || '').trim().slice(0, 60);
      const base = first.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 5).join(' ');
      const candidates = shuffleUnique([`${base}` || 'Main Idea', 'A Letter to the Principal', 'Preparing for Exams', 'Library Hours Extension'], 4);
      problems.push({ type: 'title', question: '다음 글의 제목으로 가장 적절한 것은?', options: candidates, correctAnswer: 1, explanation: '휴리스틱', difficulty: 'basic' });
    }
    return problems;
  }

  async generateTopic(documentId, count = 5) {
    const passages = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i++) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Make ONE 'main topic' MCQ for the passage. JSON fields: type='theme', question, options[4], correctAnswer(1-4), explanation(Korean). Passage:\n${p}`;
        try {
          const resp = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 400, messages: [{ role: 'user', content: prompt }] });
          const obj = JSON.parse((resp.choices?.[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim());
          obj.type = 'theme';
          problems.push(obj); continue;
        } catch {}
      }
      const candidates = ['환경 보호', '학교 정책', '시험 준비', '도서관 활용'];
      problems.push({ type: 'theme', question: '다음 글의 주제로 가장 적절한 것은?', options: candidates, correctAnswer: 2, explanation: '휴리스틱', difficulty: 'basic' });
    }
    return problems;
  }

  async generateSummary(documentId, count = 5) {
    const passages = await this.getPassages(documentId);
    const problems = [];
    const openai = this.getOpenAI();
    for (let i = 0; i < count; i++) {
      const p = passages[i % passages.length];
      if (openai) {
        const prompt = `Make ONE 'summary/요지' MCQ for the passage. JSON fields: type='summary', question, options[4], correctAnswer(1-4), explanation(Korean). Passage:\n${p}`;
        try {
          const resp = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
          const obj = JSON.parse((resp.choices?.[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim());
          obj.type = 'summary';
          problems.push(obj); continue;
        } catch {}
      }
      problems.push({ type: 'summary', question: '다음 글의 내용으로 가장 적절한 것은?', options: ['A 요지', 'B 요지', 'C 요지', 'D 요지'], correctAnswer: 1, explanation: '휴리스틱', difficulty: 'basic' });
    }
    return problems;
  }
}

function shuffleUnique(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

module.exports = new AIProblemService();
