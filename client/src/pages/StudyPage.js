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
import EagleGuideChip from "../components/common/EagleGuideChip";
import CommonHero from "../components/common/CommonHero";
import GeminiChatModal from "../components/common/GeminiChatModal";



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
  const [activeChatProblem, setActiveChatProblem] = useState(null); // For Gemini tutor modal
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

  const studyPathMap = useMemo(() => ({
    config: '/study',
    study: '/study/solve',
    result: '/study/result',
    review: '/study/review'
  }), []);

  const getModeFromPath = useCallback((pathname) => {
    if (pathname.startsWith('/study/review')) return 'review';
    if (pathname.startsWith('/study/solve')) return 'study';
    if (pathname.startsWith('/study/result')) return 'result';
    return 'config';
  }, []);

  const syncPathToMode = useCallback((modeValue) => {
    const target = studyPathMap[modeValue] || '/study';
    try {
      if (window.location.pathname !== target) {
        window.history.pushState({}, '', target);
        // Avoid synthetic popstate to prevent early references during init in some bundles
        // Consumers relying on popstate should handle back/forward only.
      }
    } catch (e) {
      /* noop */
    }
  }, [studyPathMap]);

  const handleResumeSavedSession = useCallback(() => {
    if (typeof restoreSavedSession !== 'function') return;
    const restored = restoreSavedSession();
    if (restored === false) {
      window.alert('저장된 학습 세션을 불러오지 못했어요. 새로 시작해 주세요.');
    }
    return restored;
  }, [restoreSavedSession]);

  const handlePopState = useCallback(() => {
    const desiredMode = getModeFromPath(window.location.pathname);
    if (desiredMode === mode) return;

    if (desiredMode === 'config') {
      if (mode !== 'config') {
        restart();
      }
      return;
    }

    if (desiredMode === 'study') {
      if (mode === 'study') return;
      if (savedSession) {
        const resumed = handleResumeSavedSession();
        if (!resumed) {
          syncPathToMode('config');
        }
      } else {
        syncPathToMode(mode);
      }
      return;
    }

    if (desiredMode === 'result') {
      if (mode === 'result') return;
      if (mode === 'review') {
        exitReview();
        return;
      }
      if (results) {
        exitReview();
      } else {
        syncPathToMode(mode);
      }
      return;
    }

    if (desiredMode === 'review') {
      if (mode === 'review') return;
      if (results) {
        enterReview();
      } else {
        syncPathToMode(mode);
      }
    }
  }, [getModeFromPath, mode, restart, savedSession, handleResumeSavedSession, syncPathToMode, exitReview, results, enterReview]);

  useEffect(() => {
    syncPathToMode(mode);
  }, [mode, syncPathToMode]);

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

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
          onDiscardSavedSession={() => clearSavedSession('discarded')}
          headerSlot={(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CommonHero
                badge="Study Studio"
                title="필요한 지문만 골라, 정확하게 학습해요"
                subtitle="유형을 고르고 지문을 선택하면, 시험지 형식으로 깔끔하게 준비해 드려요."
              />
              <div>
                <EagleGuideChip text="맞춤 학습 세트를 생성할 준비가 되었습니다" />
              </div>
              <ReviewCallout
                total={reviewPreview.total}
                problems={reviewPreview.problems}
                loading={reviewLoading}
                refreshing={reviewPreviewLoading}
                error={reviewError}
                onRefresh={refreshReviewPreview}
                onStart={startReviewFromQueue}
              />
            </div>
          )}
        />
      );

    case "study":
      return (
        <>
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
            onRestart={() => {
              restart();
              // Preserve document selection by jumping to step 2
              const url = new URL(window.location.href);
              url.searchParams.set('studyStep', '2');
              window.history.replaceState({}, '', url.toString());
            }}
            onGeminiAsk={(problem) => setActiveChatProblem(problem)}
            generationLog={generationLog}
          />
          {activeChatProblem && (
            <GeminiChatModal
              isOpen={!!activeChatProblem}
              onClose={() => setActiveChatProblem(null)}
              initialTopic={activeChatProblem.type === 'grammar' ? '문법 심층 설명' : '문제 해설'}
              context={{
                problem: activeChatProblem,
                question: activeChatProblem.question,
                passage: activeChatProblem.passage || activeChatProblem.mainText,
                answer: activeChatProblem.answer,
                explanation: activeChatProblem.explanation
              }}
              onAction={(option) => {
                if (option.action && option.action.startsWith('save_vocab_')) {
                  const [_, term, meaning] = option.action.split('_vocab_')[1].split('_');
                  api.post('/vocabulary/my/save', { term, meaning })
                    .then(() => alert(`'${term}' 단어장에 저장 완료! 📝`))
                    .catch(() => alert('저장 실패'));
                  return true;
                }
                return false;
              }}
            />
          )}
        </>
      );

    case "review":
      return (
        <>
          <ReviewModeView 
            results={results} 
            onBack={exitReview} 
            onRestart={restart}
            onGeminiAsk={(problem) => setActiveChatProblem(problem)} 
          />
          {activeChatProblem && (
            <GeminiChatModal
              isOpen={!!activeChatProblem}
              onClose={() => setActiveChatProblem(null)}
              initialTopic="오답 노트 해설"
              context={{
                problem: activeChatProblem,
                question: activeChatProblem.question,
                passage: activeChatProblem.passage || activeChatProblem.mainText,
                answer: activeChatProblem.answer,
                explanation: activeChatProblem.explanation
              }}
              onAction={(option) => {
                if (option.action && option.action.startsWith('save_vocab_')) {
                  const [_, term, meaning] = option.action.split('_vocab_')[1].split('_');
                  api.post('/vocabulary/my/save', { term, meaning })
                    .then(() => alert(`'${term}' 단어장에 저장 완료! 📝`))
                    .catch(() => alert('저장 실패'));
                  return true;
                }
                return false;
              }}
            />
          )}
        </>
      );

    case "result":
      return <StudyResult results={results} onRestart={() => {
        restart();
        const url = new URL(window.location.href);
        url.searchParams.set('studyStep', '2');
        window.history.replaceState({}, '', url.toString());
      }} onReview={enterReview} onHome={() => (window.location.href = "/")} />;

    default:
      return null;
  }
};


export default StudyPage;
