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
        title="기록소 📜"
        subtitle="나의 모든 학습 여정과 AI 대화 기록을 모아두었어요."
      />

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button style={styles.tabActive}>💬 AI 수업 기록</button>
        <button style={styles.tabInactive} onClick={() => window.location.href = '/study/history'}>📝 문제 풀이 기록</button>
      </div>

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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '24px'
  },
  item: {
    background: 'linear-gradient(145deg, var(--surface-card) 0%, rgba(30, 41, 59, 0.8) 100%)',
    backdropFilter: 'blur(12px)',
    padding: '24px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    border: '1px solid var(--surface-border)',
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  icon: {
    fontSize: '28px',
    background: 'rgba(99, 102, 241, 0.1)',
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-primary)'
  },
  info: {
    flex: 1,
    minWidth: 0
  },
  topic: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  date: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  arrow: {
    color: 'var(--accent-primary)',
    fontWeight: 'bold',
    fontSize: '18px',
    alignSelf: 'center'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-secondary)',
    background: 'var(--surface-soft)',
    borderRadius: '24px',
    marginTop: '20px'
  },
  tabActive: {
    padding: '12px 24px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--violet) 100%)',
    color: 'white',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
    transition: 'transform 0.2s'
  },
  tabInactive: {
    padding: '12px 24px',
    borderRadius: '999px',
    background: 'var(--surface-card)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};

export default AITutorHistoryPage;
