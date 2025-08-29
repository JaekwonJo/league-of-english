import React from 'react';

const RankingPage = () => {
  return (
    <div style={styles.container}>
      <h1>🏆 랭킹</h1>
      <div style={styles.card}>
        <p>랭킹 시스템 준비 중입니다.</p>
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
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginTop: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  }
};

export default RankingPage;