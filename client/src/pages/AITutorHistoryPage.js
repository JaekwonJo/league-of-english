import React, { useState, useEffect } from 'react';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';
import GeminiChatModal from '../components/common/GeminiChatModal';

const AITutorHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const res = await api.get('/study/tutor/history'); // Need to implement this in api.service
        if (res?.sessions) {
          setHistory(res.sessions);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const handleOpenSession = async (sessionId) => {
    try {
      const res = await api.get(`/study/tutor/history/${sessionId}`); // Need to implement
      if (res?.session) {
        setSelectedSession(res.session);
      }
    } catch (e) {
      alert('대화 내용을 불러오지 못했어요.');
    }
  };

  return (
    <div style={styles.container}>
      <CommonHero
        title="내 수업 기록 📜"
        subtitle="제미나이 선생님과 함께 공부했던 내용을 복습해보세요."
      />

      {loading ? (
        <div style={styles.empty}>기록을 불러오는 중...</div>
      ) : history.length === 0 ? (
        <div style={styles.empty}>아직 수업 기록이 없어요. 튜터와 대화를 시작해보세요!</div>
      ) : (
        <div style={styles.list}>
          {history.map((session) => (
            <div 
              key={session.id} 
              className="tilt-hover" 
              style={styles.item}
              onClick={() => handleOpenSession(session.id)}
            >
              <div style={styles.icon}>💬</div>
              <div style={styles.info}>
                <div style={styles.topic}>{session.topic || '무제'}</div>
                <div style={styles.date}>{new Date(session.last_message_at).toLocaleString()}</div>
              </div>
              <div style={styles.arrow}>➜</div>
            </div>
          ))}
        </div>
      )}

      {selectedSession && (
        <GeminiChatModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          initialTopic={selectedSession.topic}
          historyOverride={selectedSession.history} // Need to support this prop
          readOnly={true} // Or allow continue? Let's allow continue for now
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px'
  },
  item: {
    background: 'var(--surface-card)',
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid var(--surface-border)',
    cursor: 'pointer'
  },
  icon: {
    fontSize: '24px',
    opacity: 0.7
  },
  info: {
    flex: 1
  },
  topic: {
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  },
  date: {
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  arrow: {
    color: 'var(--text-muted)',
    fontWeight: 'bold'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-secondary)'
  }
};

export default AITutorHistoryPage;
