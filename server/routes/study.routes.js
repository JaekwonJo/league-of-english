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
      
      **Core Rules:**
      1. **Interaction Style:** NEVER ask open-ended questions. ALWAYS provide specific, clickable choices in the \`options\` array.
      2. **Persona:** Use emojis (✨, 💡, 🚀), be concise (max 3-4 sentences per bubble), and be super supportive.
      3. **Goal:** Explain the grammar concept '${topic}' step-by-step.
      4. **Response Format:** Return ONLY raw JSON. No Markdown fences.
      
      **JSON Structure:**
      {
        "message": "Here is the explanation text...",
        "options": [
          { "label": "Button Text 1", "action": "next_step_id" },
          { "label": "Button Text 2", "action": "explain_simpler" }
        ]
      }

      **Context:**
      The user is a student who just clicked a button.
      Current Topic: ${topic}
      Conversation History: ${JSON.stringify(history || [])}
      
      **Instructions:**
      - If history is empty, introduce the topic briefly and ask if they want a "Core Concept" or "Example Sentences".
      - If user asked for "Problem", generate a simple multiple-choice question in the \`message\` and put the answers in \`options\` (action="submit_answer_1", etc).
      - If user answered correctly, praise them and ask to move to the next chapter or try a harder one.
      - If user answered incorrectly, explain why kindly and offer to try again.
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
