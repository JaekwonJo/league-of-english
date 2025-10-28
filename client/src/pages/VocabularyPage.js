import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';

const QUIZ_SIZE = 30;
const tierOrder = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Challenger'];
const STEPS = {
  SELECT_SET: 1,
  SELECT_DAY: 2,
  CONFIGURE: 3
};

const formatSeconds = (value = 0) => {
  const total = Math.max(0, Math.floor(value));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const VocabularyPage = () => {
  const { user, updateUser } = useAuth();

  const stepPathMap = useMemo(() => ({
    [STEPS.SELECT_SET]: '/vocabulary',
    [STEPS.SELECT_DAY]: '/vocabulary/days',
    [STEPS.CONFIGURE]: '/vocabulary/setup'
  }), []);

  const getStepFromPath = useCallback((pathname) => {
    if (pathname.startsWith('/vocabulary/setup')) return STEPS.CONFIGURE;
    if (pathname.startsWith('/vocabulary/days')) return STEPS.SELECT_DAY;
    return STEPS.SELECT_SET;
  }, []);

  const [step, setStep] = useState(() => getStepFromPath(window.location.pathname));

  const navigateToStep = useCallback((nextStep) => {
    const targetPath = stepPathMap[nextStep] || '/vocabulary';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      setStep(nextStep);
    }
  }, [stepPathMap]);

  useEffect(() => {
    const handlePopState = () => {
      setStep(getStepFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getStepFromPath]);

  const [sets, setSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState('');

  const [selectedSet, setSelectedSet] = useState(null);
  const [daysLoading, setDaysLoading] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [selectedDayKeys, setSelectedDayKeys] = useState([]);
  const [quizMode, setQuizMode] = useState('mixed'); // 'mixed' | 'term_to_meaning' | 'meaning_to_term'
  const [orderPolicy, setOrderPolicy] = useState('random'); // 'random' | 'sequential'

  const [quizState, setQuizState] = useState({
    active: false,
    loading: false,
    data: null,
    index: 0,
    answers: [],
    completed: false,
    submitting: false,
    result: null
  });
  const [practiceState, setPracticeState] = useState({
    active: false,
    items: [], // [{term, meaning, dayKey}]
    index: 0,
    showBack: false,
    againQueue: [],
    front: 'term' // 'term' | 'meaning'
  });

  const [totalTime, setTotalTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const questionStartRef = useRef(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [setQuery, setSetQuery] = useState('');

  const getTierStep = useCallback(() => {
    const tierName = String(user?.tier?.name || user?.tierInfo?.name || user?.tier || '').toLowerCase();
    const index = tierOrder.findIndex((label) => label.toLowerCase() === tierName);
    return index >= 0 ? index : 0;
  }, [user]);

const getTimeLimitSeconds = useCallback(() => {
  const baseSeconds = 300; // Iron tier: 5 minutes
  const reduction = getTierStep() * 5; // each 티어 상승마다 5초 감축
  return Math.max(120, baseSeconds - reduction);
}, [getTierStep]);

  useEffect(() => {
    const fetchSets = async () => {
      setSetsLoading(true);
      setSetsError('');
      try {
        const response = await api.vocabulary.list();
        setSets(Array.isArray(response?.data) ? response.data : []);
        if (!response?.data?.length) {
          setMessage('아직 업로드된 단어장이 없어요. 관리자 페이지에서 PDF 단어장을 업로드하면 여기서 바로 시험을 볼 수 있어요!');
        }
      } catch (err) {
        setSetsError(err?.message || '단어 세트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSetsLoading(false);
      }
    };

    fetchSets();
  }, []);

  useEffect(() => () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

const resetQuizState = useCallback(() => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  questionStartRef.current = null;
  setQuizState({
    active: false,
    loading: false,
    data: null,
    index: 0,
    answers: [],
    completed: false,
    submitting: false,
    result: null
  });
  setTotalTime(0);
  setTimeLeft(0);
}, []);

const goBackToDays = useCallback(() => {
    resetQuizState();
    setError('');
    setPracticeState({ active: false, items: [], index: 0, showBack: false, againQueue: [], front: 'term' });
    navigateToStep(STEPS.SELECT_DAY);
  }, [resetQuizState, navigateToStep]);

  const handleBackToSetList = useCallback(() => {
    resetQuizState();
    setPracticeState({ active: false, items: [], index: 0, showBack: false, againQueue: [], front: 'term' });
    setSelectedSet(null);
    setSelectedDayKey('');
    setSelectedDayKeys([]);
    navigateToStep(STEPS.SELECT_SET);
    setMessage('원하는 단어장을 다시 골라볼까요?');
    setError('');
  }, [resetQuizState, navigateToStep]);

  const handleProceedToSetup = useCallback(() => {
    const selectedCount = selectedDayKeys.length || (selectedDayKey ? 1 : 0);
    if (!selectedCount) {
      setError('먼저 Day를 최소 1개 선택해 주세요!');
      return;
    }
    if (!selectedDayKey && selectedDayKeys.length === 1) {
      setSelectedDayKey(selectedDayKeys[0]);
    }
    setError('');
    setMessage('아래에서 시험 유형을 골라 시작해 보세요!');
    navigateToStep(STEPS.CONFIGURE);
  }, [selectedDayKey, selectedDayKeys, navigateToStep]);

  const handleSelectSet = async (setInfo) => {
    if (!setInfo) return;
    if (selectedSet?.id === setInfo.id) {
      navigateToStep(STEPS.SELECT_DAY);
      return;
    }
    setDaysLoading(true);
    setError('');
    setMessage('');
    resetQuizState();
    setSelectedDayKey('');
    setSelectedDayKeys([]);
    setSelectedSet(setInfo);
    navigateToStep(STEPS.SELECT_DAY);

    try {
      const response = await api.vocabulary.detail(setInfo.id);
      if (!response?.success) {
        throw new Error(response?.message || '세부 정보를 불러오지 못했습니다.');
      }
      setSelectedSet(response.data);
    } catch (err) {
      setError(err?.message || '단어장을 불러오지 못했어요.');
      setSelectedSet(null);
      navigateToStep(STEPS.SELECT_SET);
    } finally {
      setDaysLoading(false);
    }
  };

  const handleSelectOption = (choiceIndex) => {
    if (!quizState.active || quizState.loading) return;

    const problems = quizState.data?.problems || [];
    const currentProblem = problems[quizState.index];
    if (!currentProblem) return;

    const selected = choiceIndex + 1;
    setQuizState((prev) => {
      const currentProblems = prev.data?.problems || [];
      const current = currentProblems[prev.index];
      if (!current) return prev;
      const answers = [...prev.answers];
      const existing = answers[prev.index] || {
        problemId: current.problemId,
        selected: null,
        timeSpent: 0
      };
      answers[prev.index] = {
        ...existing,
        problemId: current.problemId,
        selected
      };
      return { ...prev, answers };
    });
  };

  const recordTimeForCurrentQuestion = useCallback(() => {
    const now = Date.now();
    let updatedAnswers = null;
    setQuizState((prev) => {
      if (!prev.active || !prev.data) return prev;
      const problems = prev.data.problems || [];
      const currentProblem = problems[prev.index];
      if (!currentProblem || !questionStartRef.current) return prev;
      const elapsedSeconds = Math.max(0, Math.round((now - questionStartRef.current) / 1000));
      if (elapsedSeconds === 0) return prev;
      const answers = [...prev.answers];
      const existing = answers[prev.index] || {
        problemId: currentProblem.problemId,
        selected: null,
        timeSpent: 0
      };
      answers[prev.index] = {
        ...existing,
        problemId: currentProblem.problemId,
        timeSpent: (existing.timeSpent || 0) + elapsedSeconds
      };
      updatedAnswers = answers;
      return { ...prev, answers };
    });
    questionStartRef.current = now;
    return updatedAnswers;
  }, []);

  const goToQuestion = useCallback((targetIndex) => {
    recordTimeForCurrentQuestion();
    setQuizState((prev) => {
      if (!prev.active || !prev.data) return prev;
      const problems = prev.data.problems || [];
      if (!problems.length) return prev;
      const maxIndex = problems.length - 1;
      const nextIndex = Math.max(0, Math.min(targetIndex, maxIndex));
      if (nextIndex === prev.index) return prev;
      return { ...prev, index: nextIndex };
    });
    questionStartRef.current = Date.now();
  }, [recordTimeForCurrentQuestion]);

  const handlePrev = useCallback(() => {
    goToQuestion(quizState.index - 1);
  }, [goToQuestion, quizState.index]);

  const handleNext = useCallback(() => {
    if (!quizState.data) return;
    if (quizState.index >= quizState.data.problems.length - 1) return;
    goToQuestion(quizState.index + 1);
  }, [goToQuestion, quizState.data, quizState.index]);

  const submitQuiz = useCallback(async (finalAnswers, reason = 'manual') => {
    if (!selectedSet?.id) {
      setQuizState((prev) => ({ ...prev, submitting: false }));
      setError('단어장을 다시 선택해 주세요.');
      return;
    }

    try {
      const payload = {
        dayKey: selectedDayKey,
        answers: finalAnswers.map((entry) => ({
          problemId: entry.problemId,
          selected: entry.selected ?? '',
          timeSpent: entry.timeSpent || 0
        }))
      };

      const response = await api.vocabulary.submitQuiz(selectedSet.id, payload);

      if (!response?.success) {
        throw new Error(response?.message || '결과를 저장하지 못했습니다.');
      }

      setQuizState((prev) => ({
        ...prev,
        result: {
          summary: response.summary,
          detail: response.detail,
          stats: response.stats,
          rank: response.rank,
          reason
        }
      }));

      // 업데이트된 유저 정보가 오면 바로 반영(LP/티어 UI 최신화)
      if (response?.updatedUser && typeof updateUser === 'function') {
        try {
          updateUser({ ...(user || {}), ...response.updatedUser });
        } catch (e) {
          /* ignore */
        }
      }

      if (reason === 'time') {
        setMessage('⏰ 제한 시간이 끝났어요! 제출된 결과를 살펴보고 다음에 더 나은 기록에 도전해 볼까요?');
      } else {
        setMessage('결과가 저장되었어요! 아래 분석을 참고해 다음 도전을 준비해 볼까요?');
      }
    } catch (err) {
      console.error('submitQuiz error:', err);
      setError(err?.message || '결과를 기록하지 못했어요. 네트워크 상태를 확인한 후 다시 시도해 주세요.');
    } finally {
      setQuizState((prev) => ({ ...prev, submitting: false }));
    }
  }, [selectedDayKey, selectedSet?.id]);

  const restartQuiz = () => {
    if (!quizState.data) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const timeLimit = getTimeLimitSeconds();
    questionStartRef.current = Date.now();
    setTotalTime(timeLimit);
    setTimeLeft(timeLimit);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          finalizeAndSubmit('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setQuizState({
      active: true,
      loading: false,
      data: quizState.data,
      index: 0,
      answers: quizState.data.problems.map((problem) => ({
        problemId: problem.problemId,
        selected: null,
        timeSpent: 0
      })),
      completed: false,
      submitting: false,
      result: null
    });
    setMessage('다시 한 번 도전해 볼까요? 이번에는 더 많이 맞힐 수 있어요!');
  };

  const finalizeAndSubmit = useCallback((reason = 'manual') => {
    // 1) 현재 상태 스냅샷을 먼저 계산(비동기 setState에 의존하지 않음)
    const now = Date.now();
    const current = quizState; // 최신 스냅샷(클로저)
    const problems = current?.data?.problems || [];
    const answers = Array.isArray(current?.answers) ? [...current.answers] : [];
    const currentProblem = problems[current?.index] || null;
    if (currentProblem && questionStartRef.current) {
      const elapsedSeconds = Math.max(0, Math.round((now - questionStartRef.current) / 1000));
      const existing = answers[current.index] || {
        problemId: currentProblem.problemId,
        selected: null,
        timeSpent: 0
      };
      answers[current.index] = {
        ...existing,
        problemId: currentProblem.problemId,
        timeSpent: (existing.timeSpent || 0) + elapsedSeconds
      };
    }

    // 2) 타이머/상태 즉시 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    questionStartRef.current = null;
    setTimeLeft(0);

    // 3) 화면 전환(완료/제출중) → 제출 호출
    setQuizState((prev) => ({
      ...prev,
      answers,
      completed: true,
      submitting: true
    }));

    // 4) 서버 제출(에러여도 finally에서 submitting=false로 전환됨)
    submitQuiz(answers, reason);
  }, [quizState, submitQuiz]);

  // Practice (연습하기)
  const buildPracticeItems = useCallback(() => {
    if (!selectedSet) return [];
    const keys = selectedDayKeys.length ? selectedDayKeys : (selectedDayKey ? [selectedDayKey] : []);
    const selectedDays = (selectedSet.days || []).filter((d) => keys.includes(d.key) || keys.includes(d.label));
    const entries = selectedDays.flatMap((d) => (d.entries || []).map((e) => ({ term: e.term, meaning: e.meaning, dayKey: d.key })));
    // Shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries;
  }, [selectedSet, selectedDayKey, selectedDayKeys]);

  const handleStartPractice = useCallback(() => {
    const items = buildPracticeItems();
    if (!items.length) {
      setError('먼저 단어장을 선택하고 Day/번호/과를 골라 주세요!');
      return;
    }
    setPracticeState({ active: true, items, index: 0, showBack: false, againQueue: [], front: 'term' });
    setMessage('카드를 뒤집어 뜻을 확인하고, 알겠으면 “알겠어요”, 헷갈리면 “다시 보기”로 표시해요.');
    navigateToStep(STEPS.CONFIGURE);
  }, [buildPracticeItems, navigateToStep]);

  const practiceFlip = useCallback(() => {
    setPracticeState((prev) => ({ ...prev, showBack: !prev.showBack }));
  }, []);

  const practiceToggleFront = useCallback(() => {
    setPracticeState((prev) => ({ ...prev, front: prev.front === 'term' ? 'meaning' : 'term', showBack: false }));
  }, []);

  const movePracticeNext = useCallback((knewIt) => {
    setPracticeState((prev) => {
      if (!prev.active || !prev.items.length) return prev;
      const current = prev.items[prev.index];
      const againQueue = [...prev.againQueue];
      // 모름이면 다시 보기 큐에
      if (!knewIt) againQueue.push(current);
      const nextIndex = prev.index + 1;
      if (nextIndex < prev.items.length) {
        return { ...prev, index: nextIndex, showBack: false, againQueue };
      }
      // 끝까지 왔으면 againQueue를 이어 붙여 한 번 더
      if (againQueue.length) {
        // 새 덱 구성: 아직 남은 것(없음) + againQueue 셔플
        const nextDeck = [...againQueue];
        for (let i = nextDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nextDeck[i], nextDeck[j]] = [nextDeck[j], nextDeck[i]];
        }
        return { active: true, items: nextDeck, index: 0, showBack: false, againQueue: [], front: prev.front };
      }
      // 완전히 완료
      setMessage('연습 완료! 이제 시험에 도전해 볼까요?');
      return { ...prev, active: false };
    });
  }, []);

  const handleStartQuiz = useCallback(async () => {
    const hasMulti = Array.isArray(selectedDayKeys) && selectedDayKeys.length > 1;
    const hasSingle = !!selectedDayKey;
    if (!selectedSet || (!hasSingle && !hasMulti)) {
      setError('먼저 단어장을 선택하고 Day를 골라 주세요!');
      return;
    }

    setQuizState((prev) => ({ ...prev, loading: true }));
    setError('');
    setMessage('');
    navigateToStep(STEPS.CONFIGURE);

    try {
      const payload = hasMulti
        ? { dayKeys: selectedDayKeys, count: QUIZ_SIZE }
        : { dayKey: selectedDayKey, count: QUIZ_SIZE };
      // Always send mode (including 'mixed') for clarity
      payload.mode = quizMode;
      // Order policy: random (default) or sequential
      payload.order = (orderPolicy === 'sequential') ? 'sequential' : 'random';
      const response = await api.vocabulary.generateQuiz(selectedSet.id, payload);

      if (!response?.success || !Array.isArray(response?.problems)) {
        throw new Error(response?.message || '퀴즈를 생성하지 못했습니다.');
      }

      const timeLimit = getTimeLimitSeconds();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const preparedAnswers = response.problems.map((problem) => ({
        problemId: problem.problemId,
        selected: null,
        timeSpent: 0
      }));

      questionStartRef.current = Date.now();
      setTotalTime(timeLimit);
      setTimeLeft(timeLimit);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            finalizeAndSubmit('time');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setQuizState({
        active: true,
        loading: false,
        data: {
          problems: response.problems,
          title: response.title,
          day: response.day,
          documentId: response.documentId
        },
        index: 0,
        answers: preparedAnswers,
        completed: false,
        submitting: false,
        result: null
      });
    } catch (err) {
      setQuizState((prev) => ({ ...prev, loading: false }));
      setError(err?.message || '퀴즈를 시작하지 못했어요. 다시 시도해 주세요.');
    }
  }, [finalizeAndSubmit, getTimeLimitSeconds, selectedDayKey, selectedDayKeys, selectedSet]);

  const handleSubmit = useCallback(() => {
    if (!quizState.data) return;
    const unanswered = quizState.answers.filter((entry) => !entry || !entry.selected).length;
    if (unanswered > 0) {
      const confirmSubmit = window.confirm(`아직 ${unanswered}문제가 선택되지 않았어요. 그래도 제출할까요?`);
      if (!confirmSubmit) {
        return;
      }
    }
    finalizeAndSubmit('manual');
  }, [finalizeAndSubmit, quizState.answers, quizState.data]);

  const handleExitQuiz = useCallback(() => {
    if (!quizState.active) {
      goBackToDays();
      return;
    }

    if (!quizState.completed) {
      const confirmExit = window.confirm('지금 시험을 종료하면 남은 문제를 채점하지 않고 제출할게요. 계속할까요?');
      if (!confirmExit) return;
      finalizeAndSubmit('early-exit');
      return;
    }

    goBackToDays();
  }, [finalizeAndSubmit, goBackToDays, quizState.active, quizState.completed]);

  const quizSummary = quizState.result?.summary || null;

  const normalizedSetQuery = setQuery.trim().toLowerCase();
  const filteredSets = useMemo(() => {
    if (!normalizedSetQuery) return sets;
    return sets.filter((set) => String(set.title || '').toLowerCase().includes(normalizedSetQuery));
  }, [sets, normalizedSetQuery]);

  const activeDay = useMemo(() => {
    if (!selectedSet) return null;
    if (selectedDayKeys.length > 1) return null;
    return selectedSet.days?.find((day) => day.key === selectedDayKey) || null;
  }, [selectedSet, selectedDayKey, selectedDayKeys.length]);

  const selectedDays = useMemo(() => {
    if (!selectedSet) return [];
    const keys = selectedDayKeys.length ? selectedDayKeys : (selectedDayKey ? [selectedDayKey] : []);
    if (!keys.length) return [];
    const keySet = new Set(keys);
    return (selectedSet.days || []).filter((day) => keySet.has(day.key));
  }, [selectedSet, selectedDayKey, selectedDayKeys]);

  const selectedDayLabels = useMemo(
    () => selectedDays.map((day) => day.label || day.key),
    [selectedDays]
  );
  const selectedWordsCount = useMemo(
    () => selectedDays.reduce((sum, day) => sum + Number(day.count || 0), 0),
    [selectedDays]
  );

  const selectionLocked = practiceState.active || quizState.active;
  const stepDescriptors = useMemo(() => ([
    { id: STEPS.SELECT_SET, label: '단어장 고르기' },
    { id: STEPS.SELECT_DAY, label: 'Day 선택 & 미리보기' },
    { id: STEPS.CONFIGURE, label: '시험 준비하기' }
  ]), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollTo = (anchor) => {
      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    if (step === STEPS.SELECT_DAY) {
      scrollTo('vocab-step-2');
    } else if (step === STEPS.CONFIGURE) {
      scrollTo('vocab-step-3');
    }
  }, [step]);

  useEffect(() => {
    if (step === STEPS.SELECT_DAY && !selectedSet) {
      navigateToStep(STEPS.SELECT_SET);
    } else if (step === STEPS.CONFIGURE) {
      if (!selectedSet) {
        navigateToStep(STEPS.SELECT_SET);
      } else if (!selectedDayLabels.length) {
        navigateToStep(STEPS.SELECT_DAY);
      }
    }
  }, [step, selectedSet, selectedDayLabels.length, navigateToStep]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
      <h1 style={styles.title}>🧠 어휘 훈련</h1>
      <p style={styles.subtitle}>
        세트 유형에 따라 단위가 달라요: 워드마스터는 <strong>Day</strong>, 모의고사는 <strong>번호(noXX)</strong>, 교과서는 <strong>과(예: 3과)</strong> 기준으로 정리되어 있어요.<br />
        원하는 단위를 골라 시험을 시작해 보세요. 정답을 고를 때마다 바로 피드백이 제공되어 혼자서도 알차게 복습할 수 있어요. 😊
      </p>
      </header>

      <div style={styles.stepper}>
        {stepDescriptors.map((descriptor, index) => {
          const isActive = step === descriptor.id;
          const isCompleted = step > descriptor.id;
          return (
            <div
              key={descriptor.id}
              style={{
                ...styles.stepperItem,
                ...(isActive ? styles.stepperItemActive : {}),
                ...(isCompleted ? styles.stepperItemCompleted : {})
              }}
            >
              <span style={styles.stepperIndex}>{index + 1}</span>
              <span style={styles.stepperLabel}>{descriptor.label}</span>
            </div>
          );
        })}
      </div>

      {selectionLocked && (
        <div style={styles.lockNotice}>
          현재 연습 또는 시험을 진행 중이에요! 아래 카드에서 마무리하거나 종료하면 다시 단계별로 이동할 수 있어요. 💪
        </div>
      )}

      {!selectionLocked && message && <div style={styles.notice}>{message}</div>}
      {!selectionLocked && error && <div style={{ ...styles.notice, color: 'var(--danger)' }}>{error}</div>}

      {!selectionLocked && (
        <>
          {step === STEPS.SELECT_SET && (
            setsLoading ? (
              <div style={styles.notice}>단어장을 불러오는 중이에요...</div>
            ) : setsError ? (
              <div style={{ ...styles.notice, color: 'var(--danger)' }}>{setsError}</div>
            ) : (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>1️⃣ 단어장 고르기</h2>
                <div style={styles.searchRow}>
                  <input
                    type="search"
                    style={styles.searchInput}
                    placeholder="단어장 이름을 검색해 보세요"
                    value={setQuery}
                    onChange={(event) => setSetQuery(event.target.value)}
                    disabled={sets.length === 0}
                  />
                  {setQuery && (
                    <button
                      type="button"
                      style={styles.searchClear}
                      onClick={() => setSetQuery('')}
                    >
                      지우기
                    </button>
                  )}
                </div>
                {filteredSets.length === 0 ? (
                  <div style={styles.emptySearch}>
                    {sets.length === 0
                      ? '아직 업로드된 단어장이 없어요. 관리자 페이지에서 단어장을 등록하면 바로 여기에서 연습할 수 있어요!'
                      : '검색 결과가 없어요. 다른 키워드로 다시 검색해 볼까요?'}
                  </div>
                ) : (
                  <div style={styles.setGrid}>
                    {filteredSets.map((set) => {
                      const isActive = selectedSet?.id === set.id;
                      return (
                        <button
                          key={set.id}
                          type="button"
                          style={{
                            ...styles.setCard,
                            borderColor: isActive ? 'var(--color-blue-500)' : 'transparent',
                            boxShadow: isActive ? '0 12px 32px rgba(52, 118, 246, 0.25)' : styles.setCard.boxShadow
                          }}
                          onClick={() => handleSelectSet(set)}
                        >
                          <span style={styles.setTitle}>{set.title}</span>
                          <span style={styles.setMeta}>총 {set.totalDays} Day / {set.totalWords} 단어</span>
                          <span style={styles.setMeta}>최근 업로드: {new Date(set.createdAt).toLocaleDateString()}</span>
                          <div style={styles.previewWords}>
                            {set.preview?.map((day) => (
                              <div key={day.key} style={styles.previewDay}>
                                <strong>{day.key}</strong>
                                <span>{day.count} 단어</span>
                                <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>미리보기는 시험에서 확인해요!</span>
                              </div>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )
          )}

          {selectedSet && step === STEPS.SELECT_DAY && (
            <section style={styles.section} id="vocab-step-2">
              <h2 style={styles.sectionTitle}>2️⃣ Day 선택 & 단어 미리보기</h2>
              {daysLoading ? (
                <div style={styles.notice}>Day 정보를 불러오는 중이에요...</div>
              ) : (
                <div style={styles.dayGrid}>
                  {selectedSet.days?.map((day) => {
                    const selected = selectedDayKeys.includes(day.key) || day.key === selectedDayKey;
                    return (
                      <article
                        key={day.key}
                        style={{
                          ...styles.dayCard,
                          borderColor: selected ? 'var(--color-green-500)' : 'transparent',
                          boxShadow: selected ? '0 10px 26px rgba(59, 201, 105, 0.25)' : styles.dayCard.boxShadow
                        }}
                        onClick={() => {
                          resetQuizState();
                          setMessage('단어장을 훑어본 뒤, 아래에서 바로 테스트를 시작해 보세요!');
                          setSelectedDayKeys((prev) => {
                            // toggle behavior; also keep selectedDayKey in sync for single selection
                            const exists = prev.includes(day.key);
                            if (exists) {
                              const next = prev.filter((k) => k !== day.key);
                              if (next.length <= 1) {
                                setSelectedDayKey(next[0] || '');
                              }
                              return next;
                            }
                            const next = [...prev, day.key];
                            if (next.length === 1) setSelectedDayKey(day.key);
                            return next;
                          });
                        }}
                      >
                        <div style={styles.dayHeader}>
                          <strong>{day.label}</strong>
                          <span>{day.count} 단어</span>
                        </div>
                        <div style={styles.daySummary}>
                          총 {day.count}개의 단어가 숨어 있어요. 시험에서 뜻을 맞혀볼까요?
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div style={styles.stepActions}>
                <button type="button" style={styles.stepLinkButton} onClick={handleBackToSetList}>
                  ← 단어장 다시 고르기
                </button>
                <div style={styles.stepSummaryBox}>
                  <h3 style={styles.stepSummaryTitle}>
                    {(() => {
                      if (!selectedDayLabels.length) return '📝 Day를 선택해 주세요';
                      if (selectedDayLabels.length === 1) {
                        const label = selectedDayLabels[0];
                        const count = activeDay?.count ?? selectedWordsCount;
                        return `📝 ${label} | ${count}개 단어`;
                      }
                      return `📝 선택한 Day ${selectedDayLabels.length}개 | 총 ${selectedWordsCount}개 단어`;
                    })()}
                  </h3>
                  <p style={styles.stepSummaryHint}>
                    {selectedDayLabels.length
                      ? '다음 단계에서 시험 유형과 출제 방식을 고른 뒤 바로 시작해 볼까요?'
                      : '위에서 Day를 최소 1개 선택해야 다음 단계로 이동할 수 있어요!'}
                  </p>
                  <button
                    type="button"
                    style={{
                      ...styles.primaryButton,
                      ...(selectedDayLabels.length ? {} : styles.primaryButtonDisabled)
                    }}
                    onClick={handleProceedToSetup}
                    disabled={!selectedDayLabels.length}
                  >
                    다음 단계: 시험 준비로 이동 →
                  </button>
                </div>
              </div>
            </section>
          )}

          {selectedSet && step === STEPS.CONFIGURE && selectedDayLabels.length > 0 && (
            <section style={styles.section} id="vocab-step-3">
              <div style={styles.configureHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>3️⃣ 시험 준비하기</h2>
                  <p style={styles.configureSubtitle}>유형과 출제 순서를 고르고, 연습 또는 시험을 바로 시작해 보세요!</p>
                </div>
                <button type="button" style={styles.stepLinkButton} onClick={() => navigateToStep(STEPS.SELECT_DAY)}>
                  ← Day 다시 선택
                </button>
              </div>

              <div style={styles.configureSummary}>
                <div>
                  <h3 style={styles.actionTitle}>
                    {(() => {
                      if (!selectedDayLabels.length) return '📝 Day 선택 필요';
                      if (selectedDayLabels.length === 1) {
                        const label = selectedDayLabels[0];
                        const count = activeDay?.count ?? selectedWordsCount;
                        return `📝 ${label} | ${count}개 단어`;
                      }
                      return `📝 선택한 Day ${selectedDayLabels.length}개 | 총 ${selectedWordsCount}개 단어`;
                    })()}
                  </h3>
                  <p style={styles.actionHint}>기본 문제 수는 {QUIZ_SIZE}문이며, 정답 즉시 피드백이 제공돼요.</p>
                </div>
                <div style={styles.configureChipList}>
                  {selectedDayLabels.map((label) => (
                    <span key={label} style={styles.configureChip}>{label}</span>
                  ))}
                </div>
              </div>

              <div style={styles.modeGrid}>
                <div style={styles.modeGroup}>
                  <p style={styles.modeGroupTitle}>시험 유형</p>
                  <label style={styles.modeOption}>
                    <input type="radio" name="mode" checked={quizMode === 'mixed'} onChange={() => setQuizMode('mixed')} />
                    혼합(뜻→단어 · 단어→뜻)
                  </label>
                  <label style={styles.modeOption}>
                    <input type="radio" name="mode" checked={quizMode === 'term_to_meaning'} onChange={() => setQuizMode('term_to_meaning')} />
                    단어 → 뜻
                  </label>
                  <label style={styles.modeOption}>
                    <input type="radio" name="mode" checked={quizMode === 'meaning_to_term'} onChange={() => setQuizMode('meaning_to_term')} />
                    뜻 → 단어
                  </label>
                </div>
                <div style={styles.modeGroup}>
                  <p style={styles.modeGroupTitle}>출제 순서</p>
                  <label style={styles.modeOption}>
                    <input type="radio" name="orderPolicy" checked={orderPolicy === 'random'} onChange={() => setOrderPolicy('random')} />
                    랜덤 (추천)
                  </label>
                  <label style={styles.modeOption}>
                    <input type="radio" name="orderPolicy" checked={orderPolicy === 'sequential'} onChange={() => setOrderPolicy('sequential')} />
                    순차 (원문 순서 그대로)
                  </label>
                </div>
              </div>

              <div style={styles.configureActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handleStartPractice}
                >
                  연습하기
                </button>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={handleStartQuiz}
                  disabled={quizState.loading}
                >
                  {quizState.loading ? '문제를 준비 중...' : '시험 시작하기'}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {practiceState.active && (
        <section style={styles.quizSection}>
          <PracticeBox
            item={practiceState.items[practiceState.index]}
            index={practiceState.index}
            total={practiceState.items.length}
            showBack={practiceState.showBack}
            front={practiceState.front}
            onFlip={practiceFlip}
            onKnew={() => movePracticeNext(true)}
            onUnknown={() => movePracticeNext(false)}
            onToggleFront={practiceToggleFront}
            onExit={goBackToDays}
          />
        </section>
      )}

      {quizState.active && quizState.data && (
        <section style={styles.quizSection}>
          {!quizState.completed ? (
            <QuizBox
              problem={quizState.data.problems[quizState.index]}
              index={quizState.index}
              total={quizState.data.problems.length}
              selectedOption={quizState.answers?.[quizState.index]?.selected || null}
              onSelect={handleSelectOption}
              onPrev={handlePrev}
              onNext={handleNext}
              onSubmit={handleSubmit}
              onExit={handleExitQuiz}
              timeLeft={timeLeft}
              totalTime={totalTime}
            />
          ) : (
            <QuizSummary
              summary={quizSummary}
              detail={quizState.result?.detail || []}
              stats={quizState.result?.stats || null}
              rank={quizState.result?.rank || null}
              submitting={quizState.submitting}
              onRetry={restartQuiz}
              onBack={goBackToDays}
            />
          )}
        </section>
      )}
    </div>
  );
};

const PracticeBox = ({ item, index, total, showBack, front, onFlip, onKnew, onUnknown, onToggleFront, onExit }) => {
  if (!item) return null;
  const frontLabel = front === 'term' ? '단어' : '뜻';
  const frontValue = front === 'term' ? item.term : item.meaning;
  const backLabel = front === 'term' ? '뜻' : '단어';
  const backValue = front === 'term' ? item.meaning : item.term;
  return (
    <div style={styles.quizCard}>
      <div style={styles.quizHeader}>
        <span style={styles.quizProgress}>연습 {index + 1} / {total}</span>
        <div style={styles.timerBox}>
          <span>📚 연습 모드</span>
          <button type="button" style={styles.linkButton} onClick={onToggleFront}>표시 전환: {frontLabel} 먼저</button>
        </div>
      </div>
      <h3 style={styles.quizPrompt}>👉 <strong>{frontLabel}</strong>: {frontValue}</h3>
      {showBack && (
        <p style={{ ...styles.quizTerm, fontSize: '1.05rem' }}>💡 <strong>{backLabel}</strong>: {backValue}</p>
      )}
      {!showBack && (
        <div style={{ ...styles.notice, marginTop: 8 }}>카드를 뒤집어 정답을 확인해 보세요.</div>
      )}
      <div style={styles.quizNavRow}>
        <button type="button" style={styles.secondaryButton} onClick={onExit}>나가기</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={styles.linkButton} onClick={onFlip}>뒤집기</button>
          <button type="button" style={styles.secondaryButton} onClick={onUnknown}>다시 보기</button>
          <button type="button" style={styles.primaryButton} onClick={onKnew}>알겠어요</button>
        </div>
      </div>
    </div>
  );
};

const QuizBox = ({
  problem,
  index,
  total,
  selectedOption,
  onSelect,
  onPrev,
  onNext,
  onSubmit,
  onExit,
  timeLeft,
  totalTime
}) => {
  if (!problem) return null;
  const isMeaningMode = problem.mode === 'meaning_to_term';
  const focusLabel = isMeaningMode ? '뜻' : '단어';
  const focusValue = isMeaningMode ? problem.meaning : problem.term;

  const body = problem.options.map((option, idx) => {
    const choiceNumber = idx + 1;
    const isSelected = selectedOption === choiceNumber;
    return (
      <button
        key={`${problem.problemId}-${choiceNumber}`}
        type="button"
        style={{
          ...styles.optionButton,
          ...(isSelected ? styles.optionButtonSelected : {})
        }}
        onClick={() => onSelect(idx)}
      >
        <span style={styles.optionNumber}>{choiceNumber}.</span>
        <span>{option}</span>
      </button>
    );
  });

  return (
    <div style={styles.quizCard}>
      <div style={styles.quizHeader}>
        <span style={styles.quizProgress}>문제 {index + 1} / {total}</span>
        <div style={styles.timerBox}>
          <span>⏳ {formatSeconds(timeLeft)} 남음</span>
          <span style={styles.timerSub}>전체 {formatSeconds(totalTime)}</span>
        </div>
      </div>
      <h3 style={styles.quizPrompt}>{problem.prompt}</h3>
      <p style={styles.quizTerm}>👉 <strong>{focusLabel}</strong>: {focusValue}</p>
      <div style={styles.optionList}>{body}</div>
      <div style={styles.quizNavRow}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onPrev}
          disabled={index === 0}
        >
          ◀ 이전 문제
        </button>
        <button
          type="button"
          style={styles.linkButton}
          onClick={onExit}
        >
          시험 종료
        </button>
        {index === total - 1 ? (
          <button type="button" style={styles.primaryButton} onClick={onSubmit}>
            제출하기
          </button>
        ) : (
          <button type="button" style={styles.primaryButton} onClick={onNext}>
            다음 문제 ▶
          </button>
        )}
      </div>
    </div>
  );
};

const QuizSummary = ({ summary, detail, stats, rank, submitting, onRetry, onBack }) => {
  // Hooks must be called unconditionally
  const safeDetail = Array.isArray(detail) ? detail : [];
  const computed = useMemo(() => {
    if (summary && typeof summary === 'object') return summary;
    const total = safeDetail.length;
    const correct = safeDetail.filter((e) => e && e.isCorrect).length;
    const incorrect = Math.max(0, total - correct);
    const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
    return total ? { total, correct, incorrect, accuracy, pointsDelta: 0 } : null;
  }, [summary, safeDetail]);

  if (submitting) {
    return (
      <div style={styles.quizCard}>
        <h3 style={styles.quizPrompt}>채점 중입니다... ⏳</h3>
        <p style={styles.actionHint}>정답과 해설을 정리하고 있어요. 잠시만 기다려 주세요!</p>
      </div>
    );
  }

  return (
    <div style={styles.quizCard}>
      <div style={styles.resultBanner}>
        <h3 style={styles.quizPrompt}>🎉 수고했어요! 결과를 확인해 볼까요?</h3>
        <p style={styles.resultSubtitle}>이번 시도에서 쌓은 경험이 다음 점수를 올려 줄 거예요!</p>
      </div>
      {(computed) && (
        <div style={styles.summaryStats}>
          <span>총 문제: {computed.total}문제</span>
          <span>정답: {computed.correct}문제</span>
          <span>틀린 문제: {computed.incorrect}문제</span>
          <span>정답률: {computed.accuracy}%</span>
          {typeof computed.pointsDelta === 'number' && (
            <span>점수 변화: {computed.pointsDelta >= 0 ? '+' : ''}{computed.pointsDelta}점</span>
          )}
        </div>
      )}

      {rank && (
        <div style={styles.rankCard}>
          <div style={styles.rankHeader}>
            <span style={styles.rankTier}>
              {rank.tier?.icon || '🌟'} {rank.tier?.nameKr || rank.tier?.name || '티어 미정'}
            </span>
            <span style={styles.rankPoints}>{rank.points ?? 0} LP</span>
            {typeof rank.rank === 'number' && (
              <span style={styles.rankOrder}>전체 {rank.rank}위</span>
            )}
          </div>
          {rank.nextTier ? (
            <div style={styles.progressBlock}>
              <div style={styles.progressLabel}>
                다음 티어 {rank.nextTier.nameKr || rank.nextTier.name}까지 {Math.max(0, (rank.nextTier.minLP || 0) - (rank.points || 0))}점 남았어요!
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${Math.min(100, Math.max(0, rank.progressToNext || 0))}%`
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={styles.progressLabel}>최고 티어에 도달했어요! 멋져요! 🏆</div>
          )}
        </div>
      )}

      <div style={styles.reviewList}>
        {detail.map((entry, idx) => {
          const correctOptionText = (entry.correctOption || '').replace(/^[\u2460-\u2464]\s*/, '');
          const selectedOptionRaw = entry.options?.[Number(entry.selected) - 1] || '';
          const selectedOptionText = selectedOptionRaw
            ? selectedOptionRaw.replace(/^[\u2460-\u2464]\s*/, '')
            : '—';
          const isMeaningMode = entry.mode === 'meaning_to_term';
          const modeLabel = isMeaningMode ? '뜻 → 단어' : '단어 → 뜻';
          const focusLabel = isMeaningMode ? '뜻' : '단어';
          const focusValue = isMeaningMode ? (entry.meaning || entry.term || '—') : (entry.term || entry.meaning || '—');

          return (
            <div
              key={entry.problemId || idx}
              style={{
                ...styles.reviewItem,
                borderColor: entry.isCorrect ? 'var(--success)' : 'var(--danger)'
              }}
            >
              <div style={styles.reviewHeader}>
                <strong>{idx + 1}. {modeLabel}</strong>
                <span>{focusLabel}: {focusValue}</span>
              </div>
              <span>정답: {correctOptionText}</span>
              {entry.selected ? (
                <span>내 답안: {entry.selected}번 ({selectedOptionText})</span>
              ) : (
                <span>내 답안: 미응답</span>
              )}
              {typeof entry.timeSpent === 'number' && entry.timeSpent > 0 && (
                <span>소요 시간: {entry.timeSpent}초</span>
              )}
              {!entry.isCorrect && <span style={{ color: 'var(--danger)' }}>{entry.explanation}</span>}
            </div>
          );
        })}
      </div>

      {stats && (
        <div style={styles.statsCallout}>
          <p>지금까지 총 {stats.totalProblems}문제를 풀어 {stats.totalCorrect}문제 맞혔어요. 정답률 {stats.accuracy}%!</p>
        </div>
      )}

      <div style={styles.summaryActions}>
        <button type="button" style={styles.primaryButton} onClick={onRetry}>다시 풀기</button>
        <button type="button" style={styles.secondaryButton} onClick={onBack}>다른 Day 고르기</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '2.4rem',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '1.05rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6
  },
  stepper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    margin: '0 0 24px'
  },
  stepperItem: {
    flex: '1 1 160px',
    minWidth: '140px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  stepperItemActive: {
    borderColor: 'var(--color-blue-500)',
    color: 'var(--color-blue-500)',
    background: 'rgba(59,130,246,0.12)'
  },
  stepperItemCompleted: {
    borderColor: 'var(--color-green-500)',
    color: 'var(--color-green-600, #16a34a)',
    background: 'rgba(34,197,94,0.14)'
  },
  stepperIndex: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: '999px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    fontWeight: 700,
    fontSize: '0.9rem'
  },
  stepperLabel: {
    fontSize: '0.95rem'
  },
  lockNotice: {
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '20px',
    color: 'var(--text-secondary)',
    fontWeight: 600
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '1.4rem',
    marginBottom: '16px'
  },
  searchRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px'
  },
  searchInput: {
    flex: '1 1 280px',
    minWidth: '220px',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)'
  },
  searchClear: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  setGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px'
  },
  setCard: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '20px',
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.25s ease',
    border: '2px solid transparent',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
  },
  setTitle: {
    display: 'block',
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--text-primary)',
    textShadow: '0 1px 2px rgba(0,0,0,0.25)'
  },
  setMeta: {
    display: 'block',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginBottom: '4px'
  },
  previewWords: {
    marginTop: '12px',
    borderTop: '1px dashed var(--border-color)',
    paddingTop: '12px',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    display: 'grid',
    gap: '8px'
  },
  previewDay: {
    display: 'flex',
    flexDirection: 'column'
  },
  dayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px'
  },
  dayCard: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '18px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)'
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  daySummary: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)'
  },
  stepActions: {
    marginTop: '24px',
    padding: '20px',
    background: 'var(--surface-muted)',
    borderRadius: '16px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  stepLinkButton: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--color-blue-500)',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '10px 12px',
    borderRadius: '10px'
  },
  stepSummaryBox: {
    flex: '1 1 320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  stepSummaryTitle: {
    fontSize: '1.15rem',
    margin: 0
  },
  stepSummaryHint: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    margin: 0
  },
  primaryButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  actionTitle: {
    fontSize: '1.1rem',
    marginBottom: '4px'
  },
  actionHint: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)'
  },
  configureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  configureSubtitle: {
    color: 'var(--text-muted)',
    marginTop: '6px'
  },
  configureSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)'
  },
  configureChipList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  configureChip: {
    background: 'rgba(59,130,246,0.15)',
    color: 'var(--color-blue-500)',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginTop: '24px'
  },
  modeGroup: {
    background: 'var(--surface-soft)',
    borderRadius: '16px',
    border: '1px solid var(--surface-border)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  modeGroupTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0
  },
  modeOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.95rem',
    color: 'var(--text-primary)'
  },
  configureActions: {
    marginTop: '24px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  quizSection: {
    marginBottom: '32px',
    padding: '32px',
    borderRadius: '26px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(96, 165, 250, 0.08) 45%, rgba(129, 140, 248, 0.12) 100%)'
  },
  quizCard: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
    color: 'var(--text-primary)'
  },
  quizHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  quizProgress: {
    fontWeight: 600,
    color: 'var(--color-blue-500)'
  },
  quizPrompt: {
    fontSize: '1.25rem',
    lineHeight: 1.5,
    marginBottom: '12px',
    color: 'var(--text-primary)'
  },
  quizTerm: {
    fontSize: '1.05rem',
    marginBottom: '16px',
    color: 'var(--text-secondary)'
  },
  optionList: {
    display: 'grid',
    gap: '12px'
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
    color: 'var(--text-primary)'
  },
  optionButtonSelected: {
    borderColor: 'var(--color-green-500)',
    background: 'rgba(34, 197, 94, 0.18)',
    boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.25) inset'
  },
  optionNumber: {
    fontWeight: 700,
    color: 'var(--color-blue-500)'
  },
  summaryStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
    fontWeight: 600
  },
  resultBanner: {
    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(165, 180, 252, 0.2) 100%)',
    padding: '20px',
    borderRadius: '18px',
    marginBottom: '18px'
  },
  resultSubtitle: {
    marginTop: '8px',
    fontSize: '0.95rem',
    color: 'var(--text-muted)'
  },
  reviewList: {
    display: 'grid',
    gap: '12px',
    marginBottom: '18px'
  },
  reviewItem: {
    border: '2px solid transparent',
    borderRadius: '16px',
    padding: '14px',
    background: 'var(--surface-card)',
    display: 'grid',
    gap: '4px'
  },
  reviewHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  rankCard: {
    padding: '18px 20px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.18) 0%, rgba(14, 165, 233, 0.18) 100%)',
    marginBottom: '18px',
    display: 'grid',
    gap: '12px',
    color: 'var(--text-primary)'
  },
  rankHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    fontWeight: 700,
    fontSize: '1.05rem'
  },
  rankTier: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'var(--surface-card)',
    boxShadow: '0 6px 16px rgba(14, 165, 233, 0.25)'
  },
  rankPoints: {
    fontWeight: 700,
    color: 'var(--color-blue-500)'
  },
  rankOrder: {
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  progressBlock: {
    display: 'grid',
    gap: '8px'
  },
  progressLabel: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)'
  },
  progressBar: {
    height: '10px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--color-blue-500) 0%, var(--color-green-500) 100%)'
  },
  statsCallout: {
    padding: '12px 16px',
    borderRadius: '14px',
    background: 'var(--surface-soft)',
    marginBottom: '16px',
    fontSize: '0.95rem'
  },
  summaryActions: {
    display: 'flex',
    gap: '12px'
  },
  notice: {
    background: 'var(--surface-soft)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '20px',
    color: 'var(--text-secondary)'
  },
  emptySearch: {
    background: 'var(--surface-soft)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    border: '1px dashed var(--surface-border)'
  },
  quizNavRow: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  primaryButton: {
    background: 'var(--accent-gradient)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600
  },
  secondaryButton: {
    background: 'var(--surface-muted)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-blue-500)',
    cursor: 'pointer',
    fontWeight: 600
  },
  timerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  timerSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  }
};

export default VocabularyPage;
