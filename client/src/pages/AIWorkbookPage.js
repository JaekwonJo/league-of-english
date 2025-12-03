import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.service';
import GeminiChatModal from '../components/common/GeminiChatModal';

const AIWorkbookPage = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // /ai-workbook/:documentId/:passageNumber?
  const documentId = parts[1] || null;
  const initialPassageNumber = parts[2] ? parseInt(parts[2], 10) || 1 : 1;

  const [documentInfo, setDocumentInfo] = useState(null);
  const [passageNumber] = useState(initialPassageNumber);
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(10);
  const [cardIndex, setCardIndex] = useState(0);
  const [workbookMode, setWorkbookMode] = useState('front');
  const [cardContext, setCardContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, aiLoading]);

  useEffect(() => {
    const loadDoc = async () => {
      if (!documentId) {
        window.location.href = '/workbook';
        return;
      }
      try {
        setLoading(true);
        const doc = await api.documents.get(documentId);
        setDocumentInfo(doc);
        setHistory([
          {
            role: 'ai',
            text: `"${doc.title}"의 지문 ${initialPassageNumber}을(를) 가지고 AI 워크북 10단계를 함께 풀어볼게요.\n\nSTEP 1부터 차근차근 시작해 볼까요?`,
            options: [{ label: 'STEP 1 시작하기 🚀', action: 'start_workbook' }]
          }
        ]);
      } catch (error) {
        console.error('AIWorkbook: failed to load document', error);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // 자동 저장: 대화가 어느 정도 쌓이면 기록소에 남기기
  useEffect(() => {
    if (!documentInfo) return;
    if (!history || history.length < 6) return;
    if (autoSaved) return;

    const topicBase = documentInfo.title || 'AI 워크북';
    const topic = `AI 워크북: ${topicBase} (지문 ${passageNumber})`;

    api
      .post('/study/tutor/save', { topic, history })
      .then(() => setAutoSaved(true))
      .catch(() => {
        /* 조용히 실패 무시 */
      });
  }, [autoSaved, documentInfo, history, passageNumber]);

  const sendAction = async (action, stepOverride, cardIndexOverride, baseHistory = history, doc = documentInfo) => {
    if (!documentId || !passageNumber) return;
    setAiLoading(true);

    try {
      const payload = {
        documentId: Number(documentId),
        passageNumber: Number(passageNumber),
        step: stepOverride || currentStep || 1,
        cardIndex: typeof cardIndexOverride === 'number' ? cardIndexOverride : cardIndex || 0,
        action: action || 'start',
        history: (baseHistory || []).map((h) => ({ role: h.role, text: h.text }))
      };

      const response = await api.post('/study/ai-workbook/chat', payload);

      const nextStep = Number(response.step || payload.step || 1);
      const nextCardIndex = Number(
        typeof response.cardIndex === 'number' ? response.cardIndex : payload.cardIndex || 0
      );
      const totalStepsFromResponse = Number(response.totalSteps || totalSteps || 10);

      setCurrentStep(nextStep);
      setTotalSteps(totalStepsFromResponse > 0 ? totalStepsFromResponse : 10);
      setCardIndex(nextCardIndex);
      setWorkbookMode(response.mode || 'front');
      setCardContext(response.cardContext || null);
      setHistory((prev) => [
        ...baseHistory,
        {
          role: 'ai',
          text: response.message,
          options: response.options || []
        }
      ]);
    } catch (error) {
      console.error('AI Workbook chat error:', error);
      setHistory((prev) => [
        ...baseHistory,
        {
          role: 'ai',
          text: '워크북 대화를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
          options: [{ label: '다시 시도', action: 'retry' }]
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleOptionClick = async (option, idx) => {
    if (aiLoading) return;
    const newHistory = [...history, { role: 'user', text: option.label }];
    setHistory(newHistory);

    if (option.action === 'back_to_select') {
      window.history.back();
      return;
    }

    if (option.action === 'start_workbook') {
      await sendAction('start', 1, 0, newHistory);
      return;
    }

    await sendAction(option.action, currentStep, cardIndex, newHistory);
  };

  const handleStepSelect = async (stepNumber) => {
    if (aiLoading) return;
    await sendAction('start', stepNumber, 0, history);
  };

  const handleAskQuestion = () => {
    if (!cardContext) return;
    setQuestionOpen(true);
  };

  if (loading || !documentInfo) {
    return <div style={styles.loading}>AI 워크북을 준비하고 있어요... ⏳</div>;
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <button
          onClick={() => window.history.back()}
          style={styles.backButton}
        >
          ← 나가기
        </button>
        <h2 style={styles.chatTitle}>
          AI 워크북 🤖 · 지문 {passageNumber}
          {totalSteps ? ` · STEP ${currentStep}/${totalSteps}` : ''}
        </h2>
      </div>

      <div style={styles.stepNav}>
        {Array.from({ length: totalSteps || 10 }, (_, idx) => {
          const stepNumber = idx + 1;
          return (
            <button
              key={stepNumber}
              type="button"
              style={{
                ...styles.stepChip,
                ...(stepNumber === currentStep ? styles.stepChipActive : {})
              }}
              onClick={() => handleStepSelect(stepNumber)}
              disabled={aiLoading}
            >
              STEP {stepNumber}
            </button>
          );
        })}
      </div>

      <div style={styles.messageList}>
        {history.map((msg, idx) => {
          const isLast = idx === history.length - 1;
          return (
            <div
              key={idx}
              style={msg.role === 'user' ? styles.userMsgWrapper : styles.aiMsgWrapper}
            >
              <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                {msg.text}
              </div>
              {msg.role === 'ai' && msg.options && isLast && (
                <div style={styles.optionsGrid}>
                  {msg.options.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      style={styles.optionChip}
                      onClick={() => handleOptionClick(opt, idx)}
                      disabled={aiLoading}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {workbookMode !== 'finished' && (
                    <button
                      type="button"
                      style={styles.optionChipSecondary}
                      onClick={handleAskQuestion}
                      disabled={aiLoading || !cardContext}
                    >
                      질문하기 ❓
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {aiLoading && (
          <div style={styles.aiMsgWrapper}>
            <div style={styles.aiBubble}>
              <span className="typing-dot">.</span>
              <span className="typing-dot">.</span>
              <span className="typing-dot">.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <GeminiChatModal
        isOpen={questionOpen}
        onClose={() => setQuestionOpen(false)}
        initialTopic={`${documentInfo.title || '워크북'} · 지문 ${passageNumber} · STEP ${currentStep}`}
        context={{
          problem: { type: 'workbook-step', step: currentStep },
          question: cardContext?.front || '',
          passage: cardContext?.back || '',
          answer: '',
          explanation: cardContext?.back || ''
        }}
      />
    </div>
  );
};

const styles = {
  chatContainer: {
    maxWidth: '640px',
    margin: '0 auto',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background:
      'radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(129,140,248,0.22), transparent 60%), #020617'
  },
  chatHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(148,163,184,0.35)',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.96)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    marginRight: '16px',
    fontSize: '14px'
  },
  chatTitle: {
    margin: 0,
    fontSize: '18px',
    color: 'white'
  },
  stepNav: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px 16px 0'
  },
  stepChip: {
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid rgba(148,163,184,0.6)',
    background: 'rgba(15,23,42,0.9)',
    color: '#E0F2FE',
    fontSize: '12px',
    cursor: 'pointer'
  },
  stepChipActive: {
    background: 'linear-gradient(135deg, #4F46E5, #0EA5E9)',
    borderColor: 'transparent',
    color: 'white',
    fontWeight: 700
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  userMsgWrapper: {
    alignSelf: 'flex-end',
    maxWidth: '80%'
  },
  aiMsgWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '90%'
  },
  userBubble: {
    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '16px 16px 0 16px',
    fontSize: '15px'
  },
  aiBubble: {
    background: 'rgba(15,23,42,0.96)',
    color: '#e2e8f0',
    padding: '16px',
    borderRadius: '16px 16px 16px 0',
    fontSize: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    border: '1px solid rgba(148,163,184,0.45)',
    boxShadow: '0 14px 32px rgba(15,23,42,0.7)'
  },
  optionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  optionChip: {
    background: 'rgba(37,99,235,0.2)',
    border: '1px solid rgba(96,165,250,0.9)',
    color: '#E0F2FE',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '600'
  },
  optionChipSecondary: {
    background: 'rgba(148,163,184,0.18)',
    border: '1px solid rgba(148,163,184,0.7)',
    color: '#E5E7EB',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: '#94a3b8'
  }
};

export default AIWorkbookPage;
