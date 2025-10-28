import React from 'react';

const StatsPage = () => {
  return (
    <div style={styles.container}>
      <h1>📊 통계</h1>
      <div style={styles.card}>
        <p>상세 통계 대시보드를 준비하고 있어요. 🛠️</p>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          11월 베타 업데이트에서 선생님·부모님 계정으로 로그인하면 우리 반 학생들의 학습 요약과 문제 유형별 성취도를 한눈에 볼 수 있도록 제공할 예정입니다.
        </p>
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

export default StatsPage;
