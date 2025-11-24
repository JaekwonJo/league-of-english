import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.service';
import GeminiChatModal from '../components/common/GeminiChatModal';

const ReadingTutorPage = () => {
  // Parse ID manually if router not fully integrated
  const parts = window.location.pathname.split('/');
  const documentId = parts[parts.length - 1];

  const [passages, setPassages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0); // 0 to n (sentences)
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        setLoading(true);
        const res = await api.documents.get(documentId);
        if (res) {
          // Basic split for now, ideally use newPdfParser logic or pre-parsed data
          const text = res.content; 
          // Simple sentence split for demo
          const split = text.match(/[^.!?]+[.!?]+/g) || [text];
          setSentences(split.map(s => s.trim()).filter(s => s.length > 0));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [documentId]);

  const handleNext = () => {
    if (currentStep < sentences.length - 1) {
      setCurrentStep(p => p + 1);
    } else {
      // Final Review Phase
      setActiveChat({
        topic: '지문 전체 리뷰 및 문제 풀이',
        context: {
          problem: { type: 'reading_review' },
          question: '이 지문의 핵심 내용과 문제를 알려주세요.',
          passage: sentences.join(' '),
          answer: '',
          explanation: ''
        }
      });
    }
  };

  const currentSentence = sentences[currentStep] || "End of Document";
  const isLastStep = currentStep >= sentences.length - 1;
  const progress = Math.min(100, ((currentStep + 1) / sentences.length) * 100);

  if (loading) return <div style={{padding:40, textAlign:'center'}}>로딩 중...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, width: `${progress}%`}}></div>
      </div>

      <div style={styles.card}>
        <div style={styles.sentenceDisplay}>
          {currentSentence}
        </div>
        
        <div style={styles.controls}>
          <button style={styles.actionBtn} onClick={() => setActiveChat({
            topic: '문장 해석 요청',
            context: {
              problem: { type: 'reading_tutor' },
              question: '이 문장을 한국어로 해석해주세요.',
              passage: currentSentence,
              answer: '',
              explanation: ''
            }
          })}>
            🇰🇷 해석 보기
          </button>
          <button style={styles.actionBtn} onClick={() => setActiveChat({
            topic: '문법 분석 요청',
            context: {
              problem: { type: 'reading_tutor' },
              question: '이 문장의 문법 구조를 분석해주세요.',
              passage: currentSentence,
              answer: '',
              explanation: ''
            }
          })}>
            🔍 문법 분석
          </button>
          <button style={styles.actionBtn} onClick={() => setActiveChat({
            topic: '단어장 요청',
            context: {
              problem: { type: 'reading_tutor' },
              question: '이 문장의 핵심 단어를 표로 정리해주세요.',
              passage: currentSentence,
              answer: '',
              explanation: ''
            }
          })}>
            📝 단어장
          </button>
        </div>

        <div style={styles.navRow}>
          <button 
            style={styles.navBtn} 
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
          >
            이전 문장
          </button>
          <button 
            style={{...styles.navBtn, background: 'var(--accent-primary)', color: 'white', border: 'none'}} 
            onClick={handleNext}
          >
            {isLastStep ? '전체 리뷰 & 문제 풀기 🚀' : '다음 문장'}
          </button>
        </div>
      </div>

      {activeChat && (
        <GeminiChatModal
          isOpen={!!activeChat}
          onClose={() => setActiveChat(null)}
          initialTopic={activeChat.topic}
          context={activeChat.context}
          onAction={(option) => {
            if (option.action && option.action.startsWith('save_vocab_')) {
              const [_, term, meaning] = option.action.split('_vocab_')[1].split('_');
              api.post('/vocabulary/my/save', { term, meaning })
                .then(() => alert(`'${term}' 단어장에 저장 완료! 📝`))
                .catch(() => alert('저장 실패'));
              return true; // Handled
            }
            return false;
          }}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  progressBar: {
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    marginBottom: '30px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent-primary)',
    transition: 'width 0.3s ease'
  },
  card: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    padding: '32px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sentenceDisplay: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#f8fafc',
    lineHeight: '1.6',
    textAlign: 'center',
    minHeight: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px'
  },
  actionBtn: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#cbd5e1',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px'
  },
  navBtn: {
    padding: '12px 24px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default ReadingTutorPage;
