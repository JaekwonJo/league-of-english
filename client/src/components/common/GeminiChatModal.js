import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api.service';

const GeminiChatModal = ({ isOpen, onClose, initialTopic, context, historyOverride, onAction }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (historyOverride) {
        setHistory(historyOverride);
      } else {
        setHistory([]);
        // Start conversation with context
        const startMsg = `이 문제에 대해 궁금한 점이 있나요? (${initialTopic})`;
        sendMessage(initialTopic, [], null, true); 
      }
    }
  }, [isOpen, initialTopic, historyOverride]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  useEffect(() => {
    // Auto-save on unmount if history exists and wasn't overridden (view-only mode)
    return () => {
      if (history.length >= 4 && !historyOverride) {
        const title = initialTopic.length > 20 ? initialTopic.slice(0, 20) + '...' : initialTopic;
        // Fire and forget auto-save
        api.post('/study/tutor/save', { topic: `(자동저장) ${title}`, history }).catch(() => {});
      }
    };
  }, [history, historyOverride, initialTopic]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (history.length > 0 && !historyOverride) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [history, historyOverride]);

  const sendMessage = async (topic, currentHistory, userAction = null, isInit = false) => {
    setLoading(true);
    
    let newHistory = [...currentHistory];
    if (userAction) {
      newHistory.push({ role: 'user', text: userAction.label });
    }
    setHistory(newHistory);

    try {
      // Prepare richer context for Gemini
      const fullContext = isInit ? {
        ...context,
        history: [],
        systemInstruction: `
          The user is asking about a specific English problem.
          Problem Type: ${context.problem?.type}
          Question: ${context.question}
          Passage: ${context.passage}
          Correct Answer: ${context.answer}
          Explanation: ${context.explanation}
          
          Role: You are a kind, easy-to-understand Korean tutor.
          Task: Explain why the answer is correct, or clarify difficult parts based on user clicks.
          Language: Korean only (Easy/Polite).
        `
      } : { history: newHistory.map(h => ({ role: h.role, text: h.text })) };

      const response = await api.post('/study/tutor/chat', {
        topic: isInit ? `문제 해설: ${topic}` : topic,
        history: newHistory.map(h => ({ role: h.role, text: h.text })),
        context: isInit ? fullContext : undefined
      });

      setHistory(prev => [
        ...prev, 
        { 
          role: 'ai', 
          text: response.message, 
          options: response.options 
        }
      ]);
    } catch (error) {
      setHistory(prev => [
        ...prev, 
        { 
          role: 'ai', 
          text: "잠시 연결이 불안정해요. 다시 시도해볼까요?", 
          options: [{ label: "다시 시도", action: "retry" }] 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>🤖 제미나이 선생님</h3>
          <div style={{display: 'flex', gap: '10px'}}>
            {!historyOverride && (
              <button
                onClick={() => {
                  const title = initialTopic.length > 20 ? initialTopic.slice(0, 20) + '...' : initialTopic;
                  api.post('/study/tutor/save', { topic: title, history })
                    .then(() => alert('대화 내용이 기록소에 저장되었습니다! 💾'))
                    .catch(() => alert('저장 실패'));
                }}
                style={styles.saveButton}
              >
                저장
              </button>
            )}
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>
        
        <div style={styles.body}>
          {history.map((msg, idx) => (
            <div key={idx} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
              <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                {msg.text}
              </div>
              {msg.role === 'ai' && msg.options && (
                <div style={styles.options}>
                  {msg.options.map((opt, i) => (
                    <button 
                      key={i} 
                      style={styles.optionBtn}
                      onClick={() => {
                        if (onAction && onAction(opt)) return;
                        if (opt.action.startsWith('save_vocab_')) {
                          const [_, term, meaning] = opt.action.split('_vocab_')[1].split('_');
                          api.post('/vocabulary/my/save', { term, meaning })
                            .then(() => alert(`'${term}' 저장 완료!`))
                            .catch(() => alert('저장 실패'));
                        } else {
                          sendMessage(null, history, opt);
                        }
                      }}
                      disabled={idx !== history.length - 1}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={styles.aiMsg}>
              <div style={styles.aiBubble}>...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    width: '90%',
    maxWidth: '500px',
    height: '80vh',
    background: '#1e293b',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
  },
  header: {
    padding: '16px 20px',
    background: '#0f172a',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    color: 'white',
    fontSize: '1.1rem'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '24px',
    cursor: 'pointer'
  },
  saveButton: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.5)',
    borderRadius: '8px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  userMsg: { alignSelf: 'flex-end', maxWidth: '85%' },
  aiMsg: { alignSelf: 'flex-start', maxWidth: '90%' },
  userBubble: {
    background: '#3b82f6',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '16px 16px 0 16px',
    fontSize: '0.95rem'
  },
  aiBubble: {
    background: '#334155',
    color: '#e2e8f0',
    padding: '12px 16px',
    borderRadius: '16px 16px 16px 0',
    fontSize: '0.95rem',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap'
  },
  options: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  },
  optionBtn: {
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid #3b82f6',
    color: '#60a5fa',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '600'
  }
};

export default GeminiChatModal;
