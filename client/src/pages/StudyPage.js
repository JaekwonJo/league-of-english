/**
 * StudyPage: �н� ������ �����ϰ� Ǯ���ϴ� ���� ������
 */

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import StudyConfig from "../components/study/StudyConfig";
import ProblemDisplay from "../components/study/ProblemDisplay";
import ScoreHUD from "../components/study/ScoreHUD";
import StudyResult from "../components/study/StudyResult";
import useStudySession, { formatSeconds } from "../hooks/useStudySession";

const VOCAB_FLASHCARDS = [
  { word: "abandon", meaning: "������, �����ϴ�" },
  { word: "abstract", meaning: "�߻�����, �̷�����" },
  { word: "accompany", meaning: "�����ϴ�, �Բ� ����" },
  { word: "accumulate", meaning: "�����ϴ�, ������" },
  { word: "adapt", meaning: "�����ϴ�, ���ߴ�" },
  { word: "adjust", meaning: "�����ϴ�, �����ϴ�" },
  { word: "advocate", meaning: "��ȣ�ϴ�, �����ϴ�" },
  { word: "allocate", meaning: "�Ҵ��ϴ�, ����ϴ�" },
  { word: "alter", meaning: "�ٲٴ�, �����ϴ�" },
  { word: "analyze", meaning: "�м��ϴ�" },
  { word: "approach", meaning: "�����ϴ�, �ٰ�����" },
  { word: "assume", meaning: "�����ϴ�, ���ô�" },
  { word: "assure", meaning: "�����ϴ�, Ȯ�Ž�Ű��" },
  { word: "attempt", meaning: "�õ��ϴ�" },
  { word: "attribute", meaning: "~�� ſ���� ������" },
  { word: "bias", meaning: "���, ���԰�" },
  { word: "capacity", meaning: "�����, �ɷ�" },
  { word: "cease", meaning: "�׸��δ�, �����ϴ�" },
  { word: "coherent", meaning: "�ϰ���, ������" },
  { word: "coincide", meaning: "��ġ�ϴ�, ���ÿ� �Ͼ��" },
  { word: "collapse", meaning: "�ر��ϴ�, ��������" },
  { word: "combine", meaning: "�����ϴ�" },
  { word: "commence", meaning: "�����ϴ�" },
  { word: "commit", meaning: "��������, ����ϴ�" },
  { word: "commodity", meaning: "��ǰ, ������" },
  { word: "compensate", meaning: "�����ϴ�" },
  { word: "compile", meaning: "�����ϴ�, �����ϴ�" },
  { word: "complement", meaning: "�����ϴ�, ���湰" },
  { word: "comply", meaning: "������, �ؼ��ϴ�" },
  { word: "comprehensive", meaning: "��������, ��������" },
  { word: "conceive", meaning: "������ ����, ����ϴ�" },
  { word: "conclude", meaning: "�������, ������" },
  { word: "conduct", meaning: "�����ϴ�, �����ϴ�" },
  { word: "confer", meaning: "�����ϴ�, �����ϴ�" },
  { word: "confirm", meaning: "Ȯ���ϴ�, Ȯ���ϴ�" },
  { word: "confront", meaning: "�����ϴ�, �¼���" },
  { word: "consequence", meaning: "���, �߿伺" },
  { word: "conserve", meaning: "�����ϴ�" },
  { word: "consistent", meaning: "�ϰ���, �Ѱᰰ��" },
  { word: "construct", meaning: "�Ǽ��ϴ�, �����ϴ�" },
  { word: "consult", meaning: "����ϴ�, �����ϴ�" },
  { word: "consume", meaning: "�Һ��ϴ�" },
  { word: "contain", meaning: "�����ϴ�, �����ϴ�" },
  { word: "contemporary", meaning: "���ô���, ������" },
  { word: "contradict", meaning: "����Ǵ�, �ݹ��ϴ�" },
  { word: "contribute", meaning: "�⿩�ϴ�, ����ϴ�" },
  { word: "convert", meaning: "��ȯ�ϴ�, �����ϴ�" },
  { word: "convince", meaning: "�����Ű��, Ȯ�Ž�Ű��" },
  { word: "cooperate", meaning: "�����ϴ�" },
  { word: "coordinate", meaning: "�����ϴ�, ��ȭ��Ű��" },
  { word: "corporate", meaning: "�����, ������" },
  { word: "correspond", meaning: "��ġ�ϴ�, ������ �ְ�޴�" },
  { word: "crucial", meaning: "�߿���, ��������" },
  { word: "decline", meaning: "�����ϴ�, �����ϴ�" },
  { word: "deduce", meaning: "�߷��ϴ�" },
  { word: "define", meaning: "�����ϴ�" },
  { word: "demonstrate", meaning: "�����ϴ�, �����ϴ�" },
  { word: "derive", meaning: "���, �����" },
  { word: "detect", meaning: "�����ϴ�, �߰��ϴ�" },
  { word: "determine", meaning: "�����ϴ�, ����ϴ�" },
  { word: "diminish", meaning: "�پ���, ����ϴ�" },
  { word: "discard", meaning: "������, ����ϴ�" },
  { word: "discipline", meaning: "�Ʒ�, ����" },
  { word: "display", meaning: "�����ϴ�, �巯����" },
  { word: "distinct", meaning: "�ѷ���, ������" },
  { word: "distribute", meaning: "�й��ϴ�, �����ϴ�" },
  { word: "diverse", meaning: "�پ���" },
  { word: "dominate", meaning: "�����ϴ�" },
  { word: "eliminate", meaning: "�����ϴ�, ���ִ�" },
  { word: "emerge", meaning: "��Ÿ����, �λ��ϴ�" },
  { word: "enable", meaning: "�����ϰ� �ϴ�" },
  { word: "encounter", meaning: "����ġ��, �޴�" },
  { word: "enhance", meaning: "��ȭ�ϴ�, ���̴�" },
  { word: "ensure", meaning: "�����ϴ�" },
  { word: "equivalent", meaning: "������ ��, ������" },
  { word: "evaluate", meaning: "���ϴ�" },
  { word: "evolve", meaning: "��ȭ�ϴ�, �����ϴ�" },
  { word: "exceed", meaning: "�ʰ��ϴ�" },
  { word: "execute", meaning: "�����ϴ�, ó���ϴ�" },
  { word: "expand", meaning: "Ȯ���ϴ�" },
  { word: "exploit", meaning: "�̿��ϴ�, �����ϴ�" },
  { word: "expose", meaning: "�����Ű��" },
  { word: "extend", meaning: "�����ϴ�, �ø���" },
  { word: "facilitate", meaning: "�����ϰ� �ϴ�" },
  { word: "fulfill", meaning: "�����ϴ�, �޼��ϴ�" },
  { word: "generate", meaning: "�����ϴ�, ������" },
  { word: "illustrate", meaning: "�����ϴ�, ��ȭ�� �ִ�" },
  { word: "implement", meaning: "�����ϴ�, ����" },
  { word: "imply", meaning: "�Ͻ��ϴ�" },
  { word: "impose", meaning: "�ΰ��ϴ�, �����ϴ�" },
  { word: "incentive", meaning: "���å, ����" },
  { word: "indicate", meaning: "��Ÿ����, ����Ű��" },
  { word: "inevitable", meaning: "���� �� ����" },
  { word: "interpret", meaning: "�ؼ��ϴ�, �뿪�ϴ�" },
  { word: "maintain", meaning: "�����ϴ�, �����ϴ�" },
  { word: "mature", meaning: "������, ����������" },
  { word: "modify", meaning: "�����ϴ�" },
  { word: "monitor", meaning: "�����ϴ�, �ֽ��ϴ�" },
  { word: "motivate", meaning: "���⸦ �ο��ϴ�" },
  { word: "neutral", meaning: "�߸���" }
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
          if (window.confirm("������ �����ϸ� ���� Ǯ�� ���� ������ �ʱ�ȭ�˴ϴ�. ����Ͻðھ��?")) onRestart();
        }}
        style={styles.resetButton}
      >
        ���� �ʱ�ȭ
      </button>
      <ScoreHUD timeElapsed={elapsedSeconds} />
    </div>

    {initialTimeLeft > 0 && (
      <div style={styles.progressSection}>
        <div style={styles.progressBarOuter}>
          <div style={{ ...styles.progressBarInner, width: `${progressPercent}%` }} />
        </div>
        <div style={styles.progressLabels}>
          <span>���� �ð� {formatSeconds(timeLeft)}</span>
          <span>��ü {formatSeconds(initialTimeLeft)}</span>
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
        {allAnswered ? "��� ������ Ȯ���߽��ϴ�. ���� ��ư�� �����ּ���!" : "��� ������ Ǯ�� ���� ��ư�� �����ּ���."}
      </div>
      <button
        style={{
          ...styles.submitButton,
          ...(allAnswered ? {} : styles.submitButtonDisabled),
        }}
        onClick={onFinish}
        disabled={!allAnswered}
      >
        ��ü �����ϱ�
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


