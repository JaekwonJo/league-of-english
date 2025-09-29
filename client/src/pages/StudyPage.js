/**
 * StudyPage: 학습 문제를 구성하고 푸는 메인 페이지
 */

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import StudyConfig from "../components/study/StudyConfig";
import ProblemDisplay from "../components/study/ProblemDisplay";
import ScoreHUD from "../components/study/ScoreHUD";
import StudyResult from "../components/study/StudyResult";
import useStudySession, { formatSeconds } from "../hooks/useStudySession";

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


const pickFlashcards = (count = 3) => {
  const pool = [...VOCAB_FLASHCARDS];
  const picked = [];
  while (pool.length && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
};

const LoadingState = ({ vocabCards = [], revealStepSeconds = REVEAL_STEP_SECONDS }) => {
  const [countdowns, setCountdowns] = useState([]);

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

  return (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingMessage}>문제를 준비하고 있어요! 잠시만 기다려 주세요 😊</p>
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
}) => (
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
);

const StudyPage = () => {
  const { user } = useAuth();
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
    setError,
  } = useStudySession(user);

  const loadingFlashcards = useMemo(() => (loading && mode !== "study") ? pickFlashcards(5) : [], [loading, mode]);


  if (loading && mode !== "study") {
    return <LoadingState vocabCards={loadingFlashcards} />;
  }

  if (error && mode !== "study") {
    return <ErrorState message={error} onRetry={() => { setError(null); restart(); }} />;
  }

  switch (mode) {
    case "config":
      return <StudyConfig onStart={startStudy} />;

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

    case "result":
      return <StudyResult results={results} onRestart={restart} onHome={() => (window.location.href = "/")} />;

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
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingMessage: {
    color: "#334155",
    fontSize: "18px",
    fontWeight: 600,
  },
  flashcardArea: {
    marginTop: "8px",
    background: "rgba(255, 255, 255, 0.88)",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 18px 28px rgba(148, 163, 184, 0.35)",
    width: "100%",
    maxWidth: "420px",
  },
  flashcardTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: "12px",
  },
  flashcardList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  flashcardItem: {
    background: "#1E293B",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "#F8FAFC",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.35)",
  },
  flashcardWord: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  flashcardMeaning: {
    fontSize: "14px",
    color: "#E2E8F0",
  },
  flashcardCountdown: {
    fontSize: "13px",
    color: "#CBD5F5",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    background: "white",
    borderRadius: "20px",
    maxWidth: "500px",
    margin: "50px auto",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
  },
  button: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
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
    border: "1px solid #cbd5f5",
    background: "#ffffff",
    color: "#1f2937",
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
    background: "rgba(148, 163, 184, 0.25)",
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    background: "linear-gradient(135deg, #34d399 0%, #3b82f6 100%)",
    transition: "width 0.3s ease",
  },
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    color: "#94A3B8",
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
    color: "#94A3B8",
    fontSize: "14px",
  },
  submitButton: {
    padding: "14px 32px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
    color: "white",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 15px 35px rgba(99, 102, 241, 0.35)",
    transition: "opacity 0.2s ease",
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    boxShadow: "none",
  },
};

export default StudyPage;
