import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import AppButton from '../components/common/AppButton';
import tierConfig from '../config/tierConfig.json';
import EagleGuideChip from '../components/common/EagleGuideChip';

const typeLabelMap = {
  blank: '빈칸',
  order: '순서 배열',
  insertion: '문장 삽입',
  grammar: '어법',
  vocabulary: '어휘',
  title: '제목',
  theme: '주제',
  summary: '요약',
  implicit: '함축 의미',
  mock_exam: '모의고사'
};

const quickButtonIconMap = {
  '학습 세트 생성': '🚀',
  '순서 배열 훈련': '🔀',
  '문장 삽입 훈련': '🧩',
  '문서 업로드': '📤'
};

const eagleHints = [
  '어휘 훈련에서 Day를 하나 골라 볼까요?',
  '분석 자료에서 새 지문을 열어 보세요!',
  '모의고사 응시 전 방해금지 모드를 켜두면 집중력이 올라가요!',
  '모의고사 50분 타이머도 준비되어 있어요!',
  '복습 대기열은 매일 조금씩 비우면 좋아요!'
];

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewQueue, setReviewQueue] = useState({ total: 0, problems: [] });
  const [reviewLoading, setReviewLoading] = useState(true);
  const [eagleMood, setEagleMood] = useState('idle');
  const [eagleHintIndex, setEagleHintIndex] = useState(0);
  const [eaglePulseKey, setEaglePulseKey] = useState(0);
  const eagleMoodRef = useRef('idle');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 640 : false));
  const streakDays = Number(user?.streakDays ?? 0);
  const showStreakBadge = streakDays > 0 || !user;

  const formatPreviewText = (text) => {
    if (!text) return '문항 정보를 준비 중이에요.';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
  };

  useEffect(() => {
    const hintTimer = window.setInterval(() => {
      setEagleHintIndex((prev) => (prev + 1) % eagleHints.length);
    }, 5000);
    return () => window.clearInterval(hintTimer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    eagleMoodRef.current = eagleMood;
  }, [eagleMood]);

  const handleEagleInteract = () => {
    setEagleMood('cheer');
    setEaglePulseKey((prev) => prev + 1);
    window.setTimeout(() => setEagleMood('idle'), 1400);
  };

  useEffect(() => {
    const winkTimer = window.setInterval(() => {
      if (eagleMoodRef.current === 'cheer') return;
      setEagleMood('wink');
      window.setTimeout(() => {
        if (eagleMoodRef.current !== 'cheer') {
          setEagleMood('idle');
        }
      }, 650);
    }, 8000);
    return () => window.clearInterval(winkTimer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.problems.stats();
        setStats(data);
      } catch (error) {
        console.error('대시보드 데이터를 불러오지 못했어요.', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const fetchReviewQueue = async () => {
      try {
        setReviewLoading(true);
        const response = await api.problems.reviewQueue({ limit: 3 });
        setReviewQueue({
          total: Number(response?.total) || 0,
          problems: Array.isArray(response?.problems) ? response.problems.slice(0, 3) : []
        });
      } catch (error) {
        console.error('복습 대기열을 불러오지 못했어요.', error);
      } finally {
        setReviewLoading(false);
      }
    };

    fetchReviewQueue();
  }, []);

  const currentTier = useMemo(() => {
    const points = user?.points || 0;
    return (
      tierConfig.tiers.find(
        (tier) => points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
      ) || tierConfig.tiers[0]
    );
  }, [user]);

  const nextTier = useMemo(() => {
    const index = tierConfig.tiers.findIndex((tier) => tier.id === currentTier.id);
    return tierConfig.tiers[index + 1] || null;
  }, [currentTier]);

  const progress = useMemo(() => {
    if (!nextTier) return 100;
    const points = user?.points || 0;
    const range = nextTier.minLP - currentTier.minLP;
    const progressValue = points - currentTier.minLP;
    return Math.min(100, Math.max(0, (progressValue / range) * 100));
  }, [currentTier, nextTier, user]);

  const tierAccent = useMemo(() => {
    const color = currentTier.color;
    const glow = currentTier.features.specialEffect ? `${color}80` : `${color}40`;
    return {
      border: `1px solid ${color}`,
      boxShadow: `0 10px 25px ${glow}`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    };
  }, [currentTier]);

  const heroHighlightCards = useMemo(() => [
    {
      icon: '⚡️',
      label: '오늘의 목표',
      value: stats?.dailyGoal ? `${stats.dailyGoal}분` : '30분',
      detail: '권장 학습'
    },
    {
      icon: '🔁',
      label: '복습 대기',
      value: `${reviewQueue.total || 0}문`,
      detail: '준비 완료'
    },
    {
      icon: '🔥',
      label: '연속 학습',
      value: `${streakDays || 0}일`,
      detail: streakDays ? '기록 유지 중' : '지금 시작'
    }
  ], [stats?.dailyGoal, reviewQueue.total, streakDays]);

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner} />
        <p>대시보드를 준비하고 있어요…</p>
      </div>
    );
  }

  const statCards = [
    { label: '총 학습 세션', value: stats?.totalSessions ?? 0, suffix: '회' },
    { label: '정답률', value: stats?.accuracy ?? 0, suffix: '%', isPercent: true },
    { label: '누적 문제 수', value: stats?.totalProblems ?? 0, suffix: '문' },
    { label: '누적 정답 수', value: stats?.totalCorrect ?? 0, suffix: '문' },
    { label: '지난 7일 학습', value: stats?.weeklySessions ?? 0, suffix: '회' }
  ];

  const currentEagleHint = eagleHints[eagleHintIndex];
  const highlightRowStyle = isMobile
    ? { ...styles.heroHighlightRow, ...styles.heroHighlightRowMobile }
    : styles.heroHighlightRow;

  return (
    <div style={isMobile ? { ...styles.container, ...styles.containerMobile } : styles.container}>
      <section className="hero-animated" style={isMobile ? { ...styles.heroSection, ...styles.heroSectionMobile } : styles.heroSection}>
        <div style={styles.heroAura} aria-hidden="true" />
        <div style={styles.heroBubble} aria-hidden="true" />
        <div style={styles.heroBubbleSecondary} aria-hidden="true" />
        <span className="shimmer" style={{ animationDelay: '0s' }} aria-hidden />
        <span className="shimmer" style={{ animationDelay: '1.6s' }} aria-hidden />
        <div style={isMobile ? { ...styles.heroTextBlock, ...styles.heroTextBlockMobile } : styles.heroTextBlock}>
          <span style={styles.heroTag}>League of English</span>
          <h1 style={styles.heroTitle}>안녕하세요, {user?.name || '학습자'}님! 👋</h1>
          <p style={styles.heroSubtitle}>
            하루 30분만 투자해도 단어·분석·모의고사를 한 번에 관리할 수 있습니다. 대시보드가 오늘의 학습 흐름을 명확하게 안내합니다.
          </p>
          <div style={isMobile ? { ...styles.heroCTAGroup, ...styles.heroCTAGroupMobile } : styles.heroCTAGroup}>
            <AppButton variant="primary" size="lg" onClick={() => (window.location.href = '/vocabulary')}>
              어휘 시험 보러가기
            </AppButton>
            <AppButton variant="secondary" size="lg" onClick={() => (window.location.href = '/analysis')}>
              분석 자료 열어보기
            </AppButton>
          </div>
          {showStreakBadge && (
            <div style={styles.streakBadge}>
              <span style={styles.streakFlameIcon}>🔥</span>
              {streakDays > 0 ? `연속 학습 ${streakDays}일째!` : '연속 학습을 오늘부터 시작해 볼까요?'}
              <span style={styles.streakGlow} aria-hidden="true" />
            </div>
          )}
          <p style={styles.heroNote}>Tip · 메인 아이콘을 눌러 오늘의 학습 안내를 확인해 보세요.</p>
          <div style={highlightRowStyle}>
                {heroHighlightCards.map((badge) => (
              <div
                key={badge.label}
                style={styles.heroHighlightCard}
                className="tilt-hover"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 22px 44px rgba(3,7,18,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 18px 36px rgba(3,7,18,0.35)';
                }}
              >
                    <span style={styles.heroHighlightIcon}>{badge.icon}</span>
                    <div>
                      <p style={styles.heroHighlightLabel}>{badge.label}</p>
                      <strong style={styles.heroHighlightValue}>{badge.value}</strong>
                      <span style={styles.heroHighlightDetail}>{badge.detail}</span>
                    </div>
                  </div>
                ))}
          </div>
        </div>
        <EagleMascot
          mood={eagleMood}
          hint={currentEagleHint}
          onInteract={handleEagleInteract}
          pulseKey={eaglePulseKey}
          isMobile={isMobile}
        />
      </section>

      <section style={isMobile ? { ...styles.tierCard, ...styles.tierCardMobile } : styles.tierCard}>
        <div style={styles.tierHeader}>
          <span style={{ ...styles.tierIcon, color: currentTier.color }}>{currentTier.icon}</span>
          <div>
            <h2 style={{ ...styles.tierName, color: currentTier.color }}>{currentTier.name}</h2>
            <p style={styles.tierPoints}>{(user?.points || 0).toLocaleString()} LP</p>
          </div>
        </div>

        {nextTier ? (
          <div style={styles.progressBox}>
            <div style={styles.progressInfo}>
              <span>다음 티어: {nextTier.name}</span>
              <span>{Math.max(0, nextTier.minLP - (user?.points || 0))} LP 남음</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%`, background: currentTier.color }} />
            </div>
          </div>
        ) : (
          <p style={styles.maxTierMessage}>최고 등급을 달성했어요! 🎉 계속 실력을 유지해 볼까요?</p>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitle}>오늘의 요약</h2>
          <EagleGuideChip text="숫자로 오늘의 페이스 체크" variant="accent" />
        </div>
        <div style={isMobile ? { ...styles.statGrid, ...styles.statGridMobile } : styles.statGrid}>
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              suffix={card.suffix}
              tierAccent={tierAccent}
              isPercent={card.isPercent}
            />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitle}>바로 시작하기</h2>
          <EagleGuideChip text="자주 쓰는 기능을 한 곳에!" />
        </div>
        <div style={isMobile ? { ...styles.quickGrid, ...styles.quickGridMobile } : styles.quickGrid}>
          <QuickButton label="학습 세트 생성" description="5문항 세트를 바로 만들기" onClick={() => (window.location.href = '/study')} />
          <QuickButton label="순서 배열 훈련" description="순서 문제를 집중 연습" onClick={() => (window.location.href = '/study?focus=order')} />
          <QuickButton label="문장 삽입 훈련" description="문장 삽입 패턴 다지기" onClick={() => (window.location.href = '/study?focus=insertion')} />
          {user?.role === 'admin' && (
            <QuickButton label="문서 업로드" description="새 교재를 등록하고 분석" onClick={() => (window.location.href = '/admin')} />
          )}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitle}>복습 대기열</h2>
          <EagleGuideChip text="틀렸던 문제를 자동으로 기억해 둘게요" variant="warning" />
        </div>
        <div style={isMobile ? { ...styles.reviewCard, ...styles.reviewCardMobile } : styles.reviewCard}>
          <div style={styles.reviewCardHeader}>
            <div>
              <div style={styles.reviewBadge}>다시 풀면 실력 업!</div>
              <div style={styles.reviewCardTitle}>틀린 문제 {reviewQueue.total}문이 기다리고 있어요.</div>
              <p style={styles.reviewHint}>조금씩 복습하면 기억이 단단해져요. 지금 바로 확인해 볼까요?</p>
            </div>
            <button
              style={{
                ...styles.reviewActionButton,
                ...(reviewLoading ? styles.reviewButtonDisabled : {})
              }}
              onClick={() => (window.location.href = '/study?mode=review')}
              disabled={reviewLoading || reviewQueue.total === 0}
            >
              {reviewLoading ? '정리 중...' : reviewQueue.total > 0 ? '복습하러 가기' : '복습할 문제 없음'}
            </button>
          </div>
          <div style={styles.reviewList}>
            {reviewLoading ? (
              <div style={styles.reviewEmpty}>복습 카드들을 예쁘게 정렬하는 중이에요... ✨</div>
            ) : reviewQueue.total === 0 ? (
              <div style={styles.reviewEmpty}>최근에 틀렸던 문제가 없어요! 정말 멋져요 🦅</div>
            ) : (
              reviewQueue.problems.map((problem) => (
                <div key={problem.id} style={styles.reviewItem}>
                  <div style={styles.reviewItemMeta}>
                    <span style={styles.reviewItemType}>{typeLabelMap[problem.type] || problem.type}</span>
                    {problem.sourceLabel && <span style={styles.reviewItemSource}>{problem.sourceLabel}</span>}
                  </div>
                  <div style={styles.reviewItemText}>{formatPreviewText(problem.question || problem.mainText)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ label, value, suffix, tierAccent, isPercent }) => {
  const displayValue = Number(value || 0);
  return (
    <div
      style={{
        ...styles.statCard,
        ...(tierAccent || {}),
        background: tierAccent?.background || 'var(--surface-contrast)'
      }}
    >
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>
        {isPercent ? displayValue.toFixed(1) : displayValue.toLocaleString()}
        {suffix && <span style={styles.statSuffix}>{suffix}</span>}
      </p>
    </div>
  );
};

const QuickButton = ({ label, description, onClick }) => {
  const icon = quickButtonIconMap[label] || '✨';
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  return (
    <button
      className="tilt-hover"
      style={{
        ...styles.quickButton,
        ...(hovered ? styles.quickButtonHover : {}),
        ...(pressed ? styles.quickButtonActive : {})
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      <span style={styles.quickButtonIcon}>{icon}</span>
      <div>
        <strong style={styles.quickButtonLabel}>{label}</strong>
        <span style={styles.quickDescription}>{description}</span>
      </div>
    </button>
  );
};

const EagleMascot = ({ mood, onInteract, hint, pulseKey, isMobile }) => (
  <div style={isMobile ? { ...styles.eagleWrapper, ...styles.eagleWrapperMobile } : styles.eagleWrapper}>
    <button
      type="button"
      onClick={onInteract}
      onTouchStart={onInteract}
      style={{
        ...styles.eagleButton,
        ...(mood === 'cheer' ? styles.eagleButtonCheer : {}),
        ...(isMobile ? styles.eagleButtonMobile : {})
      }}
      aria-label="마스코트와 상호작용"
    >
      <div style={styles.eagleHalo} aria-hidden="true" />
      <div style={styles.eagleShadow} aria-hidden="true" />
      <div
        style={{
          ...styles.eagleBody,
          ...(mood === 'cheer' ? styles.eagleBodyCheer : {}),
          ...(isMobile ? styles.eagleBodyMobile : {})
        }}
      >
        <div style={styles.eagleTail} />
        <div style={styles.eagleWingLeft} />
        <div style={styles.eagleWingRight} />
        <div style={styles.eagleHead}>
          <div style={styles.eagleCrest} />
          <div style={styles.eagleFace}>
            <div style={{ ...styles.eagleEye, ...(mood === 'wink' ? styles.eagleEyeWink : {}) }}>
              <div style={styles.eaglePupil} />
            </div>
            <div style={{ ...styles.eagleEye, ...(mood === 'cheer' ? styles.eagleEyeCheer : {}) }}>
              <div style={styles.eaglePupil} />
            </div>
            <div style={styles.eagleBeak} />
          </div>
        </div>
        <div style={styles.eagleChestBand} />
        <div style={styles.eagleBelly}>
          <span style={styles.eagleBadge}>League of English</span>
        </div>
        <div style={styles.eagleFootLeft} />
        <div style={styles.eagleFootRight} />
      </div>
      <span
        key={pulseKey}
        style={styles.eagleRipple}
        aria-hidden="true"
      />
      <span
        key={`spark-${pulseKey}`}
        style={{ ...styles.eagleSparkle, animationDelay: `${pulseKey % 3 * 0.4}s` }}
        aria-hidden="true"
      />
    </button>
    <div style={isMobile ? { ...styles.eagleHintBubble, ...styles.eagleHintBubbleMobile } : styles.eagleHintBubble}>
      <span aria-live="polite">{hint}</span>
    </div>
  </div>
);

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px 80px',
    color: 'var(--text-primary)'
  },
  containerMobile: {
    padding: '24px 18px 64px'
  },
  heroSection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '32px',
    padding: '32px',
    borderRadius: '32px',
    background: 'linear-gradient(130deg, #0F172A 0%, #1D3A6D 55%, #F4C95D 120%)',
    color: '#F8FAFC',
    boxShadow: '0 35px 70px rgba(3, 7, 18, 0.55)',
    marginBottom: '32px',
    position: 'relative',
    overflow: 'hidden'
  },
  heroSectionMobile: {
    flexDirection: 'column',
    padding: '24px 18px',
    borderRadius: '24px',
    textAlign: 'center'
  },
  heroTextBlock: {
    flex: '1 1 360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    position: 'relative',
    zIndex: 1
  },
  heroTextBlockMobile: {
    order: 2,
    gap: '8px',
    textAlign: 'center',
    alignItems: 'center'
  },
  heroTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    border: '1px solid rgba(244, 201, 93, 0.6)',
    background: 'rgba(15,23,42,0.45)',
    fontSize: '0.85rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  heroTitle: {
    fontSize: '2.2rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: 0
  },
  heroSubtitle: {
    fontSize: '0.98rem',
    lineHeight: 1.7,
    color: 'rgba(248,250,252,0.9)'
  },
  heroCTAGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '6px'
  },
  heroCTAGroupMobile: {
    flexDirection: 'column',
    width: '100%'
  },
  streakBadge: {
    marginTop: '10px',
    alignSelf: 'flex-start',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 18px',
    borderRadius: '16px',
    background: 'rgba(244, 201, 93, 0.35)',
    border: '1px solid rgba(244, 201, 93, 0.65)',
    color: '#1C1917',
    fontWeight: 700,
    boxShadow: '0 16px 32px rgba(251, 191, 36, 0.35)'
  },
  streakFlameIcon: {
    fontSize: '1.2rem',
    animation: 'streakFlame 1.2s ease-in-out infinite'
  },
  streakGlow: {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '999px',
    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.35), transparent 60%)',
    filter: 'blur(2px)',
    zIndex: -1,
    animation: 'streakGlow 2.6s ease-in-out infinite'
  },
  heroPrimaryButton: {
    padding: '14px 24px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, #F7C948, #D97706)',
    color: '#1F1300',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 20px 45px rgba(247, 201, 72, 0.45)'
  },
  heroSecondaryButton: {
    padding: '14px 22px',
    borderRadius: '16px',
    border: '1px solid rgba(248,250,252,0.4)',
    background: 'rgba(15,23,42,0.35)',
    color: '#E2E8F0',
    fontWeight: 700,
    cursor: 'pointer'
  },
  heroNote: {
    fontSize: '0.95rem',
    color: 'rgba(248,250,252,0.75)'
  },
  heroAura: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 20% 20%, rgba(15,23,42,0.6), transparent 55%), radial-gradient(circle at 80% 10%, rgba(244,201,93,0.35), transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  heroBubble: {
    position: 'absolute',
    width: '220px',
    height: '220px',
    borderRadius: '50%',
    background: 'rgba(244,201,93,0.28)',
    top: '-60px',
    right: '-40px',
    filter: 'blur(10px)',
    zIndex: 0
  },
  heroBubbleSecondary: {
    position: 'absolute',
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    background: 'rgba(15,23,42,0.35)',
    bottom: '-40px',
    left: '-30px',
    filter: 'blur(12px)',
    zIndex: 0
  },
  heroHighlightRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '18px'
  },
  heroHighlightRowMobile: {
    gridTemplateColumns: '1fr',
    width: '100%'
  },
  heroHighlightCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(244,201,93,0.4))',
    border: '1px solid rgba(244,201,93,0.35)',
    boxShadow: '0 18px 36px rgba(3,7,18,0.35)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  heroHighlightIcon: {
    fontSize: '1.25rem',
    background: 'rgba(244,201,93,0.35)',
    color: '#1C1917',
    borderRadius: '50%',
    width: '34px',
    height: '34px',
    display: 'grid',
    placeItems: 'center'
  },
  heroHighlightLabel: {
    fontSize: '0.78rem',
    color: 'rgba(248,250,252,0.75)',
    marginBottom: '2px'
  },
  heroHighlightValue: {
    fontSize: '1.1rem',
    color: '#FDE68A'
  },
  heroHighlightDetail: {
    fontSize: '0.8rem',
    color: 'rgba(248,250,252,0.6)'
  },
  sectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  tierCard: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 12px 30px var(--surface-shadow)',
    marginBottom: '32px'
  },
  tierCardMobile: {
    padding: '22px'
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  tierIcon: {
    fontSize: '44px'
  },
  tierName: {
    fontSize: '26px',
    fontWeight: 'bold',
    margin: 0
  },
  tierPoints: {
    fontSize: '18px',
    margin: '6px 0 0',
    color: 'var(--tone-hero)'
  },
  progressBox: {
    marginTop: '20px'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--tone-strong)',
    marginBottom: '10px'
  },
  progressBar: {
    width: '100%',
    height: '12px',
    borderRadius: '6px',
    background: 'var(--surface-border)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'var(--progress-gradient)'
  },
  maxTierMessage: {
    marginTop: '12px',
    color: 'var(--accent)',
    fontWeight: 600
  },
  section: {
    marginTop: '36px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    marginBottom: '20px',
    color: 'var(--tone-hero)'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  statGridMobile: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
  },
  statCard: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
  },
  statLabel: {
    fontSize: '15px',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    marginBottom: '12px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 800,
    color: 'var(--accent-primary)'
  },
  statSuffix: {
    fontSize: '16px',
    marginLeft: '4px',
    color: 'var(--tone-strong)'
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px'
  },
  quickGridMobile: {
    gridTemplateColumns: '1fr'
  },
  quickButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px',
    borderRadius: '22px',
    border: '1px solid rgba(244,201,93,0.35)',
    background: 'linear-gradient(135deg, #1B2540 0%, #274472 55%, #F4C95D 120%)',
    color: '#F8FAFC',
    cursor: 'pointer',
    boxShadow: '0 22px 38px rgba(3,7,18,0.28)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  },
  quickButtonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 28px 48px rgba(3,7,18,0.35)'
  },
  quickButtonActive: {
    transform: 'scale(0.98)'
  },
  quickButtonIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '16px',
    background: 'rgba(244,201,93,0.35)',
    color: '#1F1300',
    display: 'grid',
    placeItems: 'center',
    fontSize: '1.3rem',
    flexShrink: 0
  },
  quickButtonLabel: {
    display: 'block',
    fontSize: '1.05rem',
    marginBottom: '4px'
  },
  quickDescription: {
    fontSize: '14px',
    color: 'rgba(248,250,252,0.8)'
  },
  eagleWrapper: {
    flex: '0 0 140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    zIndex: 1
  },
  eagleWrapperMobile: {
    order: 1,
    width: '100%',
    alignItems: 'center'
  },
  eagleButton: {
    position: 'relative',
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    animation: 'eagleFloat 5s ease-in-out infinite',
    overflow: 'visible'
  },
  eagleButtonCheer: {
    transform: 'scale(1.04)'
  },
  eagleButtonMobile: {
    width: '100%'
  },
  eagleHalo: {
    position: 'absolute',
    inset: '-20px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244,201,93,0.55), transparent 65%)',
    filter: 'blur(12px)',
    zIndex: 0
  },
  eagleShadow: {
    position: 'absolute',
    bottom: '-18px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '88px',
    height: '14px',
    borderRadius: '50%',
    background: 'rgba(15,23,42,0.15)',
    filter: 'blur(8px)',
    zIndex: 0
  },
  eagleBody: {
    width: '120px',
    height: '132px',
    borderRadius: '140px 140px 110px 110px',
    background: 'linear-gradient(180deg, #1b253c 0%, #3c2a1b 38%, #d79d45 100%)',
    border: '4px solid rgba(255,255,255,0.25)',
    position: 'relative',
    boxShadow: '0 35px 70px rgba(3,7,18,0.55)',
    overflow: 'visible',
    transition: 'box-shadow 0.3s ease',
    zIndex: 1
  },
  eagleBodyCheer: {
    boxShadow: '0 42px 80px rgba(255, 215, 128, 0.45)'
  },
  eagleBodyMobile: {
    width: '108px',
    height: '118px'
  },
  eagleHead: {
    position: 'absolute',
    top: '-70px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '84px',
    height: '84px',
    borderRadius: '90px 90px 70px 70px',
    background: 'linear-gradient(180deg, #ffffff 0%, #fdf5e3 60%, #f6d7a3 100%)',
    border: '4px solid rgba(15,23,42,0.12)',
    boxShadow: '0 20px 40px rgba(15,23,42,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  eagleCrest: {
    position: 'absolute',
    top: '-24px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '68px',
    height: '28px',
    borderRadius: '90px 90px 0 0',
    background: 'linear-gradient(90deg, #f6c343 0%, #f4d06f 100%)',
    boxShadow: '0 8px 18px rgba(0,0,0,0.18)'
  },
  eagleFace: {
    width: '86%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  },
  eagleEye: {
    width: '46px',
    height: '46px',
    borderRadius: '55px',
    background: '#F8FAFC',
    border: '4px solid #0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'eagleBlink 6s infinite',
    boxShadow: 'inset 0 -4px 0 rgba(15,23,42,0.12)'
  },
  eagleEyeWink: {
    animation: 'eagleBlinkQuick 0.2s 4 alternate'
  },
  eagleEyeCheer: {
    animation: 'eagleBlinkCheer 1.4s'
  },
  eaglePupil: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#0F172A',
    boxShadow: '0 0 0 6px rgba(15,23,42,0.08)'
  },
  eagleBeak: {
    position: 'absolute',
    top: '56px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '42px',
    height: '36px',
    background: 'linear-gradient(180deg, #ffd88c 0%, #f9a826 100%)',
    clipPath: 'polygon(50% 0%, 100% 60%, 50% 100%, 0% 60%)',
    boxShadow: '0 6px 12px rgba(0,0,0,0.25)'
  },
  eagleWingLeft: {
    position: 'absolute',
    width: '90px',
    height: '135px',
    left: '-28px',
    top: '32px',
    borderRadius: '70% 30% 60% 40%',
    background: 'linear-gradient(160deg, #2c1c17 0%, #9c5c2f 70%)',
    animation: 'eagleWing 4s ease-in-out infinite',
    filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))'
  },
  eagleWingRight: {
    position: 'absolute',
    width: '90px',
    height: '135px',
    right: '-28px',
    top: '32px',
    borderRadius: '30% 70% 40% 60%',
    background: 'linear-gradient(200deg, #2c1c17 0%, #9c5c2f 70%)',
    animation: 'eagleWing 4s ease-in-out infinite',
    animationDelay: '0.4s',
    filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))'
  },
  eagleTail: {
    position: 'absolute',
    bottom: '-24px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '66px',
    height: '52px',
    background: 'linear-gradient(180deg, #fef2d7 0%, #f5d7a5 100%)',
    clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
    filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.25))'
  },
  eagleChestBand: {
    position: 'absolute',
    top: '86px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '120px',
    height: '24px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05))',
    border: '1px solid rgba(255,255,255,0.35)'
  },
  eagleBelly: {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '108px',
    height: '80px',
    borderRadius: '75px',
    background: 'linear-gradient(180deg, #f5d38c 0%, #cc8a3b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  eagleBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  eagleFootLeft: {
    position: 'absolute',
    bottom: '-14px',
    left: '50px',
    width: '26px',
    height: '24px',
    borderRadius: '16px',
    background: '#b45309',
    boxShadow: '0 6px 8px rgba(0,0,0,0.2)'
  },
  eagleFootRight: {
    position: 'absolute',
    bottom: '-14px',
    right: '50px',
    width: '26px',
    height: '24px',
    borderRadius: '16px',
    background: '#b45309',
    boxShadow: '0 6px 8px rgba(0,0,0,0.2)'
  },
  eagleRipple: {
    position: 'absolute',
    inset: '-10px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.35)',
    animation: 'eaglePulse 2s ease-out'
  },
  eagleSparkle: {
    position: 'absolute',
    top: '-20px',
    right: '10px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    animation: 'eagleSparkle 2s infinite'
  },
  eagleHintBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '16px',
    background: 'rgba(15,23,42,0.65)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#f8fafc',
    maxWidth: '260px',
    textAlign: 'left',
    fontWeight: 600,
    boxShadow: '0 12px 24px rgba(2,6,23,0.4)'
  },
  eagleHintBubbleMobile: {
    textAlign: 'center',
    width: '100%'
  },
  eagleHintIcon: {
    fontSize: '1.4rem'
  },
  loadingWrapper: {
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--text-primary)'
  },
  spinner: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '4px solid var(--surface-border)',
    borderTopColor: 'var(--accent)',
    animation: 'spin 1s linear infinite'
  },
  reviewCard: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '26px',
    boxShadow: '0 14px 36px var(--review-shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  reviewCardMobile: {
    padding: '20px'
  },
  reviewCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '18px',
    flexWrap: 'wrap'
  },
  reviewBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    background: 'var(--accent-badge-bg)',
    color: 'var(--accent-badge-text)',
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },
  reviewCardTitle: {
    fontSize: '20px',
    fontWeight: 800,
    marginBottom: '6px',
    color: 'var(--tone-hero)'
  },
  reviewHint: {
    fontSize: '15px',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    margin: 0
  },
  reviewActionButton: {
    padding: '12px 22px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--success-gradient)',
    color: 'var(--text-inverse)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 26px var(--success-shadow)'
  },
  reviewButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewItem: {
    padding: '16px',
    borderRadius: '14px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)'
  },
  reviewItemMeta: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  reviewItemType: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    fontSize: '12px',
    fontWeight: 700
  },
  reviewItemSource: {
    fontSize: '12px',
    color: 'var(--tone-muted)'
  },
  reviewItemText: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.6
  },
  reviewEmpty: {
    textAlign: 'center',
    padding: '20px',
    borderRadius: '14px',
    background: 'var(--surface-overlay)',
    color: 'var(--review-hint)',
    fontWeight: 600
  }
};

export default HomePage;
