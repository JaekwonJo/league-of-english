import React, { useState, useRef, useEffect } from 'react';
import { GRAMMAR_CHAPTERS } from '../config/grammarChapters';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const GrammarTutorPage = () => {
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  const handleChapterClick = (chapter) => {
    setActiveChapter(chapter);
  };

  const handleTopicClick = async (topic) => {
    setActiveTopic(topic);
    setHistory([]);
    await sendMessage(`${activeChapter.title}: ${activeChapter.subtitle} - ${topic}`, [], null, true);
  };

  const sendMessage = async (topic, currentHistory, userAction = null, isInit = false) => {
    setLoading(true);
    
    let newHistory = [...currentHistory];
    if (userAction) {
      newHistory.push({ role: 'user', text: userAction.label });
    }
    setHistory(newHistory);

    try {
      const response = await api.post('/study/tutor/chat', {
        topic: topic,
        history: newHistory.map(h => ({ role: h.role, text: h.text }))
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

  const handleOptionClick = (option) => {
    if (loading) return;
    if (option.action && option.action.startsWith('save_vocab_')) {
      const [_, term, meaning] = option.action.split('_vocab_')[1].split('_');
      api.post('/vocabulary/my/save', { term, meaning })
        .then(() => alert(`'${term}' 단어장에 저장 완료! 📝`))
        .catch(() => alert('저장 실패'));
      return;
    }
    sendMessage(activeTopic, history, option);
  };

  // 1. Chapter Selection View
  if (!activeChapter) {
    if (!GRAMMAR_CHAPTERS || GRAMMAR_CHAPTERS.length === 0) {
      return <div style={{ padding: 40, color: 'white' }}>챕터 데이터를 불러오지 못했습니다.</div>;
    }

    return (
      <div style={styles.container}>
        <CommonHero 
          title="AI 문법 튜터 🤖" 
          subtitle="제미나이 선생님과 함께 대화하며 문법을 정복해보세요." 
        />
        <div style={styles.grid}>
          {GRAMMAR_CHAPTERS.map(chapter => (
            <button 
              key={chapter.id} 
              style={styles.card}
              onClick={() => handleChapterClick(chapter)}
              className="tilt-hover"
            >
              <div style={styles.icon}>{chapter.icon}</div>
              <div style={styles.cardContent}>
                <div style={styles.cardTitle}>{chapter.title}</div>
                <div style={styles.cardSub}>{chapter.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. Topic Selection View
  if (!activeTopic) {
    return (
      <div style={styles.container}>
        <div style={{marginBottom: 20}}>
          <button onClick={() => setActiveChapter(null)} style={styles.backButton}>← 챕터 목록으로</button>
        </div>
        <CommonHero 
          title={activeChapter.title} 
          subtitle={activeChapter.subtitle}
        />
        <h3 style={{color: 'white', marginTop: 30, marginBottom: 15}}>공부할 주제를 선택하세요 👇</h3>
        <div style={styles.topicGrid}>
          {activeChapter.topics && activeChapter.topics.map((topic, idx) => (
            <button 
              key={idx} 
              style={styles.topicCard}
              onClick={() => handleTopicClick(topic)}
              className="tilt-hover"
            >
              <span style={{marginRight: 10}}>📌</span>
              {topic}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. Chat Interface
  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <button onClick={() => setActiveTopic(null)} style={styles.backButton}>← 주제 목록으로</button>
        <h2 style={styles.chatTitle}>{activeTopic}</h2>
      </div>

      <div style={styles.messageList}>
        {history.map((msg, idx) => (
          <div key={idx} style={msg.role === 'user' ? styles.userMsgWrapper : styles.aiMsgWrapper}>
            <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
              {msg.text}
              {msg.role === 'ai' && msg.text && /[a-zA-Z]{2,}/.test(msg.text) && (
                <button 
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', 
                    marginTop: '8px', padding: '4px 8px', borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', 
                    fontSize: '12px', cursor: 'pointer'
                  }}
                  onClick={() => {
                    const utterance = new SpeechSynthesisUtterance(msg.text.replace(/[가-힣]+/g, '')); 
                    utterance.lang = 'en-US';
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                  }}
                >
                  🔊 듣기
                </button>
              )}
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
        {loading && (
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
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    marginTop: '30px'
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  icon: {
    fontSize: '32px',
    marginRight: '16px'
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '4px'
  },
  cardSub: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  // Chat Styles
  chatContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '90vh',
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
    lineHeight: '1.5',
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
  topicGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  topicCard: {
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center'
  }
};

export default GrammarTutorPage;
