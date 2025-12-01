import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.service';

const ReadingTutorPage = () => {
  // URL: /reading-tutor/:documentId 또는 /reading-tutor/:documentId/:passageNumber
  const parts = window.location.pathname.split('/').filter(Boolean);
  const documentId = parts[1] || null;
  const initialPassageNumber = parts[2] ? parseInt(parts[2], 10) || null : null;

  const [documentInfo, setDocumentInfo] = useState(null);
  const [passages, setPassages] = useState([]);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1); // -1: Intro, 0~n: Sentences
  const [aiLoading, setAiLoading] = useState(false);
  const [viewMode, setViewMode] = useState('select'); // 'select' | 'chat'
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, aiLoading]);

  // 문서 정보 + 지문 목록 불러오기
  useEffect(() => {
    if (!documentId) {
      window.location.href = '/reading-tutor-select';
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [doc, passageListRaw] = await Promise.all([
          api.documents.get(documentId),
          api.analysis.listPassageSummaries(documentId)
        ]);

        setDocumentInfo(doc);
        const list = Array.isArray(passageListRaw)
          ? passageListRaw
          : Array.isArray(passageListRaw?.data)
            ? passageListRaw.data
            : [];
        setPassages(list);

        // URL에 초기 지문 번호가 있는 경우 바로 해당 지문부터 시작
        if (initialPassageNumber && list.length >= initialPassageNumber) {
          const initial = list[initialPassageNumber - 1];
          startPassageSession(initial, doc);
        }
      } catch (e) {
        console.error('Failed to load reading tutor data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const startPassageSession = (passage, doc = documentInfo) => {
    if (!passage || !doc) return;

    const text = passage.text || passage.originalPassage || '';
    const split = text.match(/[^.!?]+[.!?]+/g) || [text];
    const cleanSentences = split.map((s) => s.trim()).filter((s) => s.length > 0);

    // 지문 라벨: DB에 저장된 displayLabel 우선, 없으면 번호 기반
    const baseLabel = passage.displayLabel && passage.displayLabel.trim()
      ? passage.displayLabel.trim()
      : `지문 ${passage.passageNumber}`;

    setSentences(cleanSentences);
    setSelectedPassage(passage);
    setCurrentStep(-1);
    setViewMode('chat');

    setHistory([
      {
        role: 'ai',
        text: `안녕하세요! 오늘 공부할 지문은 "${doc.title}"의 ${baseLabel}이에요. 총 ${cleanSentences.length}문장으로 이루어져 있어요. 차근차근 읽어볼까요?`,
        options: [{ label: '네, 시작해요! 🚀', action: 'start_reading' }]
      }
    ]);
  };

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
      const lastAiMsg = history[history.length - 1] || {};
      const contextSentence = lastAiMsg.context?.sentence || sentences[currentStep] || '';
      
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

  // 1단계: 지문(문제) 선택 화면
  if (viewMode === 'select') {
    return (
      <div style={styles.chatContainer}>
        <div style={styles.chatHeader}>
          <button onClick={() => window.history.back()} style={styles.backButton}>
            ← 나가기
          </button>
          <h2 style={styles.chatTitle}>독해 튜터 🤖</h2>
        </div>

        <div style={styles.passageList}>
          <h3 style={styles.passageTitle}>
            {documentInfo?.title || '문서를 불러오는 중이에요.'}
          </h3>
          <p style={styles.passageSubtitle}>
            아래에서 공부할 지문(문제 번호)을 선택해 주세요.
          </p>

          <div style={styles.passageGrid}>
            {passages.map((p) => (
              <button
                key={p.passageNumber}
                style={styles.passageCard}
                onClick={() => startPassageSession(p)}
              >
                <div style={styles.passageBadge}>
                  {(p.displayLabel && p.displayLabel.trim()) || `지문 ${p.passageNumber}`}
                </div>
                <div style={styles.passageExcerpt}>{p.excerpt || (p.text || '').slice(0, 80) + '...'}</div>
                <div style={styles.passageMeta}>
                  단어 {p.wordCount || 0}개 · 문자 {p.charCount || 0}자
                </div>
              </button>
            ))}
            {passages.length === 0 && (
              <div style={styles.empty}>
                아직 이 문서에서 읽을 지문을 찾지 못했어요.<br />
                업로드한 문서 형식을 한 번만 다시 확인해 주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2단계: 선택한 지문에 대한 대화형 독해 튜터
  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <button
          onClick={() => {
            setViewMode('select');
            setSelectedPassage(null);
            setSentences([]);
            setHistory([]);
            setCurrentStep(-1);
          }}
          style={styles.backButton}
        >
          ← 지문 선택으로
        </button>
        <h2 style={styles.chatTitle}>
          독해 튜터 🤖
          {selectedPassage
            ? ` · ${(selectedPassage.displayLabel && selectedPassage.displayLabel.trim()) || `지문 ${selectedPassage.passageNumber}`}`
            : ''}
        </h2>
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
  passageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  passageTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#e2e8f0',
    fontWeight: 700
  },
  passageSubtitle: {
    marginTop: '8px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#94a3b8'
  },
  passageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
    marginTop: '8px'
  },
  passageCard: {
    textAlign: 'left',
    background: 'linear-gradient(145deg, #111827, #020617)',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '14px',
    color: '#e2e8f0',
    cursor: 'pointer'
  },
  passageBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    background: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  passageExcerpt: {
    fontSize: '13px',
    lineHeight: 1.5,
    marginBottom: '8px',
    color: '#cbd5f5'
  },
  passageMeta: {
    fontSize: '12px',
    color: '#64748b'
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
