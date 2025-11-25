const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const examProblemService = require('../services/examProblemService');
const {
  saveSession,
  getActiveSession,
  clearSession
} = require('../services/studySessionService');

const database = require('../models/database'); // Ensure database is imported

router.get('/exam-problems', verifyToken, async (req, res) => {
  try {
    const documentId = req.query.documentId;
    const orderMode = req.query.orderMode || 'random';
    const limit = parseInt(req.query.limit || '20', 10);
    if (!documentId) {
      return res.status(400).json({ message: 'documentId is required' });
    }

    // Safety check: Ensure attempts table exists
    await database.run(`
      CREATE TABLE IF NOT EXISTS exam_problem_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exam_problem_id INTEGER,
        is_correct BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await database.run(`CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_problem_attempts(user_id)`);

    const problems = await examProblemService.getUnsolvedProblems(documentId, req.user.id, limit, orderMode);
    res.json({ problems });
  } catch (error) {
    console.error('[study/exam-problems] error:', error);
    res.status(500).json({ message: '기출문제를 불러오지 못했어요: ' + error.message });
  }
});

router.get('/session', verifyToken, async (req, res) => {
  try {
    const session = await getActiveSession({ userId: req.user.id });
    res.json({ session });
  } catch (error) {
    console.error('[study/session] fetch error:', error);
    res.status(500).json({ message: '저장된 학습 세션을 불러오지 못했어요.' });
  }
});

router.post('/session', verifyToken, async (req, res) => {
  try {
    const { payload } = req.body || {};
    const result = await saveSession({ userId: req.user.id, payload });
    res.json({ session: result });
  } catch (error) {
    console.error('[study/session] save error:', error);
    res.status(400).json({ message: error?.message || '학습 세션을 저장하지 못했어요.' });
  }
});

router.delete('/session', verifyToken, async (req, res) => {
  try {
    const reason = req.body?.reason ?? req.query?.reason ?? null;
    const result = await clearSession({ userId: req.user.id, reason });
    res.json(result);
  } catch (error) {
    console.error('[study/session] clear error:', error);
    res.status(400).json({ message: error?.message || '학습 세션을 정리하지 못했어요.' });
  }
});

const aiProblemService = require('../services/aiProblemService');

// AI Tutor History Endpoints
router.post('/tutor/save', verifyToken, async (req, res) => {
  try {
    const { topic, history } = req.body;
    if (!topic || !Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ message: '저장할 대화 내용이 없어요.' });
    }
    
    const result = await database.run(
      `INSERT INTO study_chat_sessions (user_id, topic, history, last_message_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [req.user.id, topic, JSON.stringify(history)]
    );
    
    res.json({ success: true, sessionId: result.id, message: '학습 기록이 안전하게 저장되었어요! 💾' });
  } catch (error) {
    console.error('[Tutor Save] Error:', error);
    res.status(500).json({ message: '학습 기록을 저장하지 못했어요.' });
  }
});

router.get('/tutor/history', verifyToken, async (req, res) => {
  try {
    const rows = await database.all(
      `SELECT id, topic, last_message_at, created_at 
       FROM study_chat_sessions 
       WHERE user_id = ? 
       ORDER BY last_message_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ sessions: rows });
  } catch (error) {
    console.error('[Tutor History] Error:', error);
    res.status(500).json({ message: '학습 기록을 불러오지 못했어요.' });
  }
});

router.get('/tutor/history/:id', verifyToken, async (req, res) => {
  try {
    const row = await database.get(
      `SELECT * FROM study_chat_sessions WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    
    if (!row) {
      return res.status(404).json({ message: '찾을 수 없는 기록이에요.' });
    }
    
    // Parse history JSON
    let history = [];
    try {
      history = JSON.parse(row.history);
    } catch (e) {
      history = [];
    }
    
    res.json({ session: { ...row, history } });
  } catch (error) {
    console.error('[Tutor Detail] Error:', error);
    res.status(500).json({ message: '상세 내용을 불러오지 못했어요.' });
  }
});

router.post('/tutor/chat', verifyToken, async (req, res) => {
  try {
    // payload: { topic, history: [{ role, text }] }
    const { topic, history } = req.body;
    
    // Use Gemini via AIProblemService
    const genAI = aiProblemService.getGemini();
    if (!genAI) {
      return res.status(503).json({ message: 'AI 튜터가 잠시 휴식 중이에요. (API Key Missing)' });
    }

    // Fallback: Use text generation if JSON mode fails or is not supported
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp", // User confirmed available model
    });

    const systemPrompt = `
      You are a friendly, encouraging Middle School English Grammar Tutor named "Gemini Teacher".
      
      **Critical Rule:**
      - **ALWAYS speak in KOREAN (한국어).** Even if the topic is English, the explanation must be in Korean.
      - **MANDATORY:** When explaining a concept, **ALWAYS provide the English sentence FIRST, then the Korean translation.** 
      - **Example Format:** "I go to school. (나는 학교에 가요.)"
      - **NEVER** provide only Korean examples for English grammar concepts. This is an English class!
      - Use very simple, elementary-school level language (초등학생도 이해할 수 있게 쉬운 말투).
      - Use "해요체" (친절한 존댓말).
      
      **Core Rules:**
      1. **Interaction Style:** NEVER ask open-ended questions. ALWAYS provide specific, clickable choices in the \`options\` array.
      2. **Persona:** Use emojis (✨, 💡, 🚀), be concise (max 3-4 sentences per bubble), and be super supportive.
      3. **Goal:** Explain the grammar concept '${topic}' step-by-step.
      4. **Response Format:** Return ONLY raw JSON. No Markdown fences.
      
      **JSON Structure:**
      {
        "message": "설명 내용... (반드시 영어 예문 + 한글 해석 포함)",
        "options": [
          { "label": "핵심 개념 알아보기", "action": "next_step_id" },
          { "label": "문제 풀어보기", "action": "generate_quiz" }
        ]
      }

      **Context:**
      The user is a student who just clicked a button.
      Current Topic: ${topic}
      Conversation History: ${JSON.stringify(history || [])}
      
      **Instructions:**
      - **ALWAYS PROVIDE AN 'EXPLAIN MORE' OPTION:** Unless the user explicitly says "I understand" or moves to the next topic, ALWAYS include an option like { "label": "이해가 안 돼요 / 더 설명해주세요", "action": "explain_more" } or { "label": "더 쉬운 예시 보기", "action": "explain_simpler" }.
      - **For Reading Tutor Requests (Topic: 문장 해석, 문법 분석, 단어장):**
        - Provide the requested content clearly.
        - Options: [Next Sentence], [Explain Grammar], [Vocab List], [Explain More].
      - **General Grammar Mode:**
        - Explain the concept simply with English examples (First English, then Korean).
        - Options: [Solve Problem], [More Examples], [Explain More].
        - **If user clicks "문제 풀어보기":** Generate a multiple-choice question.
        - **If user answers Incorrectly:** Explain WHY it's wrong, then offer [Try Again] or [Explain Concept Again].
      - **Always include English examples in explanations.**
    `;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    
    // Clean up markdown fences if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResponse = JSON.parse(cleanText);

    res.json(jsonResponse);

  } catch (error) {
    console.error('[Tutor] Error:', error);
    const reason = error?.response?.data?.error?.message || error?.message || 'Unknown error';
    res.status(500).json({ 
      message: `튜터 오류: ${reason}`,
      options: [{ label: '다시 시도하기', action: 'retry' }] 
    });
  }
});

module.exports = router;
