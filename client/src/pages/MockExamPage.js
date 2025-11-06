import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import FriendlyError from '../components/common/FriendlyError';
import { api } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const [state, setState] = useState(INITIAL_STATE);
  const [explanations, setExplanations] = useState({});
  const [explanationErrors, setExplanationErrors] = useState({});
  const [activeTab, setActiveTab] = useState('exam'); // exam | review

  const isProMember = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const membership = String(user.membership || '').toLowerCase();
    return membership === 'pro';
  }, [user]);

  const fetchExam = useCallback(async () => {
    setState((prev) => ({
      ...INITIAL_STATE,
      status: 'loading'
    }));

    try {
      const response = await api.mockExam.getExam();
      if (response?.success) {
        setExplanations({});
        setExplanationErrors({});
        setActiveTab('exam');
        setState((prev) => ({
          ...prev,
          exam: response.data,
          status: 'ready'
        }));
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
    fetchExam();
  }, [fetchExam]);

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
      const response = await api.mockExam.submit(payload);
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
      const response = await api.mockExam.explanation({ questionNumber });
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

  const renderIntro = () => (
    <div style={styles.pageContainer}>
      <section style={styles.heroSection}>
        <div style={styles.heroBackground} />
        <div style={styles.heroContent}>
          <span style={styles.heroBadge}>Premium Mock Test</span>
          <h1 style={styles.heroTitle}>2025년 10월 고2 모의고사</h1>
          <p style={styles.heroSubtitle}>
            실전과 동일한 난이도와 시간을 그대로 옮겨온 실감 나는 모의고사 모드입니다. <br />
            50분 안에 18번부터 45번까지 풀어보고, 제출 후 즉시 채점 결과와 해설을 확인해 보세요.
          </p>
          <div style={styles.heroMetaRow}>
            <HeroMeta icon="AlarmClock" label="제한 시간" value="50분" />
            <HeroMeta icon="Hash" label="문항 수" value={`${state.exam?.questionCount || 28}문항`} />
            <HeroMeta icon="Sparkles" label="AI 해설" value={isProMember ? '프로 전용(사용 가능)' : '프로 전용'} highlight={isProMember} />
          </div>
          <div style={styles.heroButtons}>
            <button type="button" style={styles.primaryButton} onClick={handleStart}>
              <LucideIcons.PlayCircle size={20} /> 지금 바로 응시하기
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setActiveTab('review')}
              disabled={!state.result}
            >
              <LucideIcons.BarChart3 size={18} /> 이전 결과 보기
            </button>
          </div>
        </div>
      </section>

      <section style={styles.tipCard}>
        <LucideIcons.ClipboardList size={22} style={styles.tipIcon} />
        <div>
          <h3 style={styles.tipTitle}>응시 팁</h3>
          <ul style={styles.tipList}>
            <li>모바일에서도 자동 저장이 지원되어 중간에 나가도 다시 이어서 풀 수 있어요.</li>
            <li>제출 후에는 각 문항별로 나의 선택과 정답, 그리고 해설(프로)을 확인할 수 있습니다.</li>
            <li>시간이 종료되면 자동으로 제출되니, 여유 있게 마지막 문제를 마무리해 주세요.</li>
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

        <div style={styles.questionCard}>
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
            style={{
              ...styles.primaryButton,
              ...styles.submitButton,
              ...(state.submitting ? styles.primaryButtonDisabled : {})
            }}
            onClick={() => handleSubmit(false)}
            disabled={state.submitting}
          >
            {state.submitting ? '제출 중...' : '모의고사 제출하기'}
          </button>
        </footer>

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
      <div style={styles.resultLayout}>
        <section style={styles.resultHero}>
          <div style={styles.resultSummaryCard}>
            <span style={styles.heroBadge}>결과 요약</span>
            <h2 style={styles.resultTitle}>수고했어요! 점수를 확인해 볼까요?</h2>
            <p style={styles.resultSubtitle}>총 {total}문항 중 {correctCount}문항을 맞혔어요. 다시 도전하거나 해설을 확인해 보세요.</p>
            <div style={styles.resultMetricsRow}>
              <ResultMetric icon="CheckCircle" label="정답" value={`${correctCount}문항`} accent="success" />
              <ResultMetric icon="XCircle" label="오답" value={`${incorrectCount}문항`} accent="danger" />
              <ResultMetric icon="CircleDashed" label="미응시" value={`${unanswered}문항`} accent="muted" />
              <ResultMetric icon="Percent" label="정답률" value={`${accuracy}%`} accent="primary" />
            </div>
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
        </section>

        <section style={styles.reviewSection}>
          <div style={styles.reviewHeader}>
            <h3 style={styles.reviewTitle}>문항별 복습</h3>
            <p style={styles.reviewSubtitle}>선택지 색상으로 맞힌 문제를 한눈에 확인할 수 있어요.</p>
          </div>

          <div style={styles.reviewList}>
            {state.result.detail.map((item) => {
              const explanation = explanations[item.number];
              const explanationError = explanationErrors[item.number];
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

const ResultMetric = ({ icon, label, value, accent }) => {
  const IconComponent = LucideIcons[icon] || LucideIcons.Circle;
  return (
    <div style={{
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
    padding: '46px',
    overflow: 'hidden',
    boxShadow: '0 48px 96px rgba(15, 23, 42, 0.25)',
    background: 'linear-gradient(140deg, rgba(79, 70, 229, 0.6) 0%, rgba(14, 165, 233, 0.45) 42%, rgba(236, 233, 254, 0.6) 100%)',
    color: 'var(--text-on-accent)'
  },
  heroBackground: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 55%), radial-gradient(circle at 80% 10%, rgba(14,165,233,0.2), transparent 60%)',
    pointerEvents: 'none'
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
    borderRadius: '28px',
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(148,163,184,0.16)',
    boxShadow: '0 32px 64px rgba(15,23,42,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  questionPrompt: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  promptLine: {
    margin: 0,
    color: 'var(--text-primary)',
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
    border: '1px solid rgba(148,163,184,0.24)',
    background: 'rgba(248, 250, 252, 0.8)',
    boxShadow: '0 14px 32px rgba(15,23,42,0.1)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
  },
  choiceButtonSelected: {
    border: '1px solid rgba(79,70,229,0.65)',
    background: 'linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(14,165,233,0.14) 100%)',
    boxShadow: '0 18px 40px rgba(79, 70, 229, 0.22)',
    transform: 'translateY(-2px)'
  },
  choiceMark: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(79, 70, 229, 0.12)',
    color: 'var(--indigo-strong)',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  choiceText: {
    fontSize: '1rem',
    color: 'var(--text-primary)',
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
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
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
