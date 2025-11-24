import React from 'react';
import { useNavigate } from 'react-router-dom'; // Use customized navigation if standard
import CommonHero from '../components/common/CommonHero';

const AITutorHubPage = () => {
  // Since we use window.location usually, let's stick to that or consistent router
  const navigate = (path) => window.location.href = path;

  return (
    <div style={styles.container}>
      <CommonHero
        title="AI 튜터 센터 🤖"
        subtitle="문법 개념부터 지문 독해까지, 제미나이 선생님과 1:1로 공부하세요."
      />

      <div style={styles.grid}>
        <div className="tilt-hover" style={styles.card} onClick={() => navigate('/grammar-tutor')}>
          <div style={styles.iconWrapper}>💬</div>
          <div style={styles.textWrapper}>
            <h3 style={styles.cardTitle}>문법 튜터</h3>
            <p style={styles.cardDesc}>중학 영문법 핵심 개념을 대화하며 배워요.</p>
          </div>
          <div style={styles.arrow}>➜</div>
        </div>

        <div className="tilt-hover" style={styles.card} onClick={() => navigate('/reading-tutor-select')}>
          <div style={{...styles.iconWrapper, background: 'rgba(16, 185, 129, 0.15)'}}>📖</div>
          <div style={styles.textWrapper}>
            <h3 style={styles.cardTitle}>독해 튜터 (NEW)</h3>
            <p style={styles.cardDesc}>교과서/모의고사 지문을 한 문장씩 뽀개드려요.</p>
          </div>
          <div style={styles.arrow}>➜</div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  grid: {
    display: 'grid',
    gap: '20px',
    marginTop: '30px'
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    cursor: 'pointer',
    border: '1px solid var(--surface-border)',
    transition: 'transform 0.2s ease'
  },
  iconWrapper: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px'
  },
  textWrapper: {
    flex: 1
  },
  cardTitle: {
    margin: '0 0 6px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  cardDesc: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  arrow: {
    fontSize: '20px',
    color: 'var(--text-muted)',
    fontWeight: 'bold'
  }
};

export default AITutorHubPage;
