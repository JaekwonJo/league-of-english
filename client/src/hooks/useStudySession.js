import { useState, useEffect, useMemo, useCallback } from "react";
import apiService, { api } from "../services/api.service";
import problemRegistry from "../services/problemRegistry";
import logger from "../utils/logger";
import { GENERATION_STAGES, TIER_ORDER } from "../features/study/constants";

const bracketCleanupPattern = /[[\]{}\\]/g;
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

const SESSION_STORAGE_KEY = 'loe-study-session';

const readSavedSession = (userId) => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId && userId && parsed.userId !== userId) return null;
    return parsed;
  } catch (error) {
    logger.warn('Failed to read saved study session:', error);
    return null;
  }
};

const writeSavedSession = (payload) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    logger.warn('Failed to persist study session:', error);
  }
};

const clearSavedSessionStorage = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    logger.warn('Failed to clear saved study session:', error);
  }
};

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
  const [loadingContext, setLoadingContext] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [generationLog, setGenerationLog] = useState([]);
  const [savedSession, setSavedSession] = useState(() => readSavedSession(user?.id));

  useEffect(() => {
    if (!user?.id) {
      clearSavedSessionStorage();
      setSavedSession(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await api.study.session.get();
        const remotePayload = response?.session?.payload;
        if (!remotePayload || cancelled) {
          return;
        }

        const localSnapshot = readSavedSession(user.id);
        const remoteSavedAt = Number(remotePayload.savedAt || 0);
        const localSavedAt = Number(localSnapshot?.savedAt || 0);
        if (!localSnapshot || remoteSavedAt > localSavedAt) {
          writeSavedSession(remotePayload);
          if (!cancelled) {
            setSavedSession(remotePayload);
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch remote study session:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const clearSavedSession = useCallback((reason = 'manual') => {
    clearSavedSessionStorage();
    setSavedSession(null);
    if (!user?.id) {
      return;
    }
    (async () => {
      try {
        await api.study.session.clear({ reason });
      } catch (syncError) {
        logger.warn('Failed to clear remote study session:', syncError);
      }
    })();
  }, [user?.id]);
  useEffect(() => {
    if (mode !== "study") return undefined;
    const tick = () => setCurrentTime(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (!loading || !loadingContext) {
      return undefined;
    }

    setLoadingProgress((prev) => (prev > 0 ? prev : 5));
    setLoadingStageIndex(0);

    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + 3, 90);
      });
    }, 600);

    const stageTimer = setInterval(() => {
      setLoadingStageIndex((prev) => {
        if (prev >= GENERATION_STAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 4000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stageTimer);
    };
  }, [loading, loadingContext]);

  const getTierStep = useCallback(() => {
    const tierName = String(user?.tier?.name || user?.tier || "").toLowerCase();
    const idx = TIER_ORDER.findIndex((label) => label.toLowerCase() === tierName);
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

    const snapshot = {
      userId: user?.id || null,
      problems: preparedProblems,
      answers: {},
      startTime: now,
      initialTimeLeft: totalSeconds,
      timeLeft: totalSeconds,
      savedAt: Date.now()
    };
    writeSavedSession(snapshot);
    setSavedSession(snapshot);
    if (user?.id) {
      (async () => {
        try {
          await api.study.session.save({ payload: snapshot });
        } catch (syncError) {
          logger.warn('Failed to sync study session to cloud:', syncError);
        }
      })();
    }
  }, [getBaseTimePerProblem, user?.id]);

  const finishStudy = useCallback(async (maybeOptions = {}) => {
    if (maybeOptions && (typeof maybeOptions.preventDefault === 'function' || typeof maybeOptions.stopPropagation === 'function')) {
      maybeOptions.preventDefault();
      maybeOptions = {};
    }
    const forceSubmit = Boolean(maybeOptions && typeof maybeOptions === 'object' && maybeOptions.force);
    if (!problems.length || mode !== "study") return;
    if (!forceSubmit) {
      const unanswered = [];
      problems.forEach((_, idx) => {
        const value = answers[idx];
        const answered = Array.isArray(value)
          ? value.filter((entry) => entry !== null && entry !== undefined && String(entry).trim().length > 0).length > 0
          : value !== undefined && value !== null && String(value).trim().length > 0;
        if (!answered) {
          unanswered.push(idx + 1);
        }
      });
      if (unanswered.length) {
        window.alert(`아직 ${unanswered.length}문제가 풀리지 않았어요: ${unanswered.join(', ')}번 문제를 마저 풀어주세요!`);
        return;
      }
    }
    try {
      setLoading(true);
      setError(null);
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

      // 통계 폴백: 서버에서 stats가 비었다면 즉시 최신 통계를 한번 더 조회
      let mergedStats = submissionResponse?.stats || null;
      if (!mergedStats) {
        try {
          mergedStats = await api.problems.stats();
        } catch (e) {
          /* ignore */
        }
      }

      setResults({
        studyResults,
        problems: studyResults,
        totalProblems: finalTotal,
        totalCorrect: finalCorrect,
        accuracy: finalAccuracy,
        totalTime: totalTimeSeconds,
        earnedPoints: finalSummary.pointsDelta,
        summary: finalSummary,
        stats: mergedStats,
        rank: submissionResponse?.rank || null,
        submission: submissionResponse || null,
      });

      setMode("result");
      logger.info("Study completed:", { totalCorrect, accuracy });
    } catch (err) {
      logger.error("Failed to finish study:", err);
      setError({
        title: '채점 결과를 정리하지 못했어요',
        summary: err?.message || '학습 결과를 저장하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
        hint: '인터넷 연결이나 로그인 상태를 확인한 뒤 다시 제출해 주세요.',
        detail: err?.response?.data?.message || '',
        stack: err?.stack || ''
      });
    } finally {
      setLoading(false);
      setTimeLeft(0);
      setLoadingContext(null);
      setLoadingProgress(0);
      setLoadingStageIndex(0);
      clearSavedSession('submitted');
    }
  }, [
    answers,
    problems,
    startTime,
    currentTime,
    mode,
    clearSavedSession,
    onUserUpdate,
    user
  ]);

  useEffect(() => {
    if (mode !== "study") return undefined;
    if (timeLeft <= 0) {
      finishStudy({ force: true });
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [mode, timeLeft, finishStudy]);

  const startStudy = useCallback(async (studyConfig) => {
    try {
      setLoading(true);
      setError(null);
      setGenerationLog([]);
      logger.info("Starting study with config:", studyConfig);

      const totalCount = Object.values(studyConfig.types || {}).reduce((sum, count) => sum + count, 0);
      const activeTypes = Object.entries(studyConfig.types || {})
        .filter(([, value]) => Number(value || 0) > 0)
        .map(([key]) => key);

      setLoadingContext({
        totalRequested: totalCount,
        requestedTypes: activeTypes,
        startedAt: Date.now()
      });
      setLoadingProgress(totalCount ? 5 : 3);
      setLoadingStageIndex(0);

      const payload = {
        documentId: studyConfig.documentId,
        counts: studyConfig.types,
        orderDifficulty: "advanced",
        insertionDifficulty: "advanced",
        passageNumbers: Array.isArray(studyConfig.passageNumbers)
          ? Array.from(new Set(studyConfig.passageNumbers)).filter((value) => Number.isInteger(value) && value > 0)
          : [],
        totalCount: Math.min(10, Math.max(1, totalCount || 1)),
        orderMode: studyConfig.orderMode === 'sequential' ? 'sequential' : 'random'
      };

      const response = await apiService.post("/generate/csat-set", payload);
      const processed = (response.problems || []).map((problem) =>
        problemRegistry.executeHandler(problem.type, problem)
      );

      if (!processed.length) {
        throw new Error("문제 세트를 생성하지 못했어요. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.");
      }

      setGenerationLog(Array.isArray(response.progressLog) ? response.progressLog : []);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoadingContext(null);
        setLoadingStageIndex(0);
      }, 600);

      beginSession(processed);
      logger.info(`Loaded ${processed.length} problems`);

      if (Array.isArray(response.failures) && response.failures.length) {
        const detailLines = response.failures
          .map((failure) => {
            const type = failure?.type || '문항';
            const delivered = failure?.delivered ?? 0;
            const requested = failure?.requested ?? '?';
            const reason = failure?.reason || failure?.message || '사유가 제공되지 않았어요.';
            return `• ${type} (${delivered}/${requested}) → ${reason}`;
          })
          .join('\n');
        setError({
          title: '⚠️ 일부 문항을 건너뛰었어요',
          summary: '요청한 문제 중 일부는 아직 준비되지 않았어요. 그래도 가능한 문제부터 바로 풀 수 있도록 준비했어요!',
          hint: '문제 수를 조금 줄이거나 다른 유형을 추가하면 더 빠르게 생성될 수 있어요.',
          detail: detailLines
        });
        logger.warn('Partial problem generation failures:', response.failures);
      }
    } catch (err) {
      logger.error("Failed to start study:", err);
      const msg = err?.message || "";
      let clean;
      if (msg.includes('문항 유형과 개수를 선택해 주세요')) {
        window.alert('출제할 문제 유형과 개수를 먼저 골라주세요.');
        setLoading(false);
        setLoadingContext(null);
        setLoadingProgress(0);
        setLoadingStageIndex(0);
        return;
      }
      if (/404/.test(msg)) clean = "문서를 찾을 수 없어요. 자료 상태를 확인하고 다시 시도해주세요.";
      else if (/503/.test(msg)) clean = "서버 점검 중일 수 있어요. 잠시 기다렸다가 다시 시도해주세요.";
      else if (/401/.test(msg) || /token|auth/i.test(msg)) clean = "로그인이 만료됐어요. 다시 로그인해주세요.";
      else clean = "문제 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
      setError({
        title: '😢 문제 세트를 준비하지 못했어요',
        summary: clean,
        hint: '계속 같은 오류가 반복되면 관리자에게 지문 번호와 유형을 함께 알려주세요.',
        detail: err?.response?.data?.message || err?.message || '',
        stack: err?.stack || ''
      });
      setLoadingContext(null);
      setLoadingProgress(0);
      setLoadingStageIndex(0);
    } finally {
      setLoading(false);
    }
  }, [beginSession]);

  const startManualSession = useCallback((problemList = []) => {
    const processed = (problemList || [])
      .map((problem) => problemRegistry.executeHandler(problem.type, problem))
      .filter((problem) => problem);
    setGenerationLog([]);
    setLoadingContext(null);
    setLoadingProgress(0);
    setLoadingStageIndex(0);
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
    setGenerationLog([]);
    setLoadingContext(null);
    setLoadingProgress(0);
    setLoadingStageIndex(0);
    clearSavedSession('restart');
  }, [clearSavedSession]);

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

  useEffect(() => {
    if (mode !== 'study') return;
    const snapshot = {
      userId: user?.id || null,
      problems,
      answers,
      startTime,
      initialTimeLeft,
      timeLeft,
      savedAt: Date.now()
    };
    writeSavedSession(snapshot);
    setSavedSession(snapshot);
  }, [mode, problems, answers, startTime, initialTimeLeft, timeLeft, user?.id]);

  const restoreSavedSession = useCallback(() => {
    const snapshot = readSavedSession(user?.id);
    if (!snapshot || !Array.isArray(snapshot.problems) || snapshot.problems.length === 0) {
      return false;
    }

    const referenceTime = snapshot.savedAt || snapshot.startTime || Date.now();
    const adjustedTimeLeft = snapshot.timeLeft - Math.floor((Date.now() - referenceTime) / 1000);
    if (!Number.isInteger(adjustedTimeLeft) || adjustedTimeLeft <= 0) {
      clearSavedSession('expired');
      return false;
    }

    setProblems(snapshot.problems);
    setAnswers(snapshot.answers || {});
    setResults(null);
    setStartTime(snapshot.startTime || Date.now());
    setCurrentTime(Date.now());
    setInitialTimeLeft(snapshot.initialTimeLeft || adjustedTimeLeft);
    setTimeLeft(adjustedTimeLeft);
    setMode('study');
    setSavedSession({ ...snapshot, timeLeft: adjustedTimeLeft, savedAt: Date.now() });
    return true;
  }, [user?.id, clearSavedSession]);

  const loadingStageLabel = useMemo(() => {
    if (!loading || !loadingContext) return '';
    const index = Math.min(loadingStageIndex, GENERATION_STAGES.length - 1);
    return GENERATION_STAGES[index];
  }, [loading, loadingContext, loadingStageIndex]);

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
    loadingProgress,
    loadingStageIndex,
    loadingStageLabel,
    loadingContext,
    generationLog,
    savedSession,
    restoreSavedSession,
    clearSavedSession,
  };
};

export default useStudySession;
