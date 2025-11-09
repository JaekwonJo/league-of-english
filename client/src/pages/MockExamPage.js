import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import FriendlyError from '../components/common/FriendlyError';
import { api } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';
import EagleGuideChip from '../components/common/EagleGuideChip';

const INITIAL_STATE = {
  exam: null,
  status: 'loading', // loading | ready | in-progress | finished | error
  error: '',
  currentIndex: 0,
  answers: {},
  timeLeft: 0,
  result: null,
  submitting: false
};

const MockExamPage = () => {
  const { user, updateUser } = useAuth();
  const [state, setState] = useState(INITIAL_STATE);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [explanations, setExplanations] = useState({});
  const [explanationErrors, setExplanationErrors] = useState({});
  const [activeTab, setActiveTab] = useState('exam'); // exam | review
  const [examList, setExamList] = useState([]);
  const [examListError, setExamListError] = useState('');
  const [examListLoading, setExamListLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState('');

  const isProMember = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const membership = String(user.membership || '').toLowerCase();
    return membership === 'pro';
  }, [user]);

  const selectedExamMeta = useMemo(() => {
    const activeId = state.exam?.examId || selectedExamId;
    return examList.find((exam) => exam.id === activeId) || null;
  }, [examList, selectedExamId, state.exam]);

  useEffect(() => {
    const loadExamList = async () => {
      try {
        setExamListLoading(true);
        setExamListError('');
        const response = await api.mockExam.list();
        if (!response?.success) {
          throw new Error(response?.message || '모의고사 목록을 불러오지 못했습니다.');
        }
        const normalized = Array.isArray(response.data) ? response.data : [];
        setExamList(normalized);
        if (normalized.length) {
          setSelectedExamId((prev) => prev || normalized[0].id);
        }
      } catch (error) {
        setExamListError(error.message || '모의고사 목록을 불러오지 못했습니다.');
      } finally {
        setExamListLoading(false);
      }
    };

    loadExamList();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchExam = useCallback(async (examId) => {
    if (!examId) return;
    setState((prev) => ({
      ...INITIAL_STATE,
      status: 'loading'
    }));

    try {
      const response = await api.mockExam.getExam(examId);
      if (response?.success) {
        setExplanations({});
        setExplanationErrors({});
        setActiveTab('exam');
        setState((prev) => ({
          ...prev,
          exam: response.data,
          status: 'ready'
        }));
        if (response.data?.examId) {
          setSelectedExamId(response.data.examId);
        }
      } else {
        throw new Error(response?.message || '시험 정보를 불러오지 못했습니다.');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error.message || '시험 정보를 불러오지 못했습니다.'
      }));
    }
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchExam(selectedExamId);
    }
  }, [selectedExamId, fetchExam]);

  useEffect(() => {
    if (state.status !== 'in-progress') return;
    if (!state.timeLeft) return;

    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.status !== 'in-progress') {
          clearInterval(timer);
          return prev;
        }
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.timeLeft]);

  const handleStart = () => {
    if (!state.exam) return;
    setState((prev) => ({
      ...prev,
      status: 'in-progress',
      timeLeft: prev.exam.timeLimitSeconds || 3000,
      currentIndex: 0,
      answers: {},
      result: null
    }));
    setActiveTab('exam');
  };

  const handleSelectExam = (examId) => {
    if (!examId || examId === selectedExamId) return;
    if (state.status === 'in-progress') {
      alert('진행 중인 시험을 먼저 제출하거나 종료해 주세요.');
      return;
    }
    setSelectedExamId(examId);
  };

  const handleSelectOption = (questionNumber, choiceIndex) => {
    if (state.status !== 'in-progress') return;
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionNumber]: choiceIndex
      }
    }));
  };

  const handleNavigate = (index) => {
    if (!state.exam) return;
    const clamped = Math.min(Math.max(index, 0), state.exam.questions.length - 1);
    setState((prev) => ({ ...prev, currentIndex: clamped }));
  };

  const handleSubmit = async (auto = false) => {
    if (!state.exam) return;
    if (state.submitting) return;

    if (!auto) {
      const confirmed = window.confirm('시험을 제출할까요?\n제출 후에는 답안을 수정할 수 없습니다.');
      if (!confirmed) return;
    }

    setState((prev) => ({ ...prev, submitting: true }));

    try {
      const payload = {
        answers: state.answers
      };
      const response = await api.mockExam.submit(state.exam?.examId || selectedExamId, payload);
      if (!response?.success) {
        throw new Error(response?.message || '채점에 실패했습니다.');
      }
      setState((prev) => ({
        ...prev,
        status: 'finished',
        submitting: false,
        result: response.data,
        timeLeft: prev.status === 'in-progress' ? prev.timeLeft : prev.timeLeft,
        currentIndex: 0
      }));
      if (response.data?.updatedUser && typeof updateUser === 'function') {
        try {
          updateUser({ ...(user || {}), ...response.data.updatedUser });
        } catch (updateError) {
          console.warn('[mockExam] failed to update auth state:', updateError?.message || updateError);
        }
      }
      setActiveTab('review');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        submitting: false
      }));
      alert(error.message || '채점 중 문제가 발생했습니다.');
    }
  };

  const loadExplanation = async (questionNumber) => {
    if (!isProMember) {
      setExplanationErrors((prev) => ({
        ...prev,
        [questionNumber]: '프로 전용 기능입니다. 업그레이드 후 이용해 주세요.'
      }));
      return;
    }

    if (explanations[questionNumber]?.status === 'loading') return;
    if (explanations[questionNumber]?.text) return;

    setExplanations((prev) => ({
      ...prev,
      [questionNumber]: {
        status: 'loading'
      }
    }));
    setExplanationErrors((prev) => ({ ...prev, [questionNumber]: '' }));

    try {
      const response = await api.mockExam.explanation(state.exam?.examId || selectedExamId, { questionNumber });
      if (!response?.success) {
        throw new Error(response?.message || '해설을 가져오지 못했습니다.');
      }
      setExplanations((prev) => ({
        ...prev,
        [questionNumber]: {
          status: 'done',
          text: response.data.explanation,
          cached: response.data.cached
        }
      }));
    } catch (error) {
      setExplanations((prev) => ({
        ...prev,
        [questionNumber]: {
          status: 'error'
        }
      }));
      setExplanationErrors((prev) => ({
        ...prev,
        [questionNumber]: error.message || '해설을 가져오지 못했습니다.'
      }));
    }
  };

  const resetExam = () => {
    setState((prev) => ({
      ...prev,
      status: 'ready',
      answers: {},
      timeLeft: 0,
      currentIndex: 0,
      result: null
    }));
    setExplanations({});
    setExplanationErrors({});
    setActiveTab('exam');
  };

  const renderLoading = () => (
    <section style={styles.loadingSection}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>모의고사 정보를 불러오는 중이에요...</p>
    </section>
  );

  const renderError = () => (
    <FriendlyError
      error={{
        summary: '모의고사 데이터를 불러오지 못했습니다.',
        detail: state.error
      }}
      onRetry={fetchExam}
    />
  );

  const heroPrimaryLabel = state.status === 'in-progress'
    ? '시험 진행 중'
    : state.status === 'finished'
      ? '다시 응시하기'
      : '시험 시작하기';
  const heroPrimaryDisabled = !state.exam || (state.status === 'in-progress' && !state.result);

  const renderHero = () => (
    <section style={styles.heroSection}>
      <div style={styles.heroContent}>
        <span style={styles.heroBadge}>Mock Test Studio</span>
        <h1 style={styles.heroTitle}>실전 감각을 그대로, 50분 안에!</h1>
        <p style={styles.heroSubtitle}>
          회차를 고르고 시험지를 펼치면 타이머와 문항 이동을 자동으로 챙겨 드려요.
          채점 후에는 오답만 골라 해설을 확인할 수 있어요.
        </p>
        <div style={styles.heroMetaRow}>
          <HeroMeta icon="Clock" label="타이머" value={`${Math.round((state.exam?.timeLimitSeconds || 3000) / 60)}분`} />
          <HeroMeta icon="AlignRight" label="문항 수" value={`${state.exam?.questions?.length || selectedExamMeta?.questionCount || 0}문`} />
          <HeroMeta icon="BookOpen" label="선택 회차" value={selectedExamMeta?.title || '선택 대기 중'} />
        </div>
        <div style={styles.heroButtons}>
          <button
            type="button"
            style={{
              ...styles.primaryButton,
              ...(heroPrimaryDisabled ? styles.primaryButtonDisabled : {})
            }}
            onClick={handleStart}
            disabled={heroPrimaryDisabled}
          >
            <LucideIcons.Play size={18} /> {heroPrimaryLabel}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
            <LucideIcons.ChevronDown size={18} /> 절차 살펴보기
          </button>
        </div>
      </div>
      <div style={styles.heroIllustration}>
        <div style={styles.heroAura} aria-hidden="true" />
        <div style={styles.heroOwlBody}>
          <div style={styles.heroOwlFace}>
            <span style={styles.heroOwlEyeLeft} />
            <span style={styles.heroOwlEyeRight} />
            <span style={styles.heroOwlBeak} />
          </div>
          <div style={styles.heroOwlWingLeft} />
          <div style={styles.heroOwlWingRight} />
          <div style={styles.heroOwlBadge}>🦅</div>
          <div style={styles.heroOwlFeet} />
        </div>
        <span style={styles.heroSparkles} aria-hidden="true">✨</span>
      </div>
    </section>
  );

  const renderExamPicker = () => (
    <section style={styles.section}>
      <div style={styles.sectionHeadingRow}>
        <h2 style={styles.sectionTitle}>응시할 모의고사 선택</h2>
        <span style={styles.sectionHint}>필요한 회차를 고르면 시험지와 타이머가 바로 준비돼요.</span>
      </div>
      {examListLoading ? (
        <div style={styles.notice}>회차 목록을 불러오는 중입니다...</div>
      ) : examListError ? (
        <div style={{ ...styles.notice, color: 'var(--danger-strong)' }}>{examListError}</div>
      ) : (
        <div style={styles.examPickerGrid}>
          {examList.map((exam) => {
            const isActive = (state.exam?.examId || selectedExamId) === exam.id;
            const disabled = state.status === 'in-progress' && !isActive;
            return (
              <button
                key={exam.id}
                type="button"
                style={{
                  ...styles.examCard,
                  ...(isActive ? styles.examCardActive : {}),
                  ...(disabled ? styles.examCardDisabled : {})
                }}
                onClick={() => handleSelectExam(exam.id)}
                disabled={disabled}
              >
                <div style={styles.examCardHeader}>
                  <span style={styles.examCardBadge}>{isActive ? '선택됨' : '선택 가능'}</span>
                  <strong style={styles.examCardTitle}>{exam.title}</strong>
                </div>
                <p style={styles.examCardMeta}>총 {exam.questionCount || 0}문항</p>
                {!isActive && disabled && <p style={styles.examCardMeta}>다른 회차는 시험 종료 후 선택할 수 있어요.</p>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderIntro = () => (
    <div style={styles.pageContainer}>
      {renderHero()}
      {renderExamPicker()}

      <section style={styles.focusTipCard}>
        <div style={styles.focusTipIcon}>🦅</div>
        <div style={styles.focusTipBody}>
          <p style={styles.focusTipLabel}>집중 모드 TIP</p>
          <h3 style={styles.focusTipTitle}>방해금지 모드를 켜두면 더 몰입돼요</h3>
          <p style={styles.focusTipText}>
            휴대폰과 PC 알림을 잠시 끄고, 시험이 끝나면 버튼 하나로 해제하세요.
            실전 같은 집중력을 만드는 가장 빠른 방법이에요.
          </p>
          <ul style={styles.focusTipList}>
            <li>모바일: 설정 → 집중 모드(방해 금지) → 50분 타이머만 남겨두기</li>
            <li>PC: 알림 센터에서 “방해 금지”를 켜고, 시험 종료 후 해제</li>
          </ul>
        </div>
        <span style={styles.focusTipGlow} aria-hidden="true" />
      </section>

      <section style={styles.tipCard}>
        <LucideIcons.ClipboardList size={22} style={styles.tipIcon} />
        <div>
          <h3 style={styles.tipTitle}>응시 절차</h3>
          <ul style={styles.tipList}>
            <li>회차를 선택하고 `시험 시작하기`를 누르면 타이머가 곧바로 흐릅니다.</li>
            <li>문항 카드를 눌러 이동하고, 답을 고르면 자동 저장돼요.</li>
            <li>제출 후에는 틀린 문제만 골라 해설을 불러올 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </div>
  );

  const renderExamPlayer = () => {
    const question = state.exam?.questions[state.currentIndex];
    if (!question) return null;
    const selected = state.answers[question.number];
    const total = state.exam.questions.length;
    const answeredCount = Object.keys(state.answers).length;
    const progress = Math.round((answeredCount / total) * 100);

    return (
      <div style={styles.examLayout}>
        <header style={styles.examHeader}>
          <div style={styles.examHeaderLeft}>
            <span style={styles.examBadge}>실전 모드</span>
            <h2 style={styles.examTitle}>문항 {question.number}</h2>
            <p style={styles.examSubtitle}>총 {total}문항 중 {state.currentIndex + 1}번째 문제</p>
          </div>
          <div style={styles.timerCard}>
            <LucideIcons.AlarmClock size={22} />
            <div>
              <span style={styles.timerLabel}>남은 시간</span>
              <strong style={{
                ...styles.timerValue,
                color: state.timeLeft <= 300 ? 'var(--danger-strong)' : 'var(--text-primary)'
              }}>
                {formatTime(state.timeLeft)}
              </strong>
            </div>
          </div>
        </header>

        <div style={styles.progressBarWrapper}>
          <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
        </div>

        <div style={styles.questionCard} data-testid="mock-question" data-question-number={question.number}>
          <div style={styles.questionGuideLine} aria-hidden="true" />
          <div style={styles.questionPrompt}>
            {question.promptLines.map((line, idx) => (
              <p key={idx} style={styles.promptLine}>{line}</p>
            ))}
          </div>

          <div style={styles.choicesGrid}>
            {question.choices.map((choice, idx) => {
              const isSelected = selected === idx;
              return (
                <button
                  key={choice.mark || idx}
                  data-testid="mock-choice"
                  data-choice-index={idx}
                  type="button"
                  style={{
                    ...styles.choiceButton,
                    ...(isSelected ? styles.choiceButtonSelected : {})
                  }}
                  onClick={() => handleSelectOption(question.number, idx)}
                >
                  <span style={styles.choiceMark}>{CHOICES[idx]}</span>
                  <span style={styles.choiceText}>{choice.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <footer style={styles.examFooter}>
          <div style={styles.navigationButtons}>
          <button
            type="button"
            className="ui-focus-ring ui-pressable"
            style={{
              ...styles.navButton,
              ...(state.currentIndex === 0 ? styles.navButtonDisabled : {})
            }}
              onClick={() => handleNavigate(state.currentIndex - 1)}
              disabled={state.currentIndex === 0}
            >
              <LucideIcons.ArrowLeft size={18} /> 이전
            </button>
          <button
            type="button"
            className="ui-focus-ring ui-pressable"
            style={{
              ...styles.navButton,
              ...(state.currentIndex === total - 1 ? styles.navButtonDisabled : {})
            }}
              onClick={() => handleNavigate(state.currentIndex + 1)}
              disabled={state.currentIndex === total - 1}
            >
              다음 <LucideIcons.ArrowRight size={18} />
            </button>
          </div>

          <button
            type="button"
            className="ui-focus-ring ui-pressable"
            style={{
              ...styles.primaryButton,
              ...styles.submitButton,
              ...(state.submitting ? styles.primaryButtonDisabled : {})
            }}
            onClick={() => handleSubmit(false)}
            disabled={state.submitting}
            data-testid="mock-submit"
          >
            {state.submitting ? '제출 중...' : '모의고사 제출하기'}
          </button>
        </footer>

        {isMobile && (
          <div style={styles.bottomActionBar}>
            <div style={styles.bottomTimer}>
              <LucideIcons.AlarmClock size={18} /> {formatTime(state.timeLeft)}
            </div>
            <button
              type="button"
              className="ui-focus-ring ui-pressable"
              style={{
                ...styles.primaryButton,
                ...styles.bottomSubmitButton,
                ...(state.submitting ? styles.primaryButtonDisabled : {})
              }}
              onClick={() => handleSubmit(false)}
              disabled={state.submitting}
            >
              {state.submitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        )}

        <div style={styles.questionNavRail}>
          {state.exam.questions.map((item, idx) => {
            const answered = state.answers[item.number] !== undefined;
            const isCurrent = idx === state.currentIndex;
            return (
              <button
                key={item.number}
                type="button"
                style={{
                  ...styles.questionDot,
                  ...(answered ? styles.questionDotAnswered : {}),
                  ...(isCurrent ? styles.questionDotActive : {})
                }}
                onClick={() => handleNavigate(idx)}
              >
                {item.number}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!state.result) return null;
    const { total, correctCount, incorrectCount, accuracy } = state.result;
    const unanswered = state.result.unansweredCount !== undefined
      ? state.result.unansweredCount
      : total - correctCount - incorrectCount;

    return (
      <div style={styles.pageContainer} data-testid="mock-result">
        {renderHero()}
        {renderExamPicker()}

        <div style={styles.resultLayout}>
          <section style={styles.resultHero}>
            <div style={styles.resultSummaryCard} className="anim-fadeInUp delay-0">
              <span style={styles.heroBadge}>결과 요약</span>
              <h2 style={styles.resultTitle}>수고했어요! 점수를 확인해 볼까요?</h2>
              <p style={styles.resultSubtitle}>총 {total}문항 중 {correctCount}문항을 맞혔어요. 다시 도전하거나 해설을 확인해 보세요.</p>
              <EagleGuideChip text="결과를 저장하고 싶다면 화면을 캡처해 두세요!" />
              <div style={styles.resultMetricsRow}>
                <ResultMetric icon="CheckCircle" label="정답" value={`${correctCount}문항`} accent="success" className="anim-fadeInUp delay-0" />
                <ResultMetric icon="XCircle" label="오답" value={`${incorrectCount}문항`} accent="danger" className="anim-fadeInUp delay-1" />
                <ResultMetric icon="CircleDashed" label="미응시" value={`${unanswered}문항`} accent="muted" className="anim-fadeInUp delay-2" />
                <ResultMetric icon="Percent" label="정답률" value={`${accuracy}%`} accent="primary" className="anim-fadeInUp delay-3" />
              </div>
              <EagleGuideChip text="방금 점수가 학습 통계 · 랭킹에 바로 반영됐어요" variant="accent" />
              <div style={styles.resultActions}>
                <button type="button" style={styles.secondaryButton} onClick={resetExam}>
                  <LucideIcons.RotateCcw size={18} /> 다시 풀기
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    ...(activeTab === 'review' ? styles.primaryButtonActive : {})
                  }}
                  onClick={() => setActiveTab('review')}
                >
                  <LucideIcons.BookOpenCheck size={18} /> 해설 / 복습 보기
                </button>
              </div>
            </div>
            <div className="confetti-container" aria-hidden="true">
              {Array.from({ length: 14 }).map((_, idx) => {
                const colors = ['confetti-red','confetti-blue','confetti-yellow','confetti-green','confetti-purple'];
                const color = colors[idx % colors.length];
                const left = 6 + (idx * 6) % 88;
                const delay = (idx % 5) * 120;
                return (
                  <span
                    key={`conf-${idx}`}
                    className={`confetti-piece ${color}`}
                    style={{ left: `${left}%`, animationDelay: `${delay}ms` }}
                  />
                );
              })}
            </div>
          </section>

        <section style={styles.reviewSection}>
          <div style={styles.reviewHeader}>
            <h3 style={styles.reviewTitle}>문항별 복습</h3>
            <p style={styles.reviewSubtitle}>선택지 색상으로 맞힌 문제를 한눈에 확인할 수 있어요.</p>
            <EagleGuideChip text="선택지를 눌러 해설과 해답을 바로 확인하세요" variant="accent" />
          </div>

          <div style={styles.reviewList}>
            {state.result.detail.map((item) => {
              const explanation = explanations[item.number];
              const explanationError = explanationErrors[item.number];
              const canShowExplanation = !item.isCorrect;
              return (
                <article
                  key={item.number}
                  style={{
                    ...styles.reviewCard,
                    ...(item.isCorrect ? styles.reviewCardCorrect : styles.reviewCardIncorrect)
                  }}
                >
                  <div style={styles.reviewCardHeader}>
                    <div>
                      <span style={styles.reviewBadge}>문항 {item.number}</span>
                      <h4 style={styles.reviewQuestionTitle}>{item.promptLines?.[0] || item.prompt.split('\n')[0]}</h4>
                    </div>
                    <span style={item.isCorrect ? styles.reviewTagCorrect : styles.reviewTagIncorrect}>
                      {item.isCorrect ? '정답' : '오답' }
                    </span>
                  </div>

                  <div style={styles.reviewChoices}>
                    {item.choices.map((choice, idx) => {
                      const isCorrectChoice = idx === item.correctIndex;
                      const isUserChoice = idx === item.userIndex;
                      return (
                        <div
                          key={`${item.number}-${idx}`}
                          style={{
                            ...styles.reviewChoice,
                            ...(isCorrectChoice ? styles.reviewChoiceCorrect : {}),
                            ...(isUserChoice && !isCorrectChoice ? styles.reviewChoiceSelected : {})
                          }}
                        >
                          <span style={styles.choiceMark}>{CHOICES[idx]}</span>
                          <span style={styles.choiceText}>{choice.text}</span>
                          {isCorrectChoice && <span style={styles.choiceLabelCorrect}>정답</span>}
                          {isUserChoice && !isCorrectChoice && <span style={styles.choiceLabelMine}>내 답안</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div style={styles.reviewFooter}>
                    <div style={styles.reviewActions}>
                      {canShowExplanation ? (
                        <button
                          type="button"
                          style={{
                            ...styles.secondaryButton,
                            ...(explanation?.status === 'loading' ? styles.primaryButtonDisabled : {}),
                            ...(explanation?.text ? styles.secondaryButtonActive : {})
                          }}
                          onClick={() => loadExplanation(item.number)}
                          disabled={explanation?.status === 'loading'}
                        >
                          <LucideIcons.Wand2 size={18} /> 해설 보기 {explanation?.cached ? '(캐시)' : ''}
                        </button>
                      ) : (
                        <span style={styles.reviewSolvedCopy}>정답 처리된 문항이에요 👏</span>
                      )}
                    </div>
                    {explanation?.status === 'loading' && (
                      <div style={styles.explanationLoading}>해설을 불러오는 중이에요...</div>
                    )}
                    {explanationError && (
                      <div style={styles.explanationError}>{explanationError}</div>
                    )}
                    {explanation?.text && (
                      <div style={styles.explanationBox}>
                        {explanation.text.split('\n').map((line, idx) => (
                          <p key={idx} style={styles.explanationLine}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        </div>
      </div>
    );
  };

  if (state.status === 'loading') return renderLoading();
  if (state.status === 'error') return renderError();
  if (state.status === 'ready') return renderIntro();
  if (state.status === 'in-progress') return renderExamPlayer();
  if (state.status === 'finished') return renderResult();

  return null;
};

const HeroMeta = ({ icon, label, value, highlight }) => {
  const IconComponent = LucideIcons[icon] || LucideIcons.Circle;
  return (
    <div style={{
      ...styles.heroMeta,
      ...(highlight ? styles.heroMetaHighlight : {})
    }}>
      <IconComponent size={18} />
      <span style={styles.heroMetaLabel}>{label}</span>
      <strong style={styles.heroMetaValue}>{value}</strong>
    </div>
  );
};

const ResultMetric = ({ icon, label, value, accent, className }) => {
  const IconComponent = LucideIcons[icon] || LucideIcons.Circle;
  return (
    <div className={className} style={{
      ...styles.resultMetric,
      ...(accent === 'success' ? styles.resultMetricSuccess : {}),
      ...(accent === 'danger' ? styles.resultMetricDanger : {}),
      ...(accent === 'primary' ? styles.resultMetricPrimary : {}),
      ...(accent === 'muted' ? styles.resultMetricMuted : {})
    }}>
      <IconComponent size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
};

const formatTime = (seconds) => {
  const clamped = Math.max(seconds, 0);
  const minutes = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CHOICES = ['①', '②', '③', '④', '⑤'];

const styles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },
  heroSection: {
    position: 'relative',
    borderRadius: '32px',
    padding: '40px',
    display: 'flex',
    gap: '32px',
    alignItems: 'center',
    overflow: 'hidden',
    boxShadow: '0 48px 96px rgba(15, 23, 42, 0.25)',
    background: 'linear-gradient(125deg, #101828 0%, #1d3557 45%, #2f4858 100%)',
    color: 'var(--text-on-accent)'
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  heroBadge: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.25)',
    color: '#1e1b4b',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontSize: '0.85rem'
  },
  heroTitle: {
    fontSize: '2.8rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.02em'
  },
  heroSubtitle: {
    fontSize: '1.05rem',
    lineHeight: 1.7,
    margin: 0,
    maxWidth: '720px',
    color: 'rgba(255,255,255,0.85)'
  },
  heroMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  heroMeta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 18px 36px rgba(14, 165, 233, 0.25)'
  },
  heroMetaHighlight: {
    background: 'rgba(255, 255, 255, 0.3)',
    color: '#0f172a'
  },
  heroMetaLabel: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  heroMetaValue: {
    fontSize: '1rem',
    fontWeight: 700
  },
  heroButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '18px'
  },
  examPickerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  examCard: {
    borderRadius: '18px',
    padding: '18px 20px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  examCardActive: {
    borderColor: 'var(--color-blue-500)',
    boxShadow: '0 20px 40px rgba(59,130,246,0.25)',
    transform: 'translateY(-2px)'
  },
  examCardDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  examCardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  examCardBadge: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--tone-muted)'
  },
  examCardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  examCardMeta: {
    fontSize: '0.9rem',
    color: 'var(--tone-strong)'
  },
  heroIllustration: {
    position: 'relative',
    width: '260px',
    height: '260px'
  },
  heroAura: {
    position: 'absolute',
    inset: '0',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244,201,93,0.5), transparent 65%)',
    filter: 'blur(4px)'
  },
  heroOwlBody: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'linear-gradient(180deg, #182337 0%, #0b1321 70%)',
    border: '4px solid rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroOwlFace: {
    position: 'absolute',
    top: '28%',
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  heroOwlEyeLeft: {
    width: '44px',
    height: '24px',
    borderRadius: '50%',
    background: '#f1f5f9'
  },
  heroOwlEyeRight: {
    width: '44px',
    height: '24px',
    borderRadius: '50%',
    background: '#f1f5f9'
  },
  heroOwlBeak: {
    width: '24px',
    height: '18px',
    background: '#f4c95d',
    borderRadius: '50%',
    position: 'absolute',
    top: '44%'
  },
  heroOwlWingLeft: {
    position: 'absolute',
    left: '-10px',
    width: '80px',
    height: '120px',
    borderRadius: '60%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)'
  },
  heroOwlWingRight: {
    position: 'absolute',
    right: '-10px',
    width: '80px',
    height: '120px',
    borderRadius: '60%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)'
  },
  heroOwlBadge: {
    position: 'absolute',
    bottom: '28%',
    background: '#f4c95d',
    color: '#0b1321',
    padding: '6px 14px',
    borderRadius: '999px',
    fontWeight: 700
  },
  heroOwlFeet: {
    position: 'absolute',
    bottom: '18%',
    width: '120px',
    height: '28px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.08)'
  },
  heroSparkles: {
    position: 'absolute',
    top: '12%',
    right: '14%',
    fontSize: '1.4rem',
    animation: 'pulse 2s infinite'
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, rgba(79,70,229,1) 0%, rgba(14,165,233,1) 100%)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '16px',
    padding: '14px 24px',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 24px 48px rgba(79, 70, 229, 0.35)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  primaryButtonActive: {
    boxShadow: '0 28px 56px rgba(79, 70, 229, 0.4)',
    transform: 'translateY(-2px)'
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.18)',
    color: 'var(--text-on-accent)',
    borderRadius: '16px',
    padding: '14px 24px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  secondaryButtonActive: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#1e293b'
  },
  tipCard: {
    display: 'flex',
    gap: '18px',
    padding: '24px 28px',
    borderRadius: '24px',
    background: 'rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: '0 20px 40px rgba(15,23,42,0.12)'
  },
  focusTipCard: {
    position: 'relative',
    display: 'flex',
    gap: '18px',
    padding: '26px 28px',
    borderRadius: '28px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1d3557 45%, #f4c95d 110%)',
    color: '#f8fafc',
    overflow: 'hidden',
    boxShadow: '0 35px 65px rgba(3,7,18,0.45)'
  },
  focusTipIcon: {
    fontSize: '2rem',
    flexShrink: 0,
    background: 'rgba(248,250,252,0.15)',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  focusTipBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  focusTipLabel: {
    margin: 0,
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(248,250,252,0.85)'
  },
  focusTipTitle: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: 800
  },
  focusTipText: {
    margin: 0,
    lineHeight: 1.6,
    color: 'rgba(248,250,252,0.9)'
  },
  focusTipList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: 1.5,
    color: 'rgba(248,250,252,0.95)'
  },
  focusTipGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    border: '1px solid rgba(248, 250, 252, 0.25)',
    pointerEvents: 'none'
  },
  tipIcon: {
    color: 'var(--indigo-strong)'
  },
  tipTitle: {
    margin: '0 0 10px',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  tipList: {
    margin: 0,
    paddingLeft: '18px',
    color: 'var(--tone-strong)',
    lineHeight: 1.6
  },
  loadingSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '120px 20px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '6px solid rgba(148, 163, 184, 0.2)',
    borderTop: '6px solid var(--indigo)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '18px',
    color: 'var(--tone-strong)'
  },
  examLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  examHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px'
  },
  examHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  examBadge: {
    alignSelf: 'flex-start',
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'rgba(99, 102, 241, 0.16)',
    color: 'var(--indigo-strong)',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  examTitle: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.02em'
  },
  examSubtitle: {
    margin: 0,
    color: 'var(--tone-muted)'
  },
  timerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    borderRadius: '18px',
    background: 'rgba(15,23,42,0.08)',
    border: '1px solid rgba(148,163,184,0.18)',
    boxShadow: '0 16px 32px rgba(15,23,42,0.12)'
  },
  timerLabel: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    color: 'var(--tone-muted)'
  },
  timerValue: {
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '0.04em'
  },
  progressBarWrapper: {
    width: '100%',
    height: '8px',
    borderRadius: '999px',
    background: 'rgba(148,163,184,0.2)',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(135deg, rgba(79,70,229,1) 0%, rgba(14,165,233,1) 100%)',
    transition: 'width 0.3s ease'
  },
  questionCard: {
    padding: '32px',
    borderRadius: '32px',
    background: '#fefaf3',
    border: '1px solid #f1e4d0',
    boxShadow: '0 32px 64px rgba(78,54,32,0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    position: 'relative',
    backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.035) 0, rgba(0,0,0,0.035) 1px, transparent 28px)'
  },
  questionGuideLine: {
    position: 'absolute',
    left: '28px',
    top: 0,
    bottom: 0,
    width: '1px',
    background: 'rgba(0,0,0,0.08)'
  },
  questionPrompt: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  promptLine: {
    margin: 0,
    color: '#1f2937',
    lineHeight: 1.7,
    fontSize: '1.02rem'
  },
  choicesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  choiceButton: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '18px 20px',
    borderRadius: '18px',
    border: '1px solid rgba(218, 180, 116, 0.35)',
    background: '#fffdf7',
    boxShadow: '0 14px 32px rgba(78,54,32,0.15)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
  },
  choiceButtonSelected: {
    border: '1px solid rgba(244, 170, 80, 0.85)',
    background: 'linear-gradient(135deg, rgba(244, 213, 141, 0.25) 0%, rgba(244, 186, 93, 0.2) 100%)',
    boxShadow: '0 18px 40px rgba(244, 186, 93, 0.32)',
    transform: 'translateY(-2px)'
  },
  choiceMark: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(244, 186, 93, 0.18)',
    color: '#92400e',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  choiceText: {
    fontSize: '1rem',
    color: '#1f2937',
    lineHeight: 1.6
  },
  examFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
  },
  navigationButtons: {
    display: 'flex',
    gap: '10px'
  },
  navButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '12px',
    border: '1px solid rgba(148,163,184,0.24)',
    background: 'rgba(248, 250, 252, 0.85)',
    padding: '10px 18px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(15,23,42,0.1)'
  },
  navButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  submitButton: {
    minWidth: '220px'
  },
  questionNavRail: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: '68px',
    zIndex: 50,
    display: 'flex',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(148,163,184,0.24)',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 16px 36px rgba(15,23,42,0.18)',
    maxWidth: '92vw',
    overflowX: 'auto'
  },
  bottomActionBar: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: '12px',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '999px',
    background: 'rgba(15,23,42,0.9)',
    color: '#f8fafc',
    border: '1px solid rgba(148,163,184,0.28)',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 18px 40px rgba(15,23,42,0.28)'
  },
  bottomTimer: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(248,250,252,0.08)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 700
  },
  bottomSubmitButton: {
    padding: '10px 14px',
    borderRadius: '999px',
    boxShadow: '0 12px 24px rgba(79,70,229,0.35)'
  },
  questionDot: {
    borderRadius: '999px',
    padding: '8px 12px',
    border: '1px solid rgba(148,163,184,0.24)',
    background: 'rgba(248,250,252,0.85)',
    color: 'var(--tone-strong)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  questionDotAnswered: {
    background: 'rgba(79, 70, 229, 0.14)',
    borderColor: 'rgba(79,70,229,0.4)',
    color: 'var(--indigo-strong)'
  },
  questionDotActive: {
    boxShadow: '0 12px 24px rgba(79,70,229,0.25)',
    transform: 'translateY(-1px)'
  },
  resultLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },
  resultHero: {
    borderRadius: '32px',
    background: 'linear-gradient(135deg, rgba(199, 210, 254, 0.85) 0%, rgba(129, 212, 250, 0.75) 100%)',
    padding: '42px',
    position: 'relative',
    overflow: 'hidden'
  },
  resultSummaryCard: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  resultTitle: {
    margin: 0,
    fontSize: '2.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)'
  },
  resultSubtitle: {
    margin: 0,
    color: 'var(--tone-strong)',
    lineHeight: 1.6
  },
  resultMetricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px'
  },
  resultMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '16px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.78)',
    border: '1px solid rgba(148,163,184,0.16)',
    color: 'var(--tone-strong)',
    fontWeight: 600
  },
  resultMetricSuccess: {
    borderColor: 'rgba(74, 222, 128, 0.4)',
    color: '#166534'
  },
  resultMetricDanger: {
    borderColor: 'rgba(248, 113, 113, 0.4)',
    color: '#991b1b'
  },
  resultMetricPrimary: {
    borderColor: 'rgba(79, 70, 229, 0.4)',
    color: '#312e81'
  },
  resultMetricMuted: {
    color: 'var(--tone-muted)'
  },
  resultActions: {
    display: 'flex',
    gap: '12px'
  },
  reviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  reviewHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  reviewTitle: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 800
  },
  reviewSubtitle: {
    margin: 0,
    color: 'var(--tone-muted)'
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  reviewCard: {
    borderRadius: '24px',
    padding: '22px',
    border: '1px solid rgba(148,163,184,0.18)',
    background: 'rgba(255,255,255,0.92)',
    boxShadow: '0 24px 48px rgba(15,23,42,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  reviewCardCorrect: {
    borderColor: 'rgba(74, 222, 128, 0.35)'
  },
  reviewCardIncorrect: {
    borderColor: 'rgba(248, 113, 113, 0.35)'
  },
  reviewCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px'
  },
  reviewBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(148,163,184,0.16)',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  reviewQuestionTitle: {
    margin: '10px 0 0',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  reviewTagCorrect: {
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(74, 222, 128, 0.18)',
    color: '#166534',
    fontWeight: 700
  },
  reviewTagIncorrect: {
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(248, 113, 113, 0.18)',
    color: '#991b1b',
    fontWeight: 700
  },
  reviewChoices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  reviewChoice: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '16px',
    background: 'rgba(248, 250, 252, 0.85)',
    border: '1px solid rgba(148,163,184,0.18)',
    position: 'relative'
  },
  reviewChoiceCorrect: {
    borderColor: 'rgba(74, 222, 128, 0.45)',
    background: 'rgba(74, 222, 128, 0.12)'
  },
  reviewChoiceSelected: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    background: 'rgba(248, 113, 113, 0.12)'
  },
  choiceLabelCorrect: {
    position: 'absolute',
    right: '12px',
    top: '12px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(74, 222, 128, 0.22)',
    color: '#166534',
    fontWeight: 700,
    fontSize: '0.78rem'
  },
  choiceLabelMine: {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(248, 113, 113, 0.22)',
    color: '#991b1b',
    fontWeight: 700,
    fontSize: '0.78rem'
  },
  reviewFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewActions: {
    display: 'flex',
    gap: '10px'
  },
  reviewSolvedCopy: {
    fontSize: '0.92rem',
    color: 'var(--tone-muted)'
  },
  explanationBox: {
    borderRadius: '16px',
    background: 'rgba(236, 233, 254, 0.6)',
    border: '1px solid rgba(129, 140, 248, 0.28)',
    padding: '18px',
    lineHeight: 1.7,
    color: '#1f2937'
  },
  explanationLine: {
    margin: '0 0 8px'
  },
  explanationLoading: {
    color: 'var(--tone-muted)',
    fontSize: '0.95rem'
  },
  explanationError: {
    color: 'var(--danger-strong)',
    fontSize: '0.95rem'
  }
};

export default MockExamPage;
