import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProblemDisplay from '../problem/ProblemDisplay';
import ScoreHUD from '../../../components/study/ScoreHUD';
import { formatSeconds } from '../../../hooks/useStudySession';
import GenerationSummary from './GenerationSummary';
import { studyModeStyles as styles } from '../styles/viewStyles';

const StudyModeView = ({
  problems,
  answers,
  allAnswered,
  progressPercent,
  timeLeft,
  initialTimeLeft,
  elapsedSeconds,
  onAnswer,
  onFinish,
  onRestart,
  generationLog,
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 280);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const renderedProblems = useMemo(() => {
    if (!Array.isArray(problems)) return [];
    return problems.map((problem, index) => (
      <ProblemDisplay
        key={problem.id || `${problem.type}-${index}`}
        problem={problem}
        problemIndex={index}
        totalProblems={problems.length}
        userAnswer={answers[index]}
        onAnswer={onAnswer}
        displayMode="list"
      />
    ));
  }, [answers, onAnswer, problems]);

  return (
    <>
      <div style={styles.wrapper}>
        {Array.isArray(generationLog) && generationLog.length > 0 && (
          <GenerationSummary logs={generationLog} />
        )}

        <div style={styles.header}>
          <button
            type="button"
            className="no-print"
            style={styles.resetButton}
            onClick={() => {
              if (window.confirm('학습을 처음부터 다시 시작하면 지금까지 푼 문제가 모두 초기화돼요. 계속할까요?')) {
                onRestart();
              }
            }}
          >
            처음부터 다시 풀기
          </button>
          <ScoreHUD timeElapsed={elapsedSeconds} />
        </div>

        {initialTimeLeft > 0 && (
          <div style={styles.progressSection}>
            <div style={styles.progressBarOuter}>
              <div style={{ ...styles.progressBarInner, width: `${progressPercent}%` }} />
            </div>
            <div style={styles.progressLabels}>
              <span>남은 시간 {formatSeconds(timeLeft)}</span>
              <span>전체 {formatSeconds(initialTimeLeft)}</span>
            </div>
          </div>
        )}

        <div style={styles.problemList}>{renderedProblems}</div>

        <div style={styles.submitBar}>
          <div style={styles.submitHint}>
            {allAnswered
              ? '모든 문제를 확인했어요! 마무리 버튼을 눌러 주세요.'
              : '아직 풀지 않은 문제가 있어요. 버튼을 누르면 번호를 알려드릴게요.'}
          </div>
          <button
            type="button"
            style={{
              ...styles.submitButton,
              ...(allAnswered ? {} : styles.submitButtonDisabled),
            }}
            onClick={onFinish}
          >
            전체 마무리하기
          </button>
        </div>
      </div>

      {showScrollTop && (
        <button
          type="button"
          style={styles.scrollTopButton}
          onClick={scrollToTop}
          aria-label="맨 위로 이동"
        >
          ↑
        </button>
      )}
    </>
  );
};

export default StudyModeView;
