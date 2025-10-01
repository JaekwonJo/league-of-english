import React from 'react';

const VocabularyPage = () => {
  return (
    <div style={styles.container}>
      <h1>📖 단어 시험</h1>
      <div style={styles.card}>
        <p>단어 시험 기능 준비 중입니다.</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '30px',
    marginTop: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  }
};

export default VocabularyPage;