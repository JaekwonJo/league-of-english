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
const workbookService = require('../services/workbookService');

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
    const { topic, history, context = {} } = req.body || {};
    
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
      Reading Tutor Sentence: ${context && context.sentence ? `"${context.sentence}"` : 'N/A'}
      
      **Instructions:**
      - **ALWAYS PROVIDE AN 'EXPLAIN MORE' OPTION:** Unless the user explicitly says "I understand" or moves to the next topic, ALWAYS include an option like { "label": "이해가 안 돼요 / 더 설명해주세요", "action": "explain_more" } or { "label": "더 쉬운 예시 보기", "action": "explain_simpler" }.
      - **For Reading Tutor Requests (Topic: 문장 해석, 문법 분석, 단어장):**
        - Focus ONLY on the current sentence shown in **Reading Tutor Sentence** above.
        - Do NOT change the topic to a general concept (예: "질문이란 무엇인가요?") unless the user explicitly asks.
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

// AI Workbook Tutor - 단계별 워크북 채팅
router.post('/ai-workbook/chat', verifyToken, async (req, res) => {
  try {
    const { documentId, passageNumber = 1, step = 1, cardIndex = 0, action = 'start' } = req.body || {};

    const numericDocId = Number(documentId);
    const numericPassage = Number(passageNumber) || 1;
    if (!Number.isInteger(numericDocId) || numericDocId <= 0) {
      return res.status(400).json({ message: '유효한 documentId가 필요합니다.' });
    }
    if (!Number.isInteger(numericPassage) || numericPassage <= 0) {
      return res.status(400).json({ message: '유효한 지문 번호가 필요합니다.' });
    }

    // 워크북이 없다면 새로 생성, 있으면 캐시 사용
    const workbook = await workbookService.generateWorkbook({
      documentId: numericDocId,
      passageNumber: numericPassage,
      userId: req.user.id,
      regenerate: false
    });

    const steps = Array.isArray(workbook.steps)
      ? workbook.steps.filter((s) => Number(s.step) >= 1 && Number(s.step) <= 10)
      : [];

    if (!steps.length) {
      return res.status(400).json({ message: '워크북 단계가 준비되지 않았어요.' });
    }

    // 현재 단계/카드 계산
    const requestedStep = Number(step) || 1;
    let stepIndex = steps.findIndex((s) => Number(s.step) === requestedStep);
    if (stepIndex === -1) stepIndex = 0;

    // action에 따라 다음 단계/카드 결정
    let mode = 'front'; // front | back | step_complete | finished
    let currentStepNumber = steps[stepIndex].step;
    let currentCardIndex = Math.max(0, Math.min(Number(cardIndex) || 0, (steps[stepIndex].cards || []).length - 1));

    const isLastStep = stepIndex === steps.length - 1;
    const hasNextStep = stepIndex < steps.length - 1;

    switch (action) {
      case 'start':
        stepIndex = 0;
        currentStepNumber = steps[0].step;
        currentCardIndex = 0;
        mode = 'front';
        break;
      case 'restart_workbook':
        stepIndex = 0;
        currentStepNumber = steps[0].step;
        currentCardIndex = 0;
        mode = 'front';
        break;
      case 'show_back':
        mode = 'back';
        break;
      case 'next_card': {
        const cards = steps[stepIndex].cards || [];
        if (currentCardIndex + 1 < cards.length) {
          currentCardIndex += 1;
          mode = 'front';
        } else {
          mode = 'step_complete';
        }
        break;
      }
      case 'go_next_step':
        if (hasNextStep) {
          stepIndex += 1;
          currentStepNumber = steps[stepIndex].step;
          currentCardIndex = 0;
          mode = 'front';
        } else {
          mode = 'finished';
        }
        break;
      case 'repeat_step':
        currentCardIndex = 0;
        mode = 'front';
        break;
      default:
        mode = 'front';
        break;
    }

    const activeStep = steps[stepIndex];
    const cards = Array.isArray(activeStep.cards) ? activeStep.cards : [];
    const safeIndex = Math.max(0, Math.min(currentCardIndex, Math.max(0, cards.length - 1)));
    const card = cards[safeIndex] || {};
    const nextStep = hasNextStep ? steps[stepIndex + 1].step : null;

    let message;
    let options = [];

    const stepLabel = activeStep.label || `STEP ${activeStep.step}`;
    const cardContext = {
      step: activeStep.step,
      label: activeStep.label || '',
      front: String(card.front || '').trim(),
      back: String(card.back || '').trim()
    };

    if (mode === 'finished') {
      message =
        'AI 워크북 10단계(제목·주제·요지 정리)까지 모두 끝냈어요! 🎉\n\n이제 다른 지문으로 넘어가거나, 처음부터 가볍게 한 번 더 복습해도 좋아요.';
      options = [
        { label: '다른 지문으로 이동하기', action: 'back_to_select' },
        { label: '이 지문 워크북 처음부터 다시 풀기', action: 'restart_workbook' }
      ];
    } else if (mode === 'step_complete') {
      const takeaways = Array.isArray(activeStep.takeaways) ? activeStep.takeaways : [];
      const bullet = takeaways.length ? `- ${takeaways.join('\n- ')}` : '';
      message = `✅ ${stepLabel}을(를) 모두 끝냈어요!\n\n${bullet || '이번 단계에서 헷갈렸던 부분이 있다면 한 번 더 복습해도 좋아요.'}\n\n다음 단계로 넘어가고 싶다면, 위쪽에 있는 STEP 버튼에서 STEP ${hasNextStep ? nextStep : activeStep.step}을 눌러 주세요.`;
      options = [];
    } else if (mode === 'back') {
      const front = String(card.front || '').trim();
      const back = String(card.back || '').trim();
      const combined = `${front}\n\n---\n${back || '정답/해설이 아직 준비되지 않았어요.'}`;
      message = `📘 ${stepLabel}\n\n${combined}`;
      options = [
        { label: '다음 카드로 넘어가기 👉', action: 'next_card' }
      ];
    } else {
      // front 모드
      const front = String(card.front || '').trim() || '카드가 아직 준비되지 않았어요.';
      message = `📘 ${stepLabel}\n\n${front}`;
      options = [
        { label: '정답/해설 보기 💡', action: 'show_back' },
        { label: '다음 카드로 넘어가기 👉', action: 'next_card' }
      ];
    }

    res.json({
      success: true,
      message,
      options,
      step: activeStep.step,
      cardIndex: safeIndex,
      totalSteps: steps.length,
      totalCards: cards.length,
      mode,
      cardContext
    });
  } catch (error) {
    console.error('[AI Workbook Tutor] Error:', error);
    res.status(500).json({ message: error?.message || 'AI 워크북 대화 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
