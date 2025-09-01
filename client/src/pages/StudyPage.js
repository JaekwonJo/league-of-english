/**
 * StudyPage 컴포넌트
 * 문제 풀이 페이지 (500줄 이하)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import problemRegistry from '../services/problemRegistry';
import StudyConfig from '../components/study/StudyConfig';
import ProblemDisplay from '../components/study/ProblemDisplay';
import StudyResult from '../components/study/StudyResult';
import logger from '../utils/logger';

const StudyPage = () => {
  const { user } = useAuth();
  
  // 상태 관리
  const [mode, setMode] = useState('config'); // config, study, result
  const [config, setConfig] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeSpent, setTimeSpent] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 타이머
  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    if (mode === 'study' && !startTime) {
      setStartTime(Date.now());
      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, startTime]);

  /**
   * 학습 시작
   */
  const startStudy = async (studyConfig) => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Starting study with config:', studyConfig);

      // types 객체를 배열로 변환 (0보다 큰 값을 가진 키들만)
      const selectedTypes = Object.keys(studyConfig.types).filter(
        type => studyConfig.types[type] > 0
      );
      
      logger.info('Selected types:', selectedTypes);

      // 총 문제 개수 계산
      const totalCount = Object.values(studyConfig.types).reduce((sum, count) => sum + count, 0);
      
      // 문제 가져오기
      const response = await api.problems.getSmartProblems({
        documentId: studyConfig.documentId,
        types: selectedTypes,
        count: totalCount,
        orderDifficulty: studyConfig.orderDifficulty || 'basic',
        insertionDifficulty: studyConfig.insertionDifficulty || 'basic'
      });

      if (!response.problems || response.problems.length === 0) {
        throw new Error('문제를 가져올 수 없습니다.');
      }

      // 문제 처리 (레지스트리 사용)
      const processedProblems = response.problems.map(problem => 
        problemRegistry.executeHandler(problem.type, problem)
      );

      setProblems(processedProblems);
      setConfig(studyConfig);
      setMode('study');
      setStartTime(Date.now());
      
      logger.info(`Loaded ${processedProblems.length} problems`);
    } catch (err) {
      logger.error('Failed to start study:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 답안 제출
   */
  const handleAnswer = (answer) => {
    const problem = problems[currentIndex];
    const currentProblemTime = Date.now() - (startTime + (timeSpent[currentIndex] || 0));
    
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: answer
    }));
    
    setTimeSpent(prev => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || 0) + currentProblemTime
    }));

    logger.debug(`Answer submitted for problem ${currentIndex}:`, answer);
  };

  /**
   * 다음 문제
   */
  const nextProblem = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishStudy();
    }
  };

  /**
   * 이전 문제
   */
  const prevProblem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  /**
   * 학습 완료
   */
  const finishStudy = async () => {
    try {
      setLoading(true);
      const studyResults = [];

      // 각 문제 채점
      for (let i = 0; i < problems.length; i++) {
        const problem = problems[i];
        const userAnswer = answers[i];
        const time = timeSpent[i] || 0;

        // 레지스트리의 검증기 사용
        const isCorrect = problemRegistry.validate(
          problem.type,
          userAnswer,
          problem.answer
        );

        studyResults.push({
          problemId: problem.id,
          type: problem.type,
          question: problem.question,
          userAnswer,
          correctAnswer: problem.answer,
          isCorrect,
          timeSpent: Math.round(time / 1000)
        });

        // 서버에 결과 전송
        if (problem.id) {
          await api.problems.submit({
            problemId: problem.id,
            userAnswer,
            timeSpent: Math.round(time / 1000)
          });
        }
      }

      // 통계 계산
      const totalCorrect = studyResults.filter(r => r.isCorrect).length;
      const accuracy = (totalCorrect / studyResults.length * 100).toFixed(1);
      const totalTime = Object.values(timeSpent).reduce((a, b) => a + b, 0);

      setResults({
        problems: studyResults,
        totalCorrect,
        totalProblems: studyResults.length,
        accuracy,
        totalTime: Math.round(totalTime / 1000),
        earnedPoints: totalCorrect * 10 - (studyResults.length - totalCorrect) * 5
      });

      setMode('result');
      logger.info('Study completed:', { totalCorrect, accuracy });
    } catch (err) {
      logger.error('Failed to finish study:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 재시작
   */
  const restart = () => {
    setMode('config');
    setProblems([]);
    setCurrentIndex(0);
    setAnswers({});
    setTimeSpent({});
    setResults(null);
    setStartTime(null);
    setCurrentTime(null);
  };

  // 렌더링
  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>처리 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <h2>오류 발생</h2>
        <p>{error}</p>
        <button onClick={restart} style={styles.button}>
          다시 시작
        </button>
      </div>
    );
  }

  // 모드별 렌더링
  switch (mode) {
    case 'config':
      return <StudyConfig onStart={startStudy} />;

    case 'study':
      return (
        <ProblemDisplay
          problem={problems[currentIndex]}
          currentIndex={currentIndex}
          totalProblems={problems.length}
          userAnswer={answers[currentIndex]}
          onAnswer={handleAnswer}
          onNext={nextProblem}
          onPrev={prevProblem}
          onFinish={finishStudy}
          timeElapsed={currentTime ? Math.round((currentTime - startTime) / 1000) : 0}
        />
      );

    case 'result':
      return (
        <StudyResult
          results={results}
          onRestart={restart}
          onHome={() => window.location.href = '/'}
        />
      );

    default:
      return null;
  }
};

const styles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '20px',
    maxWidth: '500px',
    margin: '50px auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px'
  }
};

export default StudyPage;