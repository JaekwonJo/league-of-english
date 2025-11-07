const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const CHOICES = ['①', '②', '③', '④', '⑤'];
const CHOICE_TO_INDEX = CHOICES.reduce((acc, mark, idx) => ({ ...acc, [mark]: idx }), {});

const EXAM_ID = process.env.MOCK_EXAM_ID || '2025-10';
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', 'mock-exams');
const LEGACY_DIR = path.resolve(__dirname, '..', '..', '모의고사 원문');
const LEGACY_QUESTION_FILE = '25_10월_고2_영어_문제지.pdf';
const LEGACY_ANSWER_FILE = '25_10월_고2_영어_정답 및 해설.pdf';
const FALLBACK_EXAM_JSON = path.resolve(__dirname, '..', 'data', 'mockExam2025-10.json');
const FALLBACK_ANSWER_JSON = path.resolve(__dirname, '..', 'data', 'mockExam2025-10-answers.json');

const getQuestionPath = () => {
  const candidate = path.join(STORAGE_ROOT, EXAM_ID, 'questions.pdf');
  if (fs.existsSync(candidate)) return candidate;
  return path.join(LEGACY_DIR, LEGACY_QUESTION_FILE);
};

const getAnswerPath = () => {
  const candidate = path.join(STORAGE_ROOT, EXAM_ID, 'answers.pdf');
  if (fs.existsSync(candidate)) return candidate;
  return path.join(LEGACY_DIR, LEGACY_ANSWER_FILE);
};

class MockExamService {
  constructor() {
    this.examCache = null;
    this.answerCache = null;
    this.explanationCache = new Map();
    this.openai = null;
  }

  async getExam() {
    if (!this.examCache) {
      this.examCache = await this._loadExam();
    }
    return this.examCache;
  }

  async getAnswerKey() {
    if (!this.answerCache) {
      this.answerCache = await this._loadAnswerKey();
    }
    return this.answerCache;
  }

  async gradeExam(answerPayload = {}) {
    const exam = await this.getExam();
    const answerKey = await this.getAnswerKey();

    const normalizedAnswers = {};
    Object.entries(answerPayload || {}).forEach(([key, value]) => {
      const number = Number(key);
      if (!Number.isInteger(number)) return;
      if (!answerKey[number]) return;
      let choiceIndex = null;
      if (Number.isInteger(value)) {
        choiceIndex = value;
      } else if (typeof value === 'string' && value.trim()) {
        const trimmed = value.trim();
        if (CHOICE_TO_INDEX[trimmed] !== undefined) {
          choiceIndex = CHOICE_TO_INDEX[trimmed];
        } else {
          const numeric = Number(trimmed);
          if (Number.isInteger(numeric)) {
            choiceIndex = numeric;
          }
        }
      }
      if (choiceIndex !== null && choiceIndex >= 0 && choiceIndex < CHOICES.length) {
        normalizedAnswers[number] = choiceIndex;
      }
    });

    const detail = exam.questions.map((question) => {
      const correctIndex = answerKey[question.number];
      const userIndex = normalizedAnswers[question.number];
      const isAnswered = typeof userIndex === 'number';
      const isCorrect = isAnswered && userIndex === correctIndex;
      return {
        number: question.number,
        prompt: question.prompt,
        promptLines: question.promptLines || question.prompt.split('\n'),
        choices: question.choices,
        correctIndex,
        userIndex: isAnswered ? userIndex : null,
        isAnswered,
        isCorrect,
        correctChoice: question.choices[correctIndex] || null,
        userChoice: typeof userIndex === 'number' ? question.choices[userIndex] || null : null
      };
    });

    const correctCount = detail.filter((item) => item.isCorrect).length;
    const incorrectCount = detail.filter((item) => item.isAnswered && !item.isCorrect).length;
    const unansweredCount = detail.filter((item) => !item.isAnswered).length;
    const total = detail.length;

    return {
      examId: exam.examId,
      title: exam.title,
      total,
      correctCount,
      incorrectCount,
      unansweredCount,
      accuracy: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      detail
    };
  }

  async getExplanation(questionNumber) {
    const exam = await this.getExam();
    const answerKey = await this.getAnswerKey();
    const number = Number(questionNumber);

    if (!Number.isInteger(number)) {
      throw new Error('유효한 문항 번호가 아닙니다.');
    }

    const question = exam.questions.find((item) => item.number === number);
    if (!question) {
      throw new Error('해당 문항을 찾을 수 없습니다.');
    }

    if (!Number.isInteger(answerKey[number])) {
      throw new Error('정답 정보를 찾을 수 없습니다.');
    }

    if (this.explanationCache.has(number)) {
      return {
        questionNumber: number,
        explanation: this.explanationCache.get(number),
        cached: true
      };
    }

    const openai = this._getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.');
    }

    const correctIndex = answerKey[number];
    const correctLabel = CHOICES[correctIndex];
    const promptLines = question.prompt.split('\n').map((line) => line.trim()).filter(Boolean);
    const promptText = promptLines.join('\n');

    const choiceLines = question.choices
      .map((choice, idx) => `${CHOICES[idx]} ${choice.text}`)
      .join('\n');

    const messages = [
      {
        role: 'system',
        content: '당신은 수능 영어를 지도하는 전문 튜터입니다. 설명은 한국어로 하되, 따뜻하고 격려하는 선생님 톤을 유지하세요.'
      },
      {
        role: 'user',
        content: [
          `문항 번호: ${number}`,
          '',
          '[지문]',
          promptText,
          '',
          '[선택지]',
          choiceLines,
          '',
          `정답: ${correctLabel}`,
          '',
          '위 문항에 대해 학생이 정답을 맞히지 못했습니다. 정답이 옳은 이유와 나머지 선택지가 틀린 이유를 단계적으로 설명해 주세요.',
          '설명은 한국어로, 다음 형식을 지켜 주세요:',
          '1) 핵심 정답 이유 (간결하게)',
          '2) 각 오답 선택지에 대한 피드백 (①~⑤ 순서, bullet 형식)',
          '3) 마무리 응원의 한 마디'
        ].join('\n')
      }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.LOE_OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 600,
      messages
    });

    const explanation = response?.choices?.[0]?.message?.content?.trim();
    if (!explanation) {
      throw new Error('해설 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }

    this.explanationCache.set(number, explanation);

    return {
      questionNumber: number,
      explanation,
      cached: false
    };
  }

  _getOpenAI() {
    if (this.openai || !process.env.OPENAI_API_KEY) {
      return this.openai;
    }
    try {
      const OpenAI = require('openai');
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (error) {
      console.error('[mockExam] OpenAI 초기화 실패:', error?.message || error);
      this.openai = null;
    }
    return this.openai;
  }

  async _loadExam() {
    const questionPath = getQuestionPath();
    if (!fs.existsSync(questionPath)) {
      if (fs.existsSync(FALLBACK_EXAM_JSON)) {
        return JSON.parse(fs.readFileSync(FALLBACK_EXAM_JSON, 'utf-8'));
      }
      throw new Error('모의고사 문제지 PDF 또는 기본 데이터 파일을 찾을 수 없습니다. 관리자에게 문의해 주세요.');
    }
    const buffer = fs.readFileSync(questionPath);
    const parsed = await pdfParse(buffer);
    const text = parsed.text.replace(/\r/g, '');

    const questions = this._extractQuestions(text);

    return {
      examId: '2025-10-highschool-2',
      title: '2025년 10월 고2 모의고사',
      timeLimitSeconds: 50 * 60,
      questionCount: questions.length,
      questions
    };
  }

  async _loadAnswerKey() {
    const answerPath = getAnswerPath();
    if (!fs.existsSync(answerPath)) {
      if (fs.existsSync(FALLBACK_ANSWER_JSON)) {
        return JSON.parse(fs.readFileSync(FALLBACK_ANSWER_JSON, 'utf-8'));
      }
      throw new Error('모의고사 정답/해설 PDF 또는 기본 데이터 파일을 찾을 수 없습니다. 관리자에게 문의해 주세요.');
    }
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

    // Ensure all questions 18-45 exist
    for (let q = 18; q <= 45; q += 1) {
      if (answerMap[q] === undefined) {
        throw new Error(`정답을 찾을 수 없습니다: ${q}번`);
      }
    }

    return answerMap;
  }

  _extractQuestions(text) {
    const startIndex = text.indexOf('18.');
    if (startIndex === -1) {
      throw new Error('문항 18을 찾을 수 없습니다. PDF 구조가 변경된 것 같습니다.');
    }
    const truncated = text.slice(startIndex);
    const blocks = [];
    const regex = /(?:^|\n)(1[8-9]|[2-3]\d|4[0-5])\.\s*[\s\S]*?(?=\n(?:1[8-9]|[2-3]\d|4[0-5])\.|$)/g;
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

  resetCache() {
    this.examCache = null;
    this.answerCache = null;
    this.explanationCache.clear();
  }
}

const mockExamService = new MockExamService();

module.exports = mockExamService;
module.exports.MockExamService = MockExamService;
