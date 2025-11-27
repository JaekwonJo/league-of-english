import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.service';

const ReadingTutorPage = () => {
  const documentId = window.location.pathname.split('/').pop();
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1); // -1: Intro, 0~n: Sentences
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, aiLoading]);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        setLoading(true);
        const res = await api.documents.get(documentId);
        if (res) {
          const text = res.content; 
          const split = text.match(/[^.!?]+[.!?]+/g) || [text];
          const cleanSentences = split.map(s => s.trim()).filter(s => s.length > 0);
          setSentences(cleanSentences);
          
          // Initial Greeting
          setHistory([{
            role: 'ai',
            text: `안녕하세요! 오늘 공부할 지문은 "${res.title}"입니다. 총 ${cleanSentences.length}문장으로 이루어져 있어요. 차근차근 읽어볼까요?`,
            options: [{ label: "네, 시작해요! 🚀", action: "start_reading" }]
          }]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [documentId]);

  const handleOptionClick = async (option) => {
    if (aiLoading) return;

    // Add User Message
    const newHistory = [...history, { role: 'user', text: option.label }];
    setHistory(newHistory);

    if (option.action === 'start_reading' || option.action === 'next_sentence') {
      const nextStep = currentStep + 1;
      if (nextStep < sentences.length) {
        setCurrentStep(nextStep);
        const sentence = sentences[nextStep];
        
        // AI presents the sentence
        setTimeout(() => {
          setHistory(prev => [...prev, {
            role: 'ai',
            text: `📖 ${nextStep + 1}번째 문장입니다.\n\n"${sentence}"`,
            options: [
              { label: "🇰🇷 해석해줘", action: "translate" },
              { label: "🔍 문법 알려줘", action: "grammar" },
              { label: "📝 단어장 보여줘", action: "vocab" },
              { label: "다음 문장 👉", action: "next_sentence" }
            ],
            context: { sentence } // Store context for next actions
          }]);
        }, 500);
      } else {
        // End of Document
        setTimeout(() => {
          setHistory(prev => [...prev, {
            role: 'ai',
            text: "지문을 모두 읽었습니다! 🎉 이제 전체 내용을 요약하거나 문제를 풀어볼까요?",
            options: [
              { label: "📜 전체 요약", action: "summary" },
              { label: "📝 문제 풀기", action: "quiz" }
            ]
          }]);
        }, 500);
      }
      return;
    }

    // Actions requiring API call (Translate, Grammar, Vocab, etc.)
    setAiLoading(true);
    try {
      const lastAiMsg = history[history.length - 1];
      const contextSentence = lastAiMsg.context?.sentence || sentences[currentStep];
      
      // Prepare Topic based on Action
      let topic = '';
      let prompt = '';
      
      if (option.action === 'translate') {
        topic = '문장 해석';
        prompt = `Translate this sentence into natural Korean: "${contextSentence}"`;
      } else if (option.action === 'grammar') {
        topic = '문법 분석';
        prompt = `Analyze the grammatical structure of this sentence: "${contextSentence}"`;
      } else if (option.action === 'vocab') {
        topic = '단어장';
        prompt = `List key vocabulary from this sentence: "${contextSentence}"`;
      } else if (option.action === 'summary') {
        topic = '지문 요약';
        prompt = `Summarize the entire passage in Korean. Passage: ${sentences.join(' ')}`;
      } else if (option.action === 'quiz') {
        topic = '문제 풀이';
        prompt = `Generate a reading comprehension question based on the passage.`;
      } else if (option.action.startsWith('save_vocab_')) {
        const [_, term, meaning] = option.action.split('_vocab_')[1].split('_');
        await api.post('/vocabulary/my/save', { term, meaning });
        setHistory(prev => [...prev, { role: 'ai', text: `'${term}' 단어장에 저장 완료! 💾`, options: lastAiMsg.options }]);
        setAiLoading(false);
        return;
      } else {
        // General Chat
        topic = '질문';
        prompt = option.label;
      }

      const response = await api.post('/study/tutor/chat', {
        topic: topic,
        history: newHistory.map(h => ({ role: h.role, text: h.text })),
        // Pass context if needed
      });

      setHistory(prev => [
        ...prev, 
        { 
          role: 'ai', 
          text: response.message, 
          options: response.options || (
            // If API doesn't return options (fallback), restore context options
            currentStep < sentences.length 
            ? [
                { label: "이해가 안 돼요 / 더 설명해주세요", action: "explain_more" },
                { label: "다음 문장 👉", action: "next_sentence" }
              ]
            : [{ label: "다시 시작", action: "start_reading" }]
          ),
          context: { sentence: contextSentence } 
        }
      ]);

    } catch (error) {
      setHistory(prev => [...prev, { role: 'ai', text: "오류가 발생했어요. 다시 시도해주세요.", options: [{ label: "재시도", action: option.action }] }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>로딩 중...</div>;

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <button onClick={() => window.history.back()} style={styles.backButton}>← 나가기</button>
        <h2 style={styles.chatTitle}>독해 튜터 🤖</h2>
      </div>

      <div style={styles.messageList}>
        {history.map((msg, idx) => (
          <div key={idx} style={msg.role === 'user' ? styles.userMsgWrapper : styles.aiMsgWrapper}>
            <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
              {msg.text}
            </div>
            {msg.role === 'ai' && msg.options && (
              <div style={styles.optionsGrid}>
                {msg.options.map((opt, optIdx) => (
                  <button 
                    key={optIdx} 
                    style={styles.optionChip}
                    onClick={() => handleOptionClick(opt)}
                    disabled={idx !== history.length - 1} 
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
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
    </div>
  );
};

const styles = {
  chatContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a'
  },
  chatHeader: {
    padding: '16px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.9)',
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
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
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
    background: '#3b82f6',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '16px 16px 0 16px',
    fontSize: '15px'
  },
  aiBubble: {
    background: '#1e293b',
    color: '#e2e8f0',
    padding: '16px',
    borderRadius: '16px 16px 16px 0',
    fontSize: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    border: '1px solid #334155'
  },
  optionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  optionChip: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid #3b82f6',
    color: '#60a5fa',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
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

export default ReadingTutorPage;
