/**
 * StudyPage: 학습 문제를 구성하고 푸는 메인 페이지
 */

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import StudyConfig from "../components/study/StudyConfig";
import ProblemDisplay from "../components/study/ProblemDisplay";
import ScoreHUD from "../components/study/ScoreHUD";
import StudyResult from "../components/study/StudyResult";
import useStudySession, { formatSeconds } from "../hooks/useStudySession";
import { api } from "../services/api.service";

const TYPE_LABELS = {
  blank: '빈칸',
  order: '순서 배열',
  insertion: '문장 삽입',
  grammar: '어법',
  vocabulary: '어휘',
  title: '제목',
  theme: '주제',
  summary: '요약',
  implicit: '함축 의미',
  irrelevant: '무관 문장'
};

const VOCAB_FLASHCARDS = [
  { word: "construct", meaning: "구성하다, 건설하다" },
  { word: "ensure", meaning: "보장하다, 확실히 하다" },
  { word: "discard", meaning: "버리다, 폐기하다" },
  { word: "expand", meaning: "확장하다, 넓히다" },
  { word: "display", meaning: "전시하다, 드러내다" },
  { word: "integrate", meaning: "통합하다, 하나로 만들다" },
  { word: "mediate", meaning: "중재하다, 조정하다" },
  { word: "navigate", meaning: "길을 찾다, 항해하다" },
  { word: "observe", meaning: "관찰하다, 준수하다" },
  { word: "perceive", meaning: "인지하다, 파악하다" },
  { word: "reinforce", meaning: "강화하다, 보강하다" },
  { word: "sustain", meaning: "지속하다, 떠받치다" },
  { word: "transform", meaning: "변형시키다, 바꾸다" },
  { word: "undergo", meaning: "겪다, 경험하다" },
  { word: "violate", meaning: "위반하다, 침해하다" },
  { word: "allocate", meaning: "할당하다, 배분하다" },
  { word: "assess", meaning: "평가하다, 산정하다" },
  { word: "compile", meaning: "편집하다, 엮다" },
  { word: "depict", meaning: "묘사하다, 그리다" },
  { word: "emphasize", meaning: "강조하다" },
  { word: "facilitate", meaning: "촉진하다, 쉽게 하다" },
  { word: "generate", meaning: "생성하다, 만들어 내다" },
  { word: "illustrate", meaning: "설명하다, 예시를 들다" },
  { word: "justify", meaning: "정당화하다" },
  { word: "mitigate", meaning: "완화하다, 줄이다" },
  { word: "negotiate", meaning: "협상하다" },
  { word: "optimize", meaning: "최적화하다" },
  { word: "presume", meaning: "추정하다, 가정하다" },
  { word: "quantify", meaning: "수량화하다" },
  { word: "regulate", meaning: "규제하다, 조절하다" },
  { word: "synthesize", meaning: "종합하다, 합성하다" },
  { word: "trigger", meaning: "촉발하다, 유발하다" },
  { word: "uphold", meaning: "유지하다, 옹호하다" },
  { word: "withstand", meaning: "견디다, 버티다" },
  { word: "accumulate", meaning: "축적하다, 모으다" },
  { word: "clarify", meaning: "명확히 하다" },
  { word: "dedicate", meaning: "헌신하다, 바치다" },
  { word: "eliminate", meaning: "제거하다, 없애다" },
  { word: "formulate", meaning: "공식화하다, 만들어 내다" },
  { word: "highlight", meaning: "강조하다, 부각시키다" },
  { word: "immerse", meaning: "몰두하게 하다, 담그다" },
  { word: "moderate", meaning: "완화하다, 조절하다" },
  { word: "prohibit", meaning: "금지하다" },
  { word: "refine", meaning: "정제하다, 개선하다" },
  { word: "scrutinize", meaning: "면밀히 조사하다" },
  { word: "terminate", meaning: "종결하다, 끝내다" },
  { word: "validate", meaning: "검증하다, 입증하다" },
];

const REVEAL_STEP_SECONDS = 3;

const LOADING_SNIPPETS = [
  {
    type: 'message',
    text: '지금 당신만을 위한 문제를 정성껏 빚는 중이에요. 잠시만 기다려줘요 😊'
  },
  {
    type: 'quote',
    quote: 'The future depends on what you do today.',
    author: 'Mahatma Gandhi',
    translation: '미래는 오늘 당신이 하는 일에 달려 있어요.'
  },
  {
    type: 'message',
    text: 'AI 선생님이 해설까지 다시 확인하고 있어요! 준비되면 바로 시작할게요 ✨'
  },
  {
    type: 'quote',
    quote: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
    translation: '성공은 매일 반복되는 작은 노력들의 합이에요.'
  },
  {
    type: 'message',
    text: '따뜻한 햇살처럼 마음 편한 문제 세트를 데워 오는 중이에요 ☕'
  },
  {
    type: 'message',
    text: '은하수를 건너 감성 한 스푼을 더 담고 있어요. 조금만 더 기다려줄래요? 🌌'
  },
  {
    type: 'quote',
    quote: 'It always seems impossible until it is done.',
    author: 'Nelson Mandela',
    translation: '끝낼 때까지는 불가능해 보여도, 결국 우리는 해내게 되어 있어요.'
  },
  {
    type: 'quote',
    quote: 'You are never too small to make a difference.',
    author: 'Greta Thunberg',
    translation: '어떤 마음도 작지 않아요. 당신의 노력이 변화를 만들 거예요.'
  },
  {
    type: 'message',
    text: '문제에 쓸 향기로운 단어들을 고르고 있어요. 숨 한번 크게 쉬어볼까요? 🌿'
  },
  {
    type: 'message',
    text: '조용히 집중이 내려앉을 수 있게 창문을 살짝 열어두었어요. 곧 시작해요 💫'
  },
  {
    type: 'quote',
    quote: 'Learning never exhausts the mind.',
    author: 'Leonardo da Vinci',
    translation: '배움은 마음을 지치게 하지 않아요. 오히려 더 단단하게 만들어 주죠.'
  },
  {
    type: 'quote',
    quote: 'Stars can’t shine without darkness.',
    author: 'Unknown',
    translation: '밤이 있기에 별빛이 반짝여요. 지금의 고요도 반짝임의 준비랍니다.'
  },
  {
    type: 'message',
    text: '손에 쥔 연필이 조금 더 가벼워지도록 격려를 살짝 뿌려둘게요 ✏️'
  },
  {
    type: 'quote',
    quote: 'Every day is a chance to learn something new.',
    author: 'Unknown',
    translation: '매일은 새로운 것을 배울 수 있는 기회예요.'
  },
  {
    type: 'message',
    text: '지금 당신에게 꼭 맞는 문장을 찾는 중이에요. 조금만 더 기다려 주세요 🌈'
  },
  {
    type: 'quote',
    quote: 'The beautiful thing about learning is that no one can take it away from you.',
    author: 'B.B. King',
    translation: '배움의 아름다움은 누구도 그것을 빼앗을 수 없다는 데 있어요.'
  },
  {
    type: 'message',
    text: '창문에 빗방울처럼 잔잔한 아이디어를 모으는 중이에요 ☔️'
  }
];


const pickFlashcards = (count = 3, excludeWords = []) => {
  const excludeSet = new Set(excludeWords);
  const available = VOCAB_FLASHCARDS.filter((card) => !excludeSet.has(card.word));
  const basePool = available.length ? available : VOCAB_FLASHCARDS;
  const pool = [...basePool];
  const picked = [];

  while (pool.length && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }

  while (picked.length < count) {
    const fallback = VOCAB_FLASHCARDS[Math.floor(Math.random() * VOCAB_FLASHCARDS.length)];
    picked.push(fallback);
  }

  return picked.slice(0, count);
};

const LoadingState = ({ vocabCards = [], revealStepSeconds = REVEAL_STEP_SECONDS, onLoadMore }) => {
  const [countdowns, setCountdowns] = useState([]);
  const [snippetIndex, setSnippetIndex] = useState(() => Math.floor(Math.random() * LOADING_SNIPPETS.length));

  useEffect(() => {
    if (!vocabCards.length) {
      setCountdowns([]);
      return undefined;
    }

    const initial = vocabCards.map((_, index) => (index + 1) * revealStepSeconds);
    setCountdowns(initial);

    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next = prev.map((value) => (value > 0 ? value - 1 : 0));
        if (next.every((value) => value === 0)) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [vocabCards, revealStepSeconds]);

  useEffect(() => {
    if (!LOADING_SNIPPETS.length) return undefined;
    const interval = setInterval(() => {
      setSnippetIndex((prev) => (prev + 1) % LOADING_SNIPPETS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const activeSnippet = LOADING_SNIPPETS[snippetIndex] || null;

  return (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <div style={styles.loadingSnippet}>
        {activeSnippet?.type === 'quote' ? (
          <>
            <p style={styles.quoteText}>“{activeSnippet.quote}”</p>
            <p style={styles.quoteMeta}>- {activeSnippet.author} -</p>
            <p style={styles.quoteTranslation}>{activeSnippet.translation}</p>
          </>
        ) : (
          <p style={styles.loadingMessage}>{activeSnippet?.text || '문제를 준비하고 있어요! 잠시만 기다려 주세요 😊'}</p>
        )}
      </div>
      {vocabCards.length > 0 && (
        <div style={styles.flashcardArea}>
          <div style={styles.flashcardTitle}>기다리는 동안 단어 미리보기✨</div>
          <div style={styles.flashcardList}>
            {vocabCards.map(({ word, meaning }, index) => {
              const secondsRemaining = countdowns[index] !== undefined ? countdowns[index] : revealStepSeconds * (index + 1);
              const revealMeaning = secondsRemaining === 0;
              return (
                <div key={word} style={styles.flashcardItem}>
                  <div style={styles.flashcardWord}>{word}</div>
                  {revealMeaning ? (
                    <div style={styles.flashcardMeaning}>{meaning}</div>
                  ) : (
                    <div style={styles.flashcardCountdown}>{secondsRemaining}초 뒤에 뜻이 보여요</div>
                  )}
                </div>
              );
            })}
          </div>
          {typeof onLoadMore === 'function' && (
            <button style={styles.flashcardMoreButton} onClick={onLoadMore}>
              단어 더보기 +5
            </button>
          )}
        </div>
      )}
    </div>
  );
};


const ErrorState = ({ message, onRetry }) => (
  <div style={styles.error}>
    <h2>문제를 만들다가 잠시 멈췄어요 😢</h2>
    <p>{message}</p>
    <button onClick={onRetry} style={styles.button}>
      다시 시도하기
    </button>
  </div>
);

const ReviewCallout = ({ total, problems = [], loading, refreshing, error, onRefresh, onStart }) => (
  <div style={styles.reviewCallout}>
    <div style={styles.reviewCalloutHeader}>
      <div>
        <div style={styles.reviewBadge}>복습 대기열</div>
        <div style={styles.reviewCalloutTitle}>틀린 문제 {total || 0}문이 기다리고 있어요.</div>
        <div style={styles.reviewCalloutSubtitle}>버튼 한 번으로 다시 찬찬히 복습해 볼까요?</div>
      </div>
      <div style={styles.reviewActions}>
        <button
          type="button"
          style={{
            ...styles.reviewRefreshButton,
            ...(refreshing ? styles.reviewButtonDisabled : {})
          }}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? '불러오는 중…' : '새로고침'}
        </button>
        <button
          type="button"
          style={{
            ...styles.reviewStartButton,
            ...((loading || total <= 0) ? styles.reviewButtonDisabled : {})
          }}
          onClick={onStart}
          disabled={loading || total <= 0}
        >
          {loading ? '준비 중...' : '복습 대기열 시작'}
        </button>
      </div>
    </div>
    {error && (
      <div style={styles.reviewErrorBox} role="status" aria-live="polite">
        {error}
      </div>
    )}
    <div style={styles.reviewCalloutList}>
      {problems && problems.length ? (
        problems.map((item, index) => (
          <div key={item.id || `preview-${index}`} style={styles.reviewPreviewItem}>
            <div style={styles.reviewPreviewMeta}>
              <span style={styles.reviewPreviewType}>{TYPE_LABELS[item.type] || item.type}</span>
              {item.sourceLabel && <span style={styles.reviewPreviewSource}>{item.sourceLabel}</span>}
            </div>
            <div style={styles.reviewPreviewText}>{item.question || item.mainText || '문항 정보를 불러오고 있어요.'}</div>
          </div>
        ))
      ) : (
        <div style={styles.reviewEmptyPreview}>최근 틀린 문제가 없어요. 아주 잘하고 있어요! ✨</div>
      )}
    </div>
  </div>
);

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

  return (
    <>
      <div style={styles.studyWrapper}>
        <div style={styles.studyHeader}>
          <button
            className="no-print"
            onClick={() => {
              if (window.confirm("학습을 처음부터 다시 시작하면 지금까지 푼 문제가 모두 초기화돼요. 계속할까요?")) onRestart();
        }}
        style={styles.resetButton}
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

    <div style={styles.problemList}>
      {problems.map((problem, index) => (
        <ProblemDisplay
          key={problem.id || `${problem.type}-${index}`}
          problem={problem}
          problemIndex={index}
          totalProblems={problems.length}
          userAnswer={answers[index]}
          onAnswer={onAnswer}
          displayMode="list"
        />
      ))}
    </div>

    <div style={styles.submitBar}>
      <div style={styles.submitHint}>
        {allAnswered ? "모든 문제를 확인했어요! 마무리 버튼을 눌러 주세요." : "아직 풀지 않은 문제가 있어요. 모두 풀면 마무리 버튼이 열려요."}
      </div>
      <button
        style={{
          ...styles.submitButton,
          ...(allAnswered ? {} : styles.submitButtonDisabled),
        }}
        onClick={onFinish}
        disabled={!allAnswered}
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

const ReviewModeView = ({ results, onBack, onRestart }) => {
  const studyResults = Array.isArray(results?.studyResults)
    ? results.studyResults
    : Array.isArray(results?.problems)
      ? results.problems
      : [];

  const reviewItems = studyResults.map((entry, idx) => {
    const baseProblem = entry.problem || {};
    const mergedMetadata = {
      ...(baseProblem.metadata || {}),
      reviewOrder: idx + 1
    };
    if (!mergedMetadata.problemNumber) {
      mergedMetadata.problemNumber = `${idx + 1}/${studyResults.length}`;
    }
    const problem = {
      ...baseProblem,
      metadata: mergedMetadata
    };
    return {
      problem,
      userAnswer: entry.userAnswer,
      correctAnswer: entry.correctAnswer,
      isCorrect: entry.isCorrect,
      timeSpent: entry.timeSpent
    };
  }).filter((item) => item.problem && Object.keys(item.problem).length);

  return (
    <div style={styles.reviewWrapper}>
      <div style={styles.reviewHeader}>
        <button
          style={{ ...styles.reviewNavButton, background: 'var(--accent-soft-strong)', color: 'var(--accent-strong)' }}
          onClick={onBack}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          ⬅️ 결과로 돌아가기
        </button>
        <div style={styles.reviewTitle}>📘 복습 모드</div>
        <button
          style={{
            ...styles.reviewNavButton,
            background: 'var(--success-gradient)',
            color: 'var(--text-inverse)'
          }}
          onClick={onRestart}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          🔄 처음부터 다시 풀기
        </button>
      </div>

      {reviewItems.length === 0 ? (
        <div style={styles.reviewEmpty}>복습할 문제가 아직 없어요. 먼저 문제를 풀고 다시 시도해 주세요!</div>
      ) : (
        <div style={styles.reviewList}>
          {reviewItems.map((item, idx) => (
            <ProblemDisplay
              key={item.problem?.id || `review-${idx}`}
              problem={item.problem}
              problemIndex={idx}
              totalProblems={reviewItems.length}
              userAnswer={item.userAnswer}
              displayMode="review"
              reviewMeta={{
                isCorrect: item.isCorrect,
                timeSpent: item.timeSpent,
                correctAnswer: item.correctAnswer
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const StudyPage = () => {
  const { user, updateUser } = useAuth();
  const [loadingFlashcards, setLoadingFlashcards] = useState([]);
  const [reviewPreview, setReviewPreview] = useState({ total: 0, problems: [] });
  const [reviewPreviewLoading, setReviewPreviewLoading] = useState(false);
  const [reviewPreviewFetched, setReviewPreviewFetched] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [autoReviewTrigger, setAutoReviewTrigger] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'review';
    } catch (error) {
      return false;
    }
  });
  const {
    mode,
    problems,
    answers,
    results,
    loading,
    error,
    timeLeft,
    initialTimeLeft,
    elapsedSeconds,
    progressPercent,
    allAnswered,
    startStudy,
    handleAnswer,
    finishStudy,
    restart,
    enterReview,
    exitReview,
    startManualSession,
    setError,
  } = useStudySession(user, updateUser);

  const clearReviewQuery = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('mode')) {
        params.delete('mode');
        const next = params.toString();
        const base = `${window.location.pathname}${next ? `?${next}` : ''}`;
        window.history.replaceState({}, '', base);
      }
    } catch (error) {
      /* noop */
    }
  }, []);

  const refreshReviewPreview = useCallback(async () => {
    try {
      setReviewPreviewLoading(true);
      const response = await api.problems.reviewQueue({ limit: 3 });
      setReviewPreview({
        total: Number(response?.total) || 0,
        problems: Array.isArray(response?.problems) ? response.problems.slice(0, 3) : []
      });
      setReviewError('');
    } catch (error) {
      setReviewPreview({ total: 0, problems: [] });
      setReviewError(error?.message || '복습 대기열을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setReviewPreviewLoading(false);
      setReviewPreviewFetched(true);
    }
  }, []);

  const startReviewFromQueue = useCallback(async () => {
    if (reviewLoading) return;
    try {
      setReviewLoading(true);
      setError(null);
      const response = await api.problems.startReviewSession({ limit: 5 });
      const problems = Array.isArray(response?.problems) ? response.problems : [];
      if (!problems.length) {
        setReviewError('복습할 문제가 아직 없어요! 먼저 새로운 문제를 풀어주세요.');
        refreshReviewPreview();
        return;
      }
      startManualSession(problems);
      setReviewError('');
      refreshReviewPreview();
    } catch (error) {
      const message = error?.message || '복습 세트를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.';
      setReviewError(message);
    } finally {
      setReviewLoading(false);
      clearReviewQuery();
    }
  }, [reviewLoading, setError, startManualSession, refreshReviewPreview, clearReviewQuery]);
  
  useEffect(() => {
    if (loading && mode !== "study") {
      setLoadingFlashcards((prev) => (prev.length ? prev : pickFlashcards(5)));
    } else if (!loading) {
      setLoadingFlashcards([]);
    }
  }, [loading, mode]);

  useEffect(() => {
    if (mode === 'config' && !reviewPreviewFetched && !reviewPreviewLoading) {
      refreshReviewPreview();
    }
  }, [mode, reviewPreviewFetched, reviewPreviewLoading, refreshReviewPreview]);

  useEffect(() => {
    if (autoReviewTrigger && mode === 'config' && !reviewLoading) {
      startReviewFromQueue();
      setAutoReviewTrigger(false);
    }
  }, [autoReviewTrigger, mode, reviewLoading, startReviewFromQueue]);

  const handleLoadMoreFlashcards = useCallback(() => {
    setLoadingFlashcards((prev) => {
      const existingWords = prev.map((card) => card.word);
      const nextBatch = pickFlashcards(5, existingWords);
      return [...prev, ...nextBatch];
    });
  }, []);

  if ((loading && mode !== "study") || (reviewLoading && mode === 'config')) {
    return <LoadingState vocabCards={loadingFlashcards} onLoadMore={handleLoadMoreFlashcards} />;
  }

  if (error && mode !== "study") {
    return <ErrorState message={error} onRetry={() => { setError(null); restart(); }} />;
  }

  switch (mode) {
    case "config":
      return (
        <StudyConfig
          onStart={startStudy}
          headerSlot={(
            <ReviewCallout
              total={reviewPreview.total}
              problems={reviewPreview.problems}
              loading={reviewLoading}
              refreshing={reviewPreviewLoading}
              error={reviewError}
              onRefresh={refreshReviewPreview}
              onStart={startReviewFromQueue}
            />
          )}
        />
      );

    case "study":
      return (
        <StudyModeView
          problems={problems}
          answers={answers}
          allAnswered={allAnswered}
          progressPercent={progressPercent}
          timeLeft={timeLeft}
          initialTimeLeft={initialTimeLeft}
          elapsedSeconds={elapsedSeconds}
          onAnswer={handleAnswer}
          onFinish={finishStudy}
          onRestart={restart}
        />
      );

    case "review":
      return <ReviewModeView results={results} onBack={exitReview} onRestart={restart} />;

    case "result":
      return <StudyResult results={results} onRestart={restart} onReview={enterReview} onHome={() => (window.location.href = "/")} />;

    default:
      return null;
  }
};

const styles = {
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "24px",
    minHeight: "400px",
    textAlign: "center",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid var(--surface-border)",
    borderTop: "4px solid var(--accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingSnippet: {
    maxWidth: '520px',
    background: 'var(--surface-translucent-strong)',
    borderRadius: '18px',
    padding: '18px 22px',
    boxShadow: '0 16px 32px var(--surface-shadow)'
  },
  loadingMessage: {
    color: "var(--review-hint)",
    fontSize: "18px",
    fontWeight: 600,
    margin: 0
  },
  quoteText: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  quoteMeta: {
    margin: '6px 0 4px',
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  quoteTranslation: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  flashcardArea: {
    marginTop: "8px",
    background: "var(--surface-translucent)",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 18px 28px var(--surface-shadow)",
    width: "100%",
    maxWidth: "420px",
  },
  flashcardTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "12px",
  },
  flashcardList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  flashcardMoreButton: {
    marginTop: "16px",
    padding: "10px 18px",
    background: "var(--success-gradient)",
    color: "var(--text-inverse)",
    border: "none",
    borderRadius: "12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px var(--success-shadow)",
  },
  flashcardItem: {
    background: "var(--surface-contrast)",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "var(--text-inverse)",
    boxShadow: "0 10px 20px var(--surface-shadow)",
  },
  flashcardWord: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  flashcardMeaning: {
    fontSize: "14px",
    color: "var(--text-inverse)",
  },
  flashcardCountdown: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  reviewCallout: {
    marginBottom: "24px",
    padding: "24px",
    borderRadius: "18px",
    background: "var(--review-callout-bg)",
    border: "1px solid var(--glass-border)",
    boxShadow: "0 18px 40px var(--accent-shadow)",
    color: "var(--text-primary)",
  },
  reviewCalloutHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  reviewBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "999px",
    background: "var(--accent-soft-strong)",
    color: "var(--accent)",
    fontWeight: 700,
    fontSize: "12px",
    marginBottom: "8px",
    letterSpacing: "0.04em",
  },
  reviewCalloutTitle: {
    fontSize: "20px",
    fontWeight: 800,
    marginBottom: "4px",
    color: "var(--text-primary)",
  },
  reviewCalloutSubtitle: {
    fontSize: "14px",
    color: "var(--review-hint)",
  },
  reviewActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  reviewRefreshButton: {
    padding: "10px 20px",
    borderRadius: "12px",
    border: "1px solid var(--accent-soft-strong)",
    background: "var(--accent-soft-strong)",
    color: "var(--accent)",
    fontWeight: 600,
    cursor: "pointer",
  },
  reviewStartButton: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "var(--success-gradient)",
    color: "var(--text-inverse)",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 28px var(--success-shadow)",
  },
  reviewButtonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  reviewCalloutList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  reviewErrorBox: {
    marginBottom: "12px",
    padding: "12px 16px",
    borderRadius: "12px",
    background: "var(--danger-bg)",
    color: "var(--danger-text)",
    fontSize: "13px",
    lineHeight: 1.5,
    border: "1px solid var(--danger-border)"
  },
  reviewPreviewItem: {
    background: "var(--surface-translucent)",
    borderRadius: "14px",
    padding: "16px",
    border: "1px solid var(--surface-border)",
    boxShadow: "0 10px 24px var(--surface-shadow)",
  },
  reviewPreviewMeta: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "8px",
    flexWrap: "wrap",
  },
  reviewPreviewType: {
    padding: "4px 10px",
    borderRadius: "999px",
    background: "var(--accent-soft)",
    color: "var(--accent-strong)",
    fontSize: "12px",
    fontWeight: 700,
  },
  reviewPreviewSource: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  reviewPreviewText: {
    fontSize: "14px",
    color: "var(--text-primary)",
    lineHeight: 1.6,
  },
  reviewEmptyPreview: {
    textAlign: "center",
    padding: "24px",
    borderRadius: "14px",
    background: "var(--surface-overlay)",
    color: "var(--review-hint)",
    fontWeight: 600,
  },
  error: {
    textAlign: "center",
    padding: "40px",
    background: "var(--surface-card)",
    borderRadius: "20px",
    maxWidth: "500px",
    margin: "50px auto",
    boxShadow: "0 10px 30px var(--surface-shadow)",
  },
  button: {
    padding: "12px 24px",
    background: "var(--submit-gradient)",
    color: "var(--text-inverse)",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px",
  },
  studyWrapper: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "24px 16px 48px",
  },
  studyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  resetButton: {
    padding: "10px 18px",
    borderRadius: "10px",
    border: "1px solid var(--glass-border)",
    background: "var(--surface-card)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
  },
  progressSection: {
    marginBottom: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  progressBarOuter: {
    width: "100%",
    height: "10px",
    borderRadius: "999px",
    background: "var(--surface-border)",
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    background: "var(--progress-gradient)",
    transition: "width 0.3s ease",
  },
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    color: "var(--text-muted)",
    fontSize: "14px",
    fontWeight: 600,
  },
  problemList: {
    display: "flex",
    flexDirection: "column",
  },
  submitBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginTop: "32px",
    flexWrap: "wrap",
  },
  submitHint: {
    color: "var(--text-muted)",
    fontSize: "14px",
  },
  submitButton: {
    padding: "14px 32px",
    borderRadius: "12px",
    border: "none",
    background: "var(--submit-gradient)",
    color: "var(--text-inverse)",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 15px 35px var(--submit-shadow)",
    transition: "opacity 0.2s ease",
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  scrollTopButton: {
    position: "fixed",
    right: "32px",
    bottom: "32px",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: "none",
    background: "var(--scroll-top-bg)",
    color: "var(--scroll-top-text)",
    fontSize: "22px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px var(--accent-shadow)",
    transition: "transform 0.2s ease, opacity 0.2s ease",
    zIndex: 1200
  },
  reviewWrapper: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "32px 16px 48px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  reviewTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "var(--accent-strong)"
  },
  reviewNavButton: {
    padding: "12px 20px",
    borderRadius: "12px",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 28px var(--accent-shadow)",
    transition: "transform 0.2s ease"
  },
  reviewList: {
    display: "flex",
    flexDirection: "column",
    gap: "28px"
  },
  reviewEmpty: {
    textAlign: "center",
    padding: "60px 20px",
    borderRadius: "20px",
    background: "var(--review-empty-bg)",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "18px"
  },
};

export default StudyPage;
