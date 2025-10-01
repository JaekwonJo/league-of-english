import { useState, useEffect, useMemo, useCallback } from "react";
import apiService from "../services/api.service";
import problemRegistry from "../services/problemRegistry";
import logger from "../utils/logger";

const bracketCleanupPattern = new RegExp(`[{}\\[\\]\\\\]`, "g");

const normalizeAnswerArray = (value) => {
  if (value === null || value === undefined) return [];
  return String(value)
    .replace(bracketCleanupPattern, "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => parseInt(token, 10))
    .filter((num) => !Number.isNaN(num))
    .sort((a, b) => a - b);
};

export const formatSeconds = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const tierOrder = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Challenger",
];

const useStudySession = (user, onUserUpdate = () => {}) => {
  const [mode, setMode] = useState("config");
  const [problems, setProblems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTimeLeft, setInitialTimeLeft] = useState(0);

  useEffect(() => {
    if (mode !== "study") return undefined;
    const tick = () => setCurrentTime(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  const getTierStep = useCallback(() => {
    const tierName = String(user?.tier?.name || user?.tier || "").toLowerCase();
    const idx = tierOrder.findIndex((label) => label.toLowerCase() === tierName);
    return Math.max(0, idx);
  }, [user]);

  const getBaseTimePerProblem = useCallback(() => {
    const reduction = getTierStep() * 5;
    return Math.max(60, 120 - reduction);
  }, [getTierStep]);

  const beginSession = useCallback((preparedProblems) => {
    if (!Array.isArray(preparedProblems) || preparedProblems.length === 0) {
      throw new Error('문제 세트를 준비하지 못했어요.');
    }
    const now = Date.now();
    const perProblemSeconds = getBaseTimePerProblem();
    const totalSeconds = Math.max(perProblemSeconds * preparedProblems.length, 60);

    setProblems(preparedProblems);
    setAnswers({});
    setResults(null);
    setStartTime(now);
    setCurrentTime(now);
    setInitialTimeLeft(totalSeconds);
    setTimeLeft(totalSeconds);
    setMode("study");
  }, [getBaseTimePerProblem]);

  const finishStudy = useCallback(async () => {
    if (!problems.length || mode !== "study") return;
    try {
      setLoading(true);
      const studyResults = [];
      const submissionEntries = [];
      let totalCorrect = 0;

      const totalElapsedMs = startTime ? (currentTime || Date.now()) - startTime : 0;
      const perProblemMs = problems.length ? totalElapsedMs / problems.length : 0;
      const perProblemSeconds = Math.max(0, Math.round(perProblemMs / 1000));

      for (let i = 0; i < problems.length; i += 1) {
        const problem = problems[i];
        const userAnswer = answers[i];
        const expectedArray = normalizeAnswerArray(problem.answer);
        const actualArray = normalizeAnswerArray(userAnswer);
        const fallbackCompare = String(problem.answer) === String(userAnswer);
        const isCorrect = expectedArray.length > 0
          ? actualArray.length === expectedArray.length && expectedArray.every((value, idx) => value === actualArray[idx])
          : fallbackCompare;

        if (isCorrect) totalCorrect += 1;

        const answerString = actualArray.length
          ? actualArray.join(",")
          : userAnswer !== undefined && userAnswer !== null
            ? String(userAnswer)
            : "";
        const correctString = expectedArray.length
          ? expectedArray.join(",")
          : problem.answer !== undefined && problem.answer !== null
            ? String(problem.answer)
            : "";

        studyResults.push({
          problem,
          problemType: problem.type,
          question: problem.question || problem.instruction || "",
          userAnswer: answerString,
          correctAnswer: correctString,
          isCorrect,
          timeSpent: perProblemSeconds,
        });

        if (problem && problem.id) {
          submissionEntries.push({
            problemId: problem.id,
            problemType: problem.type,
            isCorrect,
            userAnswer: answerString,
            timeSpent: perProblemSeconds
          });
        }
      }

      const totalTimeSeconds = Math.round(totalElapsedMs / 1000);
      const accuracy = problems.length ? Math.round((totalCorrect / problems.length) * 100) : 0;
      const localPointsDelta = totalCorrect * 10 - (studyResults.length - totalCorrect) * 5;

      let submissionResponse = null;
      try {
        submissionResponse = await apiService.post('/problems/submit', { results: submissionEntries });
        if (submissionResponse?.updatedUser && typeof onUserUpdate === 'function') {
          const updatedUser = {
            ...(user || {}),
            ...submissionResponse.updatedUser,
            points: submissionResponse.updatedUser.points,
            tier: submissionResponse.updatedUser.tier,
            tierInfo: submissionResponse.updatedUser.tierInfo || submissionResponse.rank?.tier || (user?.tierInfo || null)
          };
          onUserUpdate(updatedUser);
        }
      } catch (submitError) {
        logger.error('Failed to submit study results:', submitError);
      }

      const finalSummary = submissionResponse?.summary || {
        total: studyResults.length,
        correct: totalCorrect,
        incorrect: studyResults.length - totalCorrect,
        accuracy,
        pointsDelta: localPointsDelta,
        totalPoints: (user?.points || 0) + localPointsDelta
      };

      const finalTotal = typeof finalSummary.total === 'number' ? finalSummary.total : studyResults.length;
      const finalCorrect = typeof finalSummary.correct === 'number' ? finalSummary.correct : totalCorrect;
      const finalAccuracy = typeof finalSummary.accuracy === 'number' ? finalSummary.accuracy : accuracy;

      setResults({
        studyResults,
        problems: studyResults,
        totalProblems: finalTotal,
        totalCorrect: finalCorrect,
        accuracy: finalAccuracy,
        totalTime: totalTimeSeconds,
        earnedPoints: finalSummary.pointsDelta,
        summary: finalSummary,
        stats: submissionResponse?.stats || null,
        rank: submissionResponse?.rank || null,
        submission: submissionResponse || null,
      });

      setMode("result");
      logger.info("Study completed:", { totalCorrect, accuracy });
    } catch (err) {
      logger.error("Failed to finish study:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeLeft(0);
    }
  }, [answers, problems, startTime, currentTime, mode]);

  useEffect(() => {
    if (mode !== "study") return undefined;
    if (timeLeft <= 0) {
      finishStudy();
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [mode, timeLeft, finishStudy]);

  const startStudy = useCallback(async (studyConfig) => {
    try {
      setLoading(true);
      setError(null);
      logger.info("Starting study with config:", studyConfig);

      const totalCount = Object.values(studyConfig.types || {}).reduce((sum, count) => sum + count, 0);
      const payload = {
        documentId: studyConfig.documentId,
        counts: studyConfig.types,
        orderDifficulty: "advanced",
        insertionDifficulty: "advanced",
        totalCount: Math.min(20, Math.max(1, totalCount || 1)),
      };

      const response = await apiService.post("/generate/csat-set", payload);
      const processed = (response.problems || []).map((problem) =>
        problemRegistry.executeHandler(problem.type, problem)
      );

      if (!processed.length) {
        throw new Error("문제 세트를 생성하지 못했어요. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.");
      }

      beginSession(processed);
      logger.info(`Loaded ${processed.length} problems`);
    } catch (err) {
      logger.error("Failed to start study:", err);
      const msg = err?.message || "";
      let clean;
      if (/404/.test(msg)) clean = "문서를 찾을 수 없어요. 자료 상태를 확인하고 다시 시도해주세요.";
      else if (/503/.test(msg)) clean = "서버 점검 중일 수 있어요. 잠시 기다렸다가 다시 시도해주세요.";
      else if (/401/.test(msg) || /token|auth/i.test(msg)) clean = "로그인이 만료됐어요. 다시 로그인해주세요.";
      else clean = "문제 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
      setError(clean);
    } finally {
      setLoading(false);
    }
  }, [beginSession]);

  const startManualSession = useCallback((problemList = []) => {
    const processed = (problemList || [])
      .map((problem) => problemRegistry.executeHandler(problem.type, problem))
      .filter((problem) => problem);
    beginSession(processed);
  }, [beginSession]);

  const handleAnswer = useCallback((index, answer) => {
    setAnswers((prev) => ({ ...prev, [index]: answer }));
    logger.debug(`Answer submitted for problem ${index}:`, answer);
  }, []);

  const restart = useCallback(() => {
    setMode("config");
    setProblems([]);
    setAnswers({});
    setResults(null);
    setStartTime(null);
    setCurrentTime(null);
    setTimeLeft(0);
    setInitialTimeLeft(0);
  }, []);

  const enterReview = useCallback(() => {
    setMode((currentMode) => {
      if (!results || !Array.isArray(results.studyResults)) {
        return currentMode;
      }
      return 'review';
    });
  }, [results]);

  const exitReview = useCallback(() => {
    setMode('result');
  }, []);

  const elapsedSeconds = useMemo(() => {
    if (!startTime || !currentTime) return 0;
    return Math.round((currentTime - startTime) / 1000);
  }, [startTime, currentTime]);

  const progressPercent = useMemo(() => {
    if (initialTimeLeft <= 0) return 0;
    return Math.min(100, Math.max(0, ((initialTimeLeft - timeLeft) / initialTimeLeft) * 100));
  }, [initialTimeLeft, timeLeft]);

  const allAnswered = useMemo(() => {
    if (!problems.length) return false;
    return problems.every((_, idx) => {
      const value = answers[idx];
      return value !== undefined && value !== null && String(value).length > 0;
    });
  }, [problems, answers]);

  return {
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
  };
};

export default useStudySession;
