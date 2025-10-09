/**
 * StudyPage: 학습 문제를 구성하고 푸는 메인 페이지
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import StudyConfig from "../features/study/config/StudyConfig";
import StudyResult from "../features/study/result/StudyResult";
import useStudySession from "../hooks/useStudySession";
import { api } from "../services/api.service";
import FriendlyError from "../components/common/FriendlyError";
import LoadingState from "../features/study/components/LoadingState";
import ReviewCallout from "../features/study/components/ReviewCallout";
import StudyModeView from "../features/study/components/StudyModeView";
import ReviewModeView from "../features/study/components/ReviewModeView";
import { pickFlashcards } from "../features/study/utils/flashcards";



const StudyPage = () => {
  const { user, updateUser } = useAuth();
  const initialFocusType = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get('focus');
      return focus ? focus.trim() : null;
    } catch (error) {
      return null;
    }
  }, []);
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
    loadingProgress,
    loadingStageLabel,
    loadingContext,
    generationLog,
    savedSession,
    restoreSavedSession,
    clearSavedSession,
  } = useStudySession(user, updateUser);

  const handleResumeSavedSession = useCallback(() => {
    if (typeof restoreSavedSession !== 'function') return;
    const restored = restoreSavedSession();
    if (restored === false) {
      window.alert('저장된 학습 세션을 불러오지 못했어요. 새로 시작해 주세요.');
    }
  }, [restoreSavedSession]);

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

  useEffect(() => {
    if (!initialFocusType) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('focus')) {
        params.delete('focus');
        const next = params.toString();
        const base = `${window.location.pathname}${next ? `?${next}` : ''}`;
        window.history.replaceState({}, '', base);
      }
    } catch (error) {
      /* noop */
    }
  }, [initialFocusType]);

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
    return (
      <LoadingState
        vocabCards={loadingFlashcards}
        onLoadMore={handleLoadMoreFlashcards}
        progressPercent={loadingProgress}
        progressLabel={loadingStageLabel}
        loadingContext={loadingContext}
      />
    );
  }

  if (error && mode !== "study") {
    const normalizedError = typeof error === 'string' ? { summary: error } : error;
    return (
      <FriendlyError
        error={normalizedError}
        onRetry={() => {
          setError(null);
          restart();
        }}
        onHome={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  switch (mode) {
    case "config":
      return (
        <StudyConfig
          onStart={startStudy}
          initialFocusType={initialFocusType}
          savedSession={savedSession}
          onResumeSavedSession={handleResumeSavedSession}
          onDiscardSavedSession={clearSavedSession}
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
          generationLog={generationLog}
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


export default StudyPage;
