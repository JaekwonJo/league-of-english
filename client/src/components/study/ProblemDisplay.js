import React, { useState, useEffect } from 'react';

const ProblemDisplay = ({
  problem,
  currentIndex,
  totalProblems,
  userAnswer,
  onAnswer,
  onNext,
  onPrev,
  onFinish,
  timeElapsed
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer || '');

  useEffect(() => {
    setSelectedAnswer(userAnswer || '');
  }, [userAnswer, currentIndex]);

  const handleSelect = (answer) => {
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!problem) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.progress}>
          문제 {currentIndex + 1} / {totalProblems}
        </div>
        <div style={styles.timer}>
          ⏱️ {formatTime(timeElapsed)}
        </div>
      </div>

      <div style={styles.problemCard}>
        <div style={styles.instruction}>
          {problem.instruction || problem.question}
        </div>

        {problem.mainText && (
          <div style={styles.mainText}>{problem.mainText}</div>
        )}

        {problem.sentenceToInsert && (
          <div style={styles.insertText}>
            [삽입할 문장] {problem.sentenceToInsert}
          </div>
        )}

        {problem.sentences && (
          <div style={styles.sentences}>
            {problem.sentences.map((sent, idx) => (
              <div key={idx} style={styles.sentence}>
                <strong>{sent.label}</strong> {sent.text}
              </div>
            ))}
          </div>
        )}

        <div style={styles.options}>
          {(problem.options || []).map((option, idx) => (
            <button
              key={idx}
              style={{
                ...styles.optionButton,
                ...(selectedAnswer === (idx + 1).toString() ? styles.selected : {})
              }}
              onClick={() => handleSelect((idx + 1).toString())}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.navigation}>
        <button
          style={styles.navButton}
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          이전
        </button>
        
        {currentIndex === totalProblems - 1 ? (
          <button
            style={styles.finishButton}
            onClick={onFinish}
            disabled={!selectedAnswer}
          >
            제출하기
          </button>
        ) : (
          <button
            style={styles.nextButton}
            onClick={onNext}
            disabled={!selectedAnswer}
          >
            다음
          </button>
        )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  progress: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  timer: {
    fontSize: '18px',
    color: '#667eea'
  },
  problemCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  instruction: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#111827'
  },
  mainText: {
    fontSize: '15px',
    lineHeight: '1.8',
    marginBottom: '20px',
    padding: '20px',
    background: '#F9FAFB',
    borderRadius: '10px'
  },
  insertText: {
    fontSize: '15px',
    padding: '15px',
    background: '#FEF3C7',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  sentences: {
    marginBottom: '20px'
  },
  sentence: {
    fontSize: '15px',
    lineHeight: '1.8',
    marginBottom: '10px'
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  optionButton: {
    padding: '15px',
    background: 'white',
    border: '2px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s'
  },
  selected: {
    background: '#EBF5FF',
    borderColor: '#3B82F6'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px'
  },
  navButton: {
    padding: '12px 24px',
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  nextButton: {
    padding: '12px 24px',
    background: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  finishButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default ProblemDisplay;