import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProblemDisplay from '../problem/ProblemDisplay';
import { reviewModeStyles as styles, studyModeStyles } from '../styles/viewStyles';

const buildReviewItems = (results) => {
  if (!results) return [];
  const baseList = Array.isArray(results.studyResults)
    ? results.studyResults
    : Array.isArray(results.problems)
      ? results.problems
      : [];

  return baseList
    .map((entry, index) => {
      const baseProblem = entry?.problem || {};
      const mergedMetadata = {
        ...(baseProblem.metadata || {}),
        reviewOrder: index + 1,
      };

      if (!mergedMetadata.problemNumber) {
        mergedMetadata.problemNumber = `${index + 1}/${baseList.length}`;
      }

      return {
        problem: { ...baseProblem, metadata: mergedMetadata },
        userAnswer: entry?.userAnswer,
        correctAnswer: entry?.correctAnswer,
        isCorrect: entry?.isCorrect,
        timeSpent: entry?.timeSpent,
      };
    })
    .filter((item) => item.problem && Object.keys(item.problem).length > 0);
};

const ReviewModeView = ({ results, onBack, onRestart, onGeminiAsk }) => {
  const reviewItems = useMemo(() => buildReviewItems(results), [results]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 240);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button
          type="button"
          style={{
            ...styles.navButton,
            background: 'var(--accent-soft-strong)',
            color: 'var(--accent-strong)'
          }}
          onClick={onBack}
          onMouseOver={(event) => {
            event.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(event) => {
            event.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⬅️ 결과로 돌아가기
        </button>
        <div style={styles.title}>📘 복습 모드</div>
        <button
          type="button"
          style={{
            ...styles.navButton,
            background: 'var(--success-gradient)',
            color: 'var(--text-inverse)'
          }}
          onClick={onRestart}
          onMouseOver={(event) => {
            event.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(event) => {
            event.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🔄 처음부터 다시 풀기
        </button>
      </div>

      {reviewItems.length === 0 ? (
        <div style={styles.emptyState}>복습할 문제가 아직 없어요. 먼저 문제를 풀고 다시 시도해 주세요!</div>
      ) : (
        <div style={styles.reviewList}>
          {reviewItems.map((item, index) => (
            <ProblemDisplay
              key={item.problem?.id || `review-${index}`}
              problem={item.problem}
              problemIndex={index}
              totalProblems={reviewItems.length}
              userAnswer={item.userAnswer}
              displayMode="review"
              onGeminiAsk={onGeminiAsk}
              reviewMeta={{
                isCorrect: item.isCorrect,
                timeSpent: item.timeSpent,
                correctAnswer: item.correctAnswer,
              }}
            />
          ))}
        </div>
      )}

      {showScrollTop ? (
        <button
          type="button"
          aria-label="맨 위로 이동"
          style={{
            ...studyModeStyles.scrollTopButton,
            color: '#ffffff',
            background: 'rgba(99, 102, 241, 0.9)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
          onClick={handleScrollTop}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ↑
        </button>
      ) : null}
    </div>
  );
};

export default ReviewModeView;
