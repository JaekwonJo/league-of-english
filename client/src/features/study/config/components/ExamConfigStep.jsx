import React from 'react';
import styles from '../configStyles';

const ExamConfigStep = ({ onStart, onBack }) => {
  const options = [
    { count: 5, label: '가볍게 5문제', desc: '자투리 시간에 빠르게!', icon: '🥉', color: 'var(--success)' },
    { count: 10, label: '적당히 10문제', desc: '집중력을 발휘해 봐요.', icon: '🥈', color: 'var(--indigo)' },
    { count: 20, label: '도전 20문제', desc: '실전처럼 풀어보세요!', icon: '🥇', color: 'var(--accent-primary)' },
  ];

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitleRow}>
        <h3 style={styles.sectionTitle}>3단계 · 문항 수 선택</h3>
      </div>
      <p style={styles.sectionHint}>한 번에 풀고 싶은 문제 개수를 선택해 주세요.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {options.map((opt) => (
          <button
            key={opt.count}
            type="button"
            className="tilt-hover"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '24px',
              borderRadius: '20px',
              border: '1px solid var(--surface-border)',
              background: 'var(--surface-card)',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onStart({ type: 'exam', count: opt.count })}
          >
            <div style={{ fontSize: '32px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>{opt.icon}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>{opt.label}</div>
              <div style={{ fontSize: '14px', color: 'var(--tone-strong)', lineHeight: 1.5 }}>{opt.desc}</div>
            </div>
            <div style={{ 
              marginTop: '12px', 
              padding: '6px 16px', 
              borderRadius: '99px', 
              background: opt.color, 
              color: '#fff', 
              fontSize: '13px', 
              fontWeight: 700 
            }}>
              START
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button type="button" style={styles.secondaryButton} onClick={onBack}>
          ← 유형 다시 고르기
        </button>
      </div>
    </div>
  );
};

export default ExamConfigStep;
