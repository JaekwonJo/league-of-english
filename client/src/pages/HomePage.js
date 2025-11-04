import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import tierConfig from '../config/tierConfig.json';

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

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewQueue, setReviewQueue] = useState({ total: 0, problems: [] });
  const [reviewLoading, setReviewLoading] = useState(true);

  const formatPreviewText = (text) => {
    if (!text) return '문항 정보를 준비 중이에요.';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
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

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>안녕하세요, {user?.name || '학습자'}님! 👋</h1>
      <p style={styles.subtitle}>오늘도 한 걸음씩, 꾸준하게 영어 실력을 올려볼까요?</p>

      <section style={styles.tierCard}>
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
        <h2 style={styles.sectionTitle}>오늘의 요약</h2>
        <div style={styles.statGrid}>
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
        <h2 style={styles.sectionTitle}>바로 시작하기</h2>
        <div style={styles.quickGrid}>
          <QuickButton label="학습 세트 생성" description="5문항 세트를 바로 만들기" onClick={() => (window.location.href = '/study')} />
          <QuickButton label="순서 배열 훈련" description="순서 문제를 집중 연습" onClick={() => (window.location.href = '/study?focus=order')} />
          <QuickButton label="문장 삽입 훈련" description="문장 삽입 패턴 다지기" onClick={() => (window.location.href = '/study?focus=insertion')} />
          {user?.role === 'admin' && (
            <QuickButton label="문서 업로드" description="새 교재를 등록하고 분석" onClick={() => (window.location.href = '/admin')} />
          )}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>복습 대기열</h2>
        <div style={styles.reviewCard}>
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

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    color: 'var(--text-primary)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 900,
    letterSpacing: '-0.02em',
    marginBottom: '8px',
    color: 'var(--tone-hero)'
  },
  subtitle: {
    fontSize: '18px',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    marginBottom: '32px'
  },
  tierCard: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 12px 30px var(--surface-shadow)',
    marginBottom: '32px'
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
