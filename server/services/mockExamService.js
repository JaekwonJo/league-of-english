const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { jsonrepair } = require('jsonrepair');
const database = require('../models/database');
const studyService = require('./studyService');

const CHOICES = ['①', '②', '③', '④', '⑤'];
const CHOICE_TO_INDEX = CHOICES.reduce((acc, mark, idx) => ({ ...acc, [mark]: idx }), {});

// ... (Keep existing constants) ...
const DEFAULT_EXAM_ID = process.env.MOCK_EXAM_ID || '2025-10';
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', 'mock-exams');
const LEGACY_DIR_CANDIDATES = [
  path.resolve(__dirname, '..', '..', '모의고사원문'),
  path.resolve(__dirname, '..', '..', '모의고사 원문')
];
const LEGACY_QUESTION_FILE = '25_10월_고2_영어_문제지.pdf';
const LEGACY_ANSWER_FILE = '25_10월_고2_영어_정답 및 해설.pdf';
const getFallbackExamJson = (examId = DEFAULT_EXAM_ID) => path.resolve(__dirname, '..', 'data', `mockExam${examId}.json`);
const getFallbackAnswerJson = (examId = DEFAULT_EXAM_ID) => path.resolve(__dirname, '..', 'data', `mockExam${examId}-answers.json`);

const resolveLegacyPath = (file) => LEGACY_DIR_CANDIDATES
  .map((dir) => path.join(dir, file))
  .find((candidate) => fs.existsSync(candidate));

const getQuestionPath = (examId = DEFAULT_EXAM_ID) => {
  const preferred = path.join(STORAGE_ROOT, examId, 'questions.pdf');
  if (fs.existsSync(preferred)) return preferred;
  return resolveLegacyPath(LEGACY_QUESTION_FILE) || preferred;
};

const getAnswerPath = (examId = DEFAULT_EXAM_ID) => {
  const preferred = path.join(STORAGE_ROOT, examId, 'answers.pdf');
  if (fs.existsSync(preferred)) return preferred;
  return resolveLegacyPath(LEGACY_ANSWER_FILE) || preferred;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const ensureFallback = (filePath, friendlyName) => {
  if (fs.existsSync(filePath)) {
    return readJson(filePath);
  }
  throw new Error(`${friendlyName} 기본 데이터 파일을 찾을 수 없습니다. 관리자에게 문의해 주세요.`);
};

class MockExamService {
  constructor() {
    this.examCache = new Map();
    this.answerCache = new Map();
    this.explanationCache = new Map();
    this.openai = null;
    this.problemMapCache = new Map();
  }

  // Normalize raw PDF text for robust parsing across different exports
  _normalizePdfText(raw = '') {
    if (!raw) return '';
    let text = String(raw)
      .replace(/\u200b|\ufeff|\u00ad/g, '') // zero-width, BOM, soft hyphen
      .replace(/-\n/g, '') // hyphenated line-breaks
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ') // non-breaking space
      .replace(/\s+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .normalize('NFC');
    // Standardize option markers: convert "1)", "1.", "(1)" to circled digits when safe
    const markers = ['①','②','③','④','⑤'];
    for (let i = 1; i <= 5; i += 1) {
      const circ = markers[i - 1];
      const patterns = [
        new RegExp(`\\(${i}\\)`, 'g'),
        new RegExp(`(?<=\n|\s)${i}[\u0029\u002E]`, 'g'), // 1) or 1.
      ];
      patterns.forEach((re) => {
        text = text.replace(re, circ);
      });
    }
    // Remove page headers/footers heuristically (lines with only page numbers)
    text = text.replace(/^\s*\d+\s*$/gm, '');
    return text;
  }

  // NEW: AI Parsing for robustness
  async _parseWithAI(text) {
    const openai = this._getOpenAI();
    if (!openai) throw new Error("OpenAI required for AI parsing");

    const systemPrompt = `
You are an expert exam digitizer.
Your task is to convert messy, interleaved text extracted from a 2-column PDF exam paper into structured JSON.
The text contains multiple questions (e.g., 18, 19...).
The text may have headers/footers or be mixed up due to column layout. Use context to reconstruct the correct flow.

Output Format (JSON Array of objects):
[
  {
    "number": 18,
    "prompt": "Passage text...",
    "choices": [
      { "mark": "①", "text": "option1" },
      ...
    ]
  }
]

Rules:
1. Identify questions by Number (18~45).
2. Extract the full prompt (passage + question text).
3. Extract 5 choices.
4. Return ONLY valid JSON.
`;

    try {
      // Split text into chunks if too large (100k chars limit for safety)
      // But mock exam text is usually small enough for gpt-4o-mini context.
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the raw PDF text:\n\n${text.slice(0, 100000)}` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content);
      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      
      // Normalize structure
      return questions.map(q => ({
        number: Number(q.number),
        prompt: q.prompt,
        promptLines: (q.prompt || '').split('\n'),
        choices: q.choices || []
      })).filter(q => q.number >= 18 && q.number <= 45); // Filter listening questions if any

    } catch (e) {
      console.error('AI Mock Parsing Failed:', e);
      try {
          const repaired = jsonrepair(e.response?.data || '');
          return JSON.parse(repaired);
      } catch (e2) {
          return [];
      }
    }
  }

  async listAvailableExams() {
    // ... (Keep existing logic) ...
    const list = [];
    try {
      if (!fs.existsSync(STORAGE_ROOT)) {
        return list;
      }
      const dirs = fs.readdirSync(STORAGE_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      for (const examId of dirs) {
        const hasQuestions = fs.existsSync(path.join(STORAGE_ROOT, examId, 'questions.pdf'));
        const hasAnswers = fs.existsSync(path.join(STORAGE_ROOT, examId, 'answers.pdf'));
        if (!hasQuestions || !hasAnswers) continue;
        try {
          // Lightweight load (don't parse PDF if possible)
          // We should cache metadata.json for title/count
          list.push({ id: examId, title: this._buildExamTitle(examId), questionCount: 28 }); // Approximate count
        } catch (error) {
          console.warn('[mockExam] skip exam listing', examId, error?.message || error);
        }
      }
    } catch (error) {
      console.warn('[mockExam] cannot scan STORAGE_ROOT:', error?.message || error);
    }
    return list;
  }

  // ... (Keep existing getExam, getAnswerKey, gradeExam, getExplanation, _getOpenAI) ...

  async _loadExam(examId = DEFAULT_EXAM_ID) {
    const cacheFile = path.join(STORAGE_ROOT, examId, 'parsed_questions.json');
    
    // 1. Try JSON Cache first
    if (fs.existsSync(cacheFile)) {
        try {
            const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            if (cached && cached.questions && cached.questions.length > 0) {
                return cached;
            }
        } catch (e) {
            console.warn('Corrupt mock exam cache, reparsing...', e);
        }
    }

    const questionPath = getQuestionPath(examId);
    if (fs.existsSync(questionPath)) {
      try {
        const buffer = fs.readFileSync(questionPath);
        const parsed = await pdfParse(buffer);
        const text = this._normalizePdfText(parsed.text);
        
        // Use AI Parser
        let questions = [];
        try {
            questions = await this._parseWithAI(text);
        } catch (aiError) {
            console.warn('AI Mock Parsing failed, falling back to regex:', aiError);
            questions = this._extractQuestions(text);
        }

        const result = {
          examId,
          title: this._buildExamTitle(examId),
          timeLimitSeconds: 50 * 60,
          questionCount: questions.length,
          questions
        };
        
        // Save Cache
        try {
            fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
            fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
        } catch (e) {
            console.warn('Failed to save mock exam cache:', e);
        }
        
        return result;
      } catch (error) {
        console.warn(`[mockExam] 문제지 PDF 파싱 실패(${examId}), JSON으로 대체합니다:`, error.message);
      }
    }

    const fallback = ensureFallback(getFallbackExamJson(examId), `모의고사 문제지(${examId})`);
    fallback.examId = fallback.examId || examId;
    fallback.questionCount = fallback.questionCount || (fallback.questions ? fallback.questions.length : 0);
    return fallback;
  }

  // ... (Rest of the file) ...

  async _loadAnswerKey(examId = DEFAULT_EXAM_ID) {
    const answerPath = getAnswerPath(examId);
    if (fs.existsSync(answerPath)) {
      try {
        const buffer = fs.readFileSync(answerPath);
        const parsed = await pdfParse(buffer);
        const text = parsed.text.replace(/\r/g, '');

        const matches = [...text.matchAll(/(\d{1,2})([①-⑤])/g)];
        const answerMap = {};
        matches.forEach((match) => {
          const number = Number(match[1]);
          const mark = match[2];
          if (!Number.isInteger(number)) return;
          if (number < 1 || number > 45) return;
          if (answerMap[number] !== undefined) return;
          const index = CHOICE_TO_INDEX[mark];
          if (typeof index === 'number') {
            answerMap[number] = index;
          }
        });

        for (let q = 18; q <= 45; q += 1) {
          if (answerMap[q] === undefined) {
            console.warn(`[mockExam] 정답 누락 감지(${examId}), JSON으로 대체합니다:`, q);
            return ensureFallback(getFallbackAnswerJson(examId), `모의고사 정답(${examId})`);
          }
        }

        return answerMap;
      } catch (error) {
        console.warn(`[mockExam] 정답 PDF 파싱 실패(${examId}), JSON으로 대체합니다:`, error.message);
      }
    }

    return ensureFallback(getFallbackAnswerJson(examId), `모의고사 정답(${examId})`);
  }

  _extractQuestions(text) {
    // Locate first question (18~45). Support "18.", "18)", "18 번" patterns.
    const startMatch = text.match(/\b(1[8-9]|[2-3]\d|4[0-5])[\.\)]?\s*(?:번)?\s/);
    if (!startMatch) {
      throw new Error('문항 18을 찾을 수 없습니다. PDF 구조가 변경된 것 같습니다.');
    }
    const startIndex = startMatch.index ?? 0;
    const truncated = text.slice(startIndex);
    const blocks = [];
    const regex = /(?:^|\n)\s*(1[8-9]|[2-3]\d|4[0-5])[\.\)]?\s*(?:번)?\s*[\s\S]*?(?=\n\s*(1[8-9]|[2-3]\d|4[0-5])[\.\)]?\s*(?:번)?\s|$)/g;
    let match;
    while ((match = regex.exec(truncated)) !== null) {
      const number = Number(match[1]);
      const rawBlock = match[0].replace(/^\n?/, '').trim();
      const parsed = this._parseQuestionBlock(number, rawBlock);
      if (parsed) {
        blocks.push(parsed);
      }
    }

    return blocks;
  }

  _buildExamTitle(examId = DEFAULT_EXAM_ID) {
    if (!examId) return '모의고사';
    const parts = examId.split('-');
    if (parts.length >= 2) {
      const [year, month] = parts;
      return `${year}년 ${month}월 모의고사`;
    }
    return `${examId} 모의고사`;
  }

  _parseQuestionBlock(number, block) {
    const cleanBlock = block
      .replace(/^\d+\./, '')
      .replace(/\u00a0/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    const firstOptionIndex = cleanBlock.indexOf('①');
    if (firstOptionIndex === -1) {
      console.warn(`[mockExam] 선택지를 찾지 못했습니다. 문항 ${number}`);
      return null;
    }

    const promptPart = cleanBlock.slice(0, firstOptionIndex).trim();
    const optionsPart = cleanBlock.slice(firstOptionIndex).trim();

    const prompt = promptPart
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !/^\d+$/.test(line))
      .join('\n')
      .trim();

    const optionSegments = optionsPart
      .split(/(?=①|②|③|④|⑤)/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    const choices = optionSegments.map((segment) => {
      const mark = segment.charAt(0);
      const text = segment
        .slice(1)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        mark,
        text
      };
    });

    if (choices.length !== CHOICES.length) {
      console.warn(`[mockExam] 선택지 개수가 예상과 다릅니다. 문항 ${number}`);
    }

    return {
      number,
      prompt,
      promptLines: prompt.split('\n'),
      choices
    };
  }

  resetCache(examId) {
    if (examId) {
      this.examCache.delete(examId);
      this.answerCache.delete(examId);
      this.problemMapCache.delete(examId);
      [...this.explanationCache.keys()].forEach((key) => {
        if (key.startsWith(`${examId}-`)) this.explanationCache.delete(key);
      });
      return;
    }
    this.examCache.clear();
    this.answerCache.clear();
    this.problemMapCache.clear();
    this.explanationCache.clear();
  }

  async ensureMockProblems(exam, answerKey, examId = DEFAULT_EXAM_ID) {
    const normalizedExamId = exam?.examId || examId;
    if (!exam?.questions?.length) return new Map();
    if (!this.problemMapCache.has(normalizedExamId)) {
      const rows = await database.all('SELECT question_number, problem_id FROM mock_exam_questions WHERE exam_id = ?', [normalizedExamId]);
      const map = new Map(rows.map((row) => [Number(row.question_number), row.problem_id]));

      for (const question of exam.questions) {
        if (map.has(question.number)) continue;
        const correctIndex = answerKey[question.number];
        const answerValue = Number.isInteger(correctIndex) ? String(correctIndex + 1) : '';
        const optionsPayload = JSON.stringify((question.choices || []).map((choice) => `${choice.mark || ''} ${choice.text}`.trim()));
        const metadata = JSON.stringify({ examId: normalizedExamId, questionNumber: question.number });
        const insert = await database.run(
          `INSERT INTO problems (document_id, type, question, options, answer, explanation, metadata, is_ai_generated)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [null, 'mock_exam', question.prompt, optionsPayload, answerValue, '', metadata]
        );
        map.set(question.number, insert.id);
        await database.run(
          `INSERT INTO mock_exam_questions (exam_id, question_number, problem_id)
           VALUES (?, ?, ?)
           ON CONFLICT(exam_id, question_number) DO UPDATE SET problem_id = excluded.problem_id`,
          [normalizedExamId, question.number, insert.id]
        );
      }

      this.problemMapCache.set(normalizedExamId, map);
    }
    return this.problemMapCache.get(normalizedExamId);
  }

  async _recordStudyResults(userId, detail, problemMap) {
    if (!problemMap || typeof problemMap.get !== 'function') return null;
    const payload = detail
      .map((item) => {
        const problemId = problemMap.get(item.number);
        if (!problemId) return null;
        return {
          problemId,
          isCorrect: !!item.isCorrect,
          userAnswer: typeof item.userIndex === 'number' ? String(item.userIndex + 1) : '',
          timeSpent: 0,
          problemType: 'mock_exam'
        };
      })
      .filter(Boolean);

    if (!payload.length) return null;
    return studyService.recordStudySession(userId, payload);
  }
}

const mockExamService = new MockExamService();

module.exports = mockExamService;
module.exports.MockExamService = MockExamService;
