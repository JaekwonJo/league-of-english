import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import tierConfig from '../config/tierConfig.json';
import OwlGuideChip from '../components/common/OwlGuideChip';

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
};

const owlHints = [
  '어휘 훈련에서 Day를 하나 골라 볼까요?',
  '분석 자료에서 새 지문을 열어 보세요!',
  '모의고사 50분 타이머도 준비되어 있어요!',
  '복습 대기열은 매일 조금씩 비우면 좋아요!'
];

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewQueue, setReviewQueue] = useState({ total: 0, problems: [] });
  const [reviewLoading, setReviewLoading] = useState(true);
  const [owlMood, setOwlMood] = useState('idle');
  const [owlHintIndex, setOwlHintIndex] = useState(0);
  const [owlPulseKey, setOwlPulseKey] = useState(0);
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
      setOwlHintIndex((prev) => (prev + 1) % owlHints.length);
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

  const handleOwlInteract = () => {
    setOwlMood('cheer');
    setOwlPulseKey((prev) => prev + 1);
    window.setTimeout(() => setOwlMood('idle'), 1400);
  };

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

  const currentOwlHint = owlHints[owlHintIndex];

  return (
    <div style={isMobile ? { ...styles.container, ...styles.containerMobile } : styles.container}>
      <section style={isMobile ? { ...styles.heroSection, ...styles.heroSectionMobile } : styles.heroSection}>
        <div style={isMobile ? { ...styles.heroTextBlock, ...styles.heroTextBlockMobile } : styles.heroTextBlock}>
          <span style={styles.heroTag}>League of English</span>
          <h1 style={styles.heroTitle}>안녕하세요, {user?.name || '학습자'}님! 👋</h1>
          <p style={styles.heroSubtitle}>
            하루 30분만 투자해도 단어·분석·모의고사를 한 번에 챙길 수 있어요. 부엉이 튜터가 오늘 해야 할 일을 부드럽게 안내해 드릴게요.
          </p>
          <div style={isMobile ? { ...styles.heroCTAGroup, ...styles.heroCTAGroupMobile } : styles.heroCTAGroup}>
            <button type="button" style={styles.heroPrimaryButton} onClick={() => (window.location.href = '/vocabulary')}>
              어휘 시험 보러가기
            </button>
            <button type="button" style={styles.heroSecondaryButton} onClick={() => (window.location.href = '/analysis')}>
              분석 자료 열어보기
            </button>
          </div>
          {showStreakBadge && (
            <div style={styles.streakBadge}>
              <span style={styles.streakFlameIcon}>🔥</span>
              {streakDays > 0 ? `연속 학습 ${streakDays}일째!` : '연속 학습을 오늘부터 시작해 볼까요?'}
              <span style={styles.streakGlow} aria-hidden="true" />
            </div>
          )}
          <p style={styles.heroNote}>Tip · 부엉이를 눌러서 오늘의 미션을 확인해 보세요!</p>
        </div>
        <OwlMascot
          mood={owlMood}
          hint={currentOwlHint}
          onInteract={handleOwlInteract}
          pulseKey={owlPulseKey}
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
          <OwlGuideChip text="숫자로 오늘의 페이스 체크" variant="accent" />
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
          <OwlGuideChip text="자주 쓰는 기능을 한 곳에!" />
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
          <OwlGuideChip text="틀렸던 문제를 부엉이가 기억하고 있어요" variant="warning" />
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
              <div style={styles.reviewEmpty}>최근에 틀렸던 문제가 없어요! 정말 멋져요 🦉</div>
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

const QuickButton = ({ label, description, onClick }) => (
  <button style={styles.quickButton} onClick={onClick}>
    <strong>{label}</strong>
    <span style={styles.quickDescription}>{description}</span>
  </button>
);

const OwlMascot = ({ mood, onInteract, hint, pulseKey, isMobile }) => (
  <div style={isMobile ? { ...styles.owlWrapper, ...styles.owlWrapperMobile } : styles.owlWrapper}>
    <button
      type="button"
      onClick={onInteract}
      onTouchStart={onInteract}
      style={{
        ...styles.owlButton,
        ...(mood === 'cheer' ? styles.owlButtonCheer : {}),
        ...(isMobile ? styles.owlButtonMobile : {})
      }}
      aria-label="부엉이 튜터와 상호작용"
    >
      <div
        style={{
          ...styles.owlBody,
          ...(mood === 'cheer' ? styles.owlBodyCheer : {}),
          ...(isMobile ? styles.owlBodyMobile : {})
        }}
      >
        <div style={styles.owlEarLeft} />
        <div style={styles.owlEarRight} />
        <div style={styles.owlFace}>
          <div style={{ ...styles.owlEye, ...(mood === 'wink' ? styles.owlEyeWink : {}) }}>
            <div style={styles.owlPupil} />
          </div>
          <div style={{ ...styles.owlEye, ...(mood === 'cheer' ? styles.owlEyeCheer : {}) }}>
            <div style={styles.owlPupil} />
          </div>
          <div style={styles.owlBeak} />
        </div>
        <div style={styles.owlWingLeft} />
        <div style={styles.owlWingRight} />
        <div style={styles.owlBelly}>
          <span style={styles.owlBadge}>League of English</span>
        </div>
        <div style={styles.owlFootLeft} />
        <div style={styles.owlFootRight} />
      </div>
      <span
        key={pulseKey}
        style={styles.owlRipple}
        aria-hidden="true"
      />
      <span
        key={`spark-${pulseKey}`}
        style={{ ...styles.owlSparkle, animationDelay: `${pulseKey % 3 * 0.4}s` }}
        aria-hidden="true"
      />
    </button>
    <div style={isMobile ? { ...styles.owlHintBubble, ...styles.owlHintBubbleMobile } : styles.owlHintBubble}>
      <span style={styles.owlHintIcon}>🦉</span>
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
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.65))',
    color: '#f8fafc',
    boxShadow: '0 30px 70px rgba(15, 23, 42, 0.4)',
    marginBottom: '32px'
  },
  heroSectionMobile: {
    flexDirection: 'column',
    padding: '24px',
    borderRadius: '24px'
  },
  heroTextBlock: {
    flex: '1 1 360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  heroTextBlockMobile: {
    order: 2,
    gap: '10px'
  },
  heroTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  heroTitle: {
    fontSize: '2.4rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: 0
  },
  heroSubtitle: {
    fontSize: '1.05rem',
    lineHeight: 1.8,
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
    background: 'rgba(250, 204, 21, 0.18)',
    border: '1px solid rgba(250, 204, 21, 0.45)',
    color: '#FEF3C7',
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
    background: 'linear-gradient(135deg, #FDE047, #F97316)',
    color: '#1E1B4B',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 20px 40px rgba(234, 179, 8, 0.35)'
  },
  heroSecondaryButton: {
    padding: '14px 22px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.5)',
    background: 'transparent',
    color: '#f8fafc',
    fontWeight: 700,
    cursor: 'pointer'
  },
  heroNote: {
    fontSize: '0.95rem',
    color: 'rgba(248,250,252,0.85)'
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '20px',
    borderRadius: '18px',
    border: 'none',
    background: 'var(--submit-gradient)',
    color: 'var(--text-inverse)',
    cursor: 'pointer',
    boxShadow: '0 10px 28px var(--submit-shadow)',
    transition: 'transform 0.2s ease'
  },
  quickDescription: {
    fontSize: '14px',
    color: 'var(--text-inverse)',
    opacity: 0.9
  },
  owlWrapper: {
    flex: '1 1 260px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  owlWrapperMobile: {
    order: 1,
    width: '100%'
  },
  owlButton: {
    position: 'relative',
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    animation: 'owlFloat 5s ease-in-out infinite'
  },
  owlButtonCheer: {
    transform: 'scale(1.04)'
  },
  owlButtonMobile: {
    width: '100%'
  },
  owlBody: {
    width: '220px',
    height: '230px',
    borderRadius: '110px',
    background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 55%, #334155 100%)',
    border: '4px solid rgba(255,255,255,0.15)',
    position: 'relative',
    boxShadow: '0 25px 50px rgba(2,6,23,0.55)'
  },
  owlBodyCheer: {
    boxShadow: '0 30px 60px rgba(250, 204, 21, 0.45)'
  },
  owlBodyMobile: {
    width: '180px',
    height: '190px'
  },
  owlEarLeft: {
    position: 'absolute',
    top: '-18px',
    left: '40px',
    width: '40px',
    height: '40px',
    background: '#0F172A',
    transform: 'rotate(-20deg)',
    borderRadius: '12px 12px 2px 2px'
  },
  owlEarRight: {
    position: 'absolute',
    top: '-18px',
    right: '40px',
    width: '40px',
    height: '40px',
    background: '#0F172A',
    transform: 'rotate(20deg)',
    borderRadius: '12px 12px 2px 2px'
  },
  owlFace: {
    position: 'absolute',
    top: '36px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  owlEye: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: '#F8FAFC',
    border: '4px solid #0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'owlBlink 6s infinite'
  },
  owlEyeWink: {
    animation: 'owlBlinkQuick 0.2s 4 alternate'
  },
  owlEyeCheer: {
    animation: 'owlBlinkCheer 1.4s'
  },
  owlPupil: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: '#1D4ED8'
  },
  owlBeak: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: '52px',
    width: '34px',
    height: '28px',
    borderRadius: '50% 50% 40% 40%',
    background: '#FDBA74'
  },
  owlWingLeft: {
    position: 'absolute',
    width: '70px',
    height: '120px',
    left: '-20px',
    top: '60px',
    borderRadius: '60% 30% 60% 30%',
    background: '#1E293B',
    animation: 'owlWing 4s ease-in-out infinite'
  },
  owlWingRight: {
    position: 'absolute',
    width: '70px',
    height: '120px',
    right: '-20px',
    top: '60px',
    borderRadius: '30% 60% 30% 60%',
    background: '#1E293B',
    animation: 'owlWing 4s ease-in-out infinite',
    animationDelay: '0.4s'
  },
  owlBelly: {
    position: 'absolute',
    bottom: '42px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '140px',
    height: '90px',
    borderRadius: '70px',
    background: 'linear-gradient(180deg, #FDE68A, #F59E0B)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  owlBadge: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  owlFootLeft: {
    position: 'absolute',
    bottom: '-8px',
    left: '70px',
    width: '28px',
    height: '26px',
    borderRadius: '14px',
    background: '#F59E0B'
  },
  owlFootRight: {
    position: 'absolute',
    bottom: '-8px',
    right: '70px',
    width: '28px',
    height: '26px',
    borderRadius: '14px',
    background: '#F59E0B'
  },
  owlRipple: {
    position: 'absolute',
    inset: '-10px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.35)',
    animation: 'owlPulse 2s ease-out'
  },
  owlSparkle: {
    position: 'absolute',
    top: '-20px',
    right: '10px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    animation: 'owlSparkle 2s infinite'
  },
  owlHintBubble: {
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
  owlHintBubbleMobile: {
    textAlign: 'center',
    width: '100%'
  },
  owlHintIcon: {
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
