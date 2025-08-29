import React from 'react';

const StudyResult = ({ results, onRestart, onHome }) => {
  const getGrade = (accuracy) => {
    if (accuracy >= 90) return { grade: 'A+', color: '#10B981' };
    if (accuracy >= 80) return { grade: 'A', color: '#3B82F6' };
    if (accuracy >= 70) return { grade: 'B', color: '#8B5CF6' };
    if (accuracy >= 60) return { grade: 'C', color: '#F59E0B' };
    return { grade: 'D', color: '#EF4444' };
  };

  const gradeInfo = getGrade(parseFloat(results.accuracy));

  return (
    <div style={styles.container}>
      <div style={styles.resultCard}>
        <h1 style={styles.title}>학습 완료! 🎉</h1>
        
        <div style={styles.gradeSection}>
          <div style={{ ...styles.grade, color: gradeInfo.color }}>
            {gradeInfo.grade}
          </div>
          <div style={styles.accuracy}>{results.accuracy}%</div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>맞춘 문제</span>
            <span style={styles.statValue}>
              {results.totalCorrect} / {results.totalProblems}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>소요 시간</span>
            <span style={styles.statValue}>{results.totalTime}초</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>획득 포인트</span>
            <span style={styles.statValue}>+{results.earnedPoints} LP</span>
          </div>
        </div>

        <div style={styles.problemList}>
          <h3 style={styles.listTitle}>문제별 결과</h3>
          {results.problems.map((problem, idx) => (
            <div key={idx} style={styles.problemItem}>
              <span style={styles.problemNumber}>#{idx + 1}</span>
              <span style={styles.problemType}>{problem.type}</span>
              {problem.isCorrect ? (
                <span style={styles.correct}>✅ 정답</span>
              ) : (
                <span style={styles.wrong}>❌ 오답</span>
              )}
            </div>
          ))}
        </div>

        <div style={styles.actions}>
          <button style={styles.restartButton} onClick={onRestart}>
            다시 풀기
          </button>
          <button style={styles.homeButton} onClick={onHome}>
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px'
  },
  resultCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '28px',
    textAlign: 'center',
    marginBottom: '30px'
  },
  gradeSection: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  grade: {
    fontSize: '72px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  accuracy: {
    fontSize: '24px',
    color: '#6B7280'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  statItem: {
    textAlign: 'center',
    padding: '15px',
    background: '#F9FAFB',
    borderRadius: '10px'
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '5px'
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  problemList: {
    marginBottom: '30px'
  },
  listTitle: {
    fontSize: '16px',
    marginBottom: '15px'
  },
  problemItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #E5E7EB'
  },
  problemNumber: {
    fontWeight: 'bold',
    marginRight: '10px'
  },
  problemType: {
    flex: 1,
    color: '#6B7280'
  },
  correct: {
    color: '#10B981'
  },
  wrong: {
    color: '#EF4444'
  },
  actions: {
    display: 'flex',
    gap: '10px'
  },
  restartButton: {
    flex: 1,
    padding: '15px',
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  homeButton: {
    flex: 1,
    padding: '15px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default StudyResult;