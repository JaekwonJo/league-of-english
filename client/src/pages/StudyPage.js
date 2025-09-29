/**
 * StudyPage: 학습 문제를 구성하고 풀이하는 메인 페이지
 */

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import StudyConfig from "../components/study/StudyConfig";
import ProblemDisplay from "../components/study/ProblemDisplay";
import ScoreHUD from "../components/study/ScoreHUD";
import StudyResult from "../components/study/StudyResult";
import useStudySession, { formatSeconds } from "../hooks/useStudySession";

const VOCAB_FLASHCARDS = [
  { word: "abandon", meaning: "버리다, 포기하다" },
  { word: "abstract", meaning: "추상적인, 이론적인" },
  { word: "accompany", meaning: "동반하다, 함께 가다" },
  { word: "accumulate", meaning: "축적하다, 모으다" },
  { word: "adapt", meaning: "적응하다, 맞추다" },
  { word: "adjust", meaning: "조정하다, 적응하다" },
  { word: "advocate", meaning: "옹호하다, 지지하다" },
  { word: "allocate", meaning: "할당하다, 배분하다" },
  { word: "alter", meaning: "바꾸다, 수정하다" },
  { word: "analyze", meaning: "분석하다" },
  { word: "approach", meaning: "접근하다, 다가가다" },
  { word: "assume", meaning: "가정하다, 떠맡다" },
  { word: "assure", meaning: "보장하다, 확신시키다" },
  { word: "attempt", meaning: "시도하다" },
  { word: "attribute", meaning: "~의 탓으로 돌리다" },
  { word: "bias", meaning: "편견, 선입견" },
  { word: "capacity", meaning: "수용력, 능력" },
  { word: "cease", meaning: "그만두다, 중지하다" },
  { word: "coherent", meaning: "일관된, 논리적인" },
  { word: "coincide", meaning: "일치하다, 동시에 일어나다" },
  { word: "collapse", meaning: "붕괴하다, 무너지다" },
  { word: "combine", meaning: "결합하다" },
  { word: "commence", meaning: "시작하다" },
  { word: "commit", meaning: "저지르다, 헌신하다" },
  { word: "commodity", meaning: "상품, 원자재" },
  { word: "compensate", meaning: "보상하다" },
  { word: "compile", meaning: "편집하다, 수집하다" },
  { word: "complement", meaning: "보완하다, 보충물" },
  { word: "comply", meaning: "따르다, 준수하다" },
  { word: "comprehensive", meaning: "종합적인, 포괄적인" },
  { word: "conceive", meaning: "생각해 내다, 상상하다" },
  { word: "conclude", meaning: "결론짓다, 끝내다" },
  { word: "conduct", meaning: "수행하다, 지휘하다" },
  { word: "confer", meaning: "상의하다, 수여하다" },
  { word: "confirm", meaning: "확인하다, 확정하다" },
  { word: "confront", meaning: "직면하다, 맞서다" },
  { word: "consequence", meaning: "결과, 중요성" },
  { word: "conserve", meaning: "보존하다" },
  { word: "consistent", meaning: "일관된, 한결같은" },
  { word: "construct", meaning: "건설하다, 구성하다" },
  { word: "consult", meaning: "상담하다, 참고하다" },
  { word: "consume", meaning: "소비하다" },
  { word: "contain", meaning: "포함하다, 억제하다" },
  { word: "contemporary", meaning: "동시대의, 현대의" },
  { word: "contradict", meaning: "모순되다, 반박하다" },
  { word: "contribute", meaning: "기여하다, 기부하다" },
  { word: "convert", meaning: "전환하다, 개조하다" },
  { word: "convince", meaning: "납득시키다, 확신시키다" },
  { word: "cooperate", meaning: "협력하다" },
  { word: "coordinate", meaning: "조정하다, 조화시키다" },
  { word: "corporate", meaning: "기업의, 공동의" },
  { word: "correspond", meaning: "일치하다, 서신을 주고받다" },
  { word: "crucial", meaning: "중요한, 결정적인" },
  { word: "decline", meaning: "감소하다, 거절하다" },
  { word: "deduce", meaning: "추론하다" },
  { word: "define", meaning: "정의하다" },
  { word: "demonstrate", meaning: "증명하다, 시위하다" },
  { word: "derive", meaning: "얻다, 끌어내다" },
  { word: "detect", meaning: "감지하다, 발견하다" },
  { word: "determine", meaning: "결정하다, 결심하다" },
  { word: "diminish", meaning: "줄어들다, 축소하다" },
  { word: "discard", meaning: "버리다, 폐기하다" },
  { word: "discipline", meaning: "훈련, 규율" },
  { word: "display", meaning: "전시하다, 드러내다" },
  { word: "distinct", meaning: "뚜렷한, 별개의" },
  { word: "distribute", meaning: "분배하다, 유통하다" },
  { word: "diverse", meaning: "다양한" },
  { word: "dominate", meaning: "지배하다" },
  { word: "eliminate", meaning: "제거하다, 없애다" },
  { word: "emerge", meaning: "나타나다, 부상하다" },
  { word: "enable", meaning: "가능하게 하다" },
  { word: "encounter", meaning: "마주치다, 겪다" },
  { word: "enhance", meaning: "강화하다, 높이다" },
  { word: "ensure", meaning: "보장하다" },
  { word: "equivalent", meaning: "동등한 것, 동등한" },
  { word: "evaluate", meaning: "평가하다" },
  { word: "evolve", meaning: "진화하다, 발전하다" },
  { word: "exceed", meaning: "초과하다" },
  { word: "execute", meaning: "수행하다, 처형하다" },
  { word: "expand", meaning: "확장하다" },
  { word: "exploit", meaning: "이용하다, 착취하다" },
  { word: "expose", meaning: "노출시키다" },
  { word: "extend", meaning: "연장하다, 늘리다" },
  { word: "facilitate", meaning: "용이하게 하다" },
  { word: "fulfill", meaning: "이행하다, 달성하다" },
  { word: "generate", meaning: "생성하다, 만들어내다" },
  { word: "illustrate", meaning: "설명하다, 삽화를 넣다" },
  { word: "implement", meaning: "실행하다, 도구" },
  { word: "imply", meaning: "암시하다" },
  { word: "impose", meaning: "부과하다, 강요하다" },
  { word: "incentive", meaning: "장려책, 유인" },
  { word: "indicate", meaning: "나타내다, 가리키다" },
  { word: "inevitable", meaning: "피할 수 없는" },
  { word: "interpret", meaning: "해석하다, 통역하다" },
  { word: "maintain", meaning: "유지하다, 주장하다" },
  { word: "mature", meaning: "성숙한, 성숙해지다" },
  { word: "modify", meaning: "수정하다" },
  { word: "monitor", meaning: "감시하다, 주시하다" },
  { word: "motivate", meaning: "동기를 부여하다" },
  { word: "neutral", meaning: "중립의" }
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
      <p style={styles.loadingMessage}>Generating your study set... hang tight!</p>
      {vocabCards.length > 0 && (
        <div style={styles.flashcardArea}>
          <div style={styles.flashcardTitle}>Mini vocab warm-up while you wait!</div>
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
                    <div style={styles.flashcardCountdown}>Meaning appears in {secondsRemaining}s</div>
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
    <h2>Problem generation error</h2>
    <p>{message}</p>
    <button onClick={onRetry} style={styles.button}>
      Try again
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
          if (window.confirm("설정을 변경하면 현재 풀이 중인 문제가 초기화됩니다. 계속하시겠어요?")) onRestart();
        }}
        style={styles.resetButton}
      >
        설정 초기화
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
        {allAnswered ? "모든 문제를 확인했습니다. 제출 버튼을 눌러주세요!" : "모든 문항을 풀고 제출 버튼을 눌러주세요."}
      </div>
      <button
        style={{
          ...styles.submitButton,
          ...(allAnswered ? {} : styles.submitButtonDisabled),
        }}
        onClick={onFinish}
        disabled={!allAnswered}
      >
        전체 제출하기
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


