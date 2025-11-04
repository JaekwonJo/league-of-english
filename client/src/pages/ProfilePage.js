import React, { useCallback, useEffect, useState } from 'react';
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
  implicit: '함축 의미'
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [reviewQueue, setReviewQueue] = useState({ total: 0, problems: [] });
  const [reviewLoading, setReviewLoading] = useState(true);

  const formatPreviewText = (text) => {
    if (!text) return '문항 정보를 준비 중이에요.';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
  };

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const data = await api.problems.stats();
        if (isMounted) {
          setStats(data);
          setStatsError(null);
        }
      } catch (error) {
        if (isMounted) {
          setStatsError('학습 통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    loadStats();
    const loadReviewQueue = async () => {
      try {
        setReviewLoading(true);
        const response = await api.problems.reviewQueue({ limit: 5 });
        if (isMounted) {
          setReviewQueue({
            total: Number(response?.total) || 0,
            problems: Array.isArray(response?.problems) ? response.problems.slice(0, 5) : []
          });
        }
      } catch (error) {
        if (isMounted) {
          setReviewQueue({ total: 0, problems: [] });
        }
      } finally {
        if (isMounted) {
          setReviewLoading(false);
        }
      }
    };

    loadReviewQueue();
    return () => {
      isMounted = false;
    };
  }, []);
  const getTierInfo = () => {
    const points = user?.points || 0;
    return tierConfig.tiers.find(tier => 
      points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
    ) || tierConfig.tiers[0];
  };

  const getNextTier = () => {
    const currentTier = getTierInfo();
    const currentIndex = tierConfig.tiers.findIndex(t => t.id === currentTier.id);
    return tierConfig.tiers[currentIndex + 1] || null;
  };

  const calculateProgress = () => {
    const current = getTierInfo();
    const next = getNextTier();
    if (!next) return 100;
    
    const currentPoints = user?.points || 0;
    const range = next.minLP - current.minLP;
    const progress = currentPoints - current.minLP;
    return Math.min(100, (progress / range) * 100);
  };

  const tierInfo = getTierInfo();
  const nextTier = getNextTier();
  const progress = calculateProgress();
  const tierAccent = {
    border: `1px solid ${tierInfo.color}`,
    boxShadow: tierInfo.features.specialEffect
      ? `0 0 30px ${tierInfo.color}66`
      : `0 0 18px ${tierInfo.color}33`
  };

  const statCards = stats
    ? [
        { label: '총 학습 세션', value: stats.totalSessions ?? 0, suffix: '회' },
        { label: '정답률', value: stats.accuracy ?? 0, suffix: '%', isPercent: true },
        { label: '누적 문제 수', value: stats.totalProblems ?? 0, suffix: '문' },
        { label: '누적 정답 수', value: stats.totalCorrect ?? 0, suffix: '문' },
        { label: '최근 7일 학습', value: stats.weeklySessions ?? 0, suffix: '회' }
      ]
    : [];

  return (
    <div style={styles.container}>
      {/* 헤더 섹션 */}
      <div style={styles.header}>
        <div style={styles.headerGradient}></div>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>프로필</h1>
          <p style={styles.pageSubtitle}>당신의 학습 여정을 확인하세요</p>
        </div>
      </div>

      {/* 메인 프로필 카드 */}
      <div style={styles.mainContent}>
        {/* 티어 카드 */}
        {tierInfo.id === 'challenger' ? (
          <div className="challenger-master-container" style={styles.profileTierCard}>
            <div className="challenger-legendary-badge">LEGENDARY</div>
            <div className="challenger-particles">
              <div className="challenger-particle"></div>
              <div className="challenger-particle"></div>
              <div className="challenger-particle"></div>
              <div className="challenger-particle"></div>
              <div className="challenger-particle"></div>
            </div>
            <div className="challenger-content">
              <div style={{textAlign: 'center', marginBottom: '30px'}}>
                <div className="challenger-crown">👑</div>
                <h1 className="challenger-title">CHALLENGER</h1>
                <div style={styles.userName}>{user?.name}</div>
              </div>
              <div className="challenger-points">
                {user?.points?.toLocaleString() || 0} LP
              </div>
            </div>
          </div>
        ) : (
          <div style={{...styles.tierCard, borderColor: tierInfo.color}}>
            <div style={styles.tierHeader}>
              <div style={styles.tierIconLarge}>{tierInfo.icon}</div>
              <div style={styles.tierInfo}>
                <h2 style={{...styles.tierName, color: tierInfo.color}}>
                  {tierInfo.nameKr}
                </h2>
                <div style={styles.userName}>{user?.name}</div>
                <div style={styles.pointsDisplay}>
                  {user?.points?.toLocaleString() || 0} LP
                </div>
              </div>
            </div>
            
            {nextTier && (
              <div style={styles.progressSection}>
                <div style={styles.progressInfo}>
                  <span>다음 티어: {nextTier.nameKr}</span>
                  <span>{(nextTier.minLP - (user?.points || 0)).toLocaleString()} LP 필요</span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{ 
                      ...styles.progressFill, 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${tierInfo.color}, ${nextTier.color})`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 상세 정보 카드들 */}
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.cardIcon}>🏫</div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>학교</div>
              <div style={styles.cardValue}>{user?.school || '미설정'}</div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.cardIcon}>📚</div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>학년</div>
              <div style={styles.cardValue}>고{user?.grade || '?'}</div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.cardIcon}>⭐</div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>역할</div>
              <div style={styles.cardValue}>
                {user?.role === 'admin' ? '관리자' : 
                 user?.role === 'teacher' ? '선생님' : '학생'}
              </div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.cardIcon}>🎯</div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>멤버십</div>
              <div style={styles.cardValue}>
                {user?.membership || 'Basic'}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.statsSection}>
          <h3 style={styles.statsHeading}>📈 나의 학습 요약</h3>
          {statsLoading ? (
            <div style={styles.statsMessage}>데이터를 차곡차곡 불러오고 있어요… ⏳</div>
          ) : statsError ? (
            <div style={{ ...styles.statsMessage, color: 'var(--danger-soft)' }}>{statsError}</div>
          ) : (
            <div style={styles.statsGrid}>
              {statCards.map((card) => (
                <ProfileStatCard
                  key={card.label}
                  tierAccent={tierAccent}
                  {...card}
                />
              ))}
            </div>
          )}
        </div>

        <div style={styles.reviewQueueSection}>
          <div style={styles.reviewQueueHeader}>
            <div>
              <div style={styles.reviewQueueBadge}>복습 대기열</div>
              <h3 style={styles.reviewQueueTitle}>틀린 문제 {reviewQueue.total}문이 당신을 기다리고 있어요</h3>
              <p style={styles.reviewQueueHint}>복습을 누적하면 티어도 빠르게 올라가요. 지금 바로 도전해 볼까요?</p>
            </div>
            <button
              style={{
                ...styles.reviewQueueButton,
                ...(reviewLoading ? styles.reviewQueueButtonDisabled : {})
              }}
              onClick={() => (window.location.href = '/study?mode=review')}
              disabled={reviewLoading || reviewQueue.total === 0}
            >
              {reviewLoading ? '정리 중...' : reviewQueue.total > 0 ? '복습 시작하기' : '최근 오답 없음'}
            </button>
          </div>
          <div style={styles.reviewQueueList}>
            {reviewLoading ? (
              <div style={styles.reviewQueueEmpty}>복습 카드를 모으는 중이에요… ⏳</div>
            ) : reviewQueue.total === 0 ? (
              <div style={styles.reviewQueueEmpty}>최근에 틀린 문제가 없어요! 꾸준한 학습이 빛나고 있네요 ✨</div>
            ) : (
              reviewQueue.problems.map((problem) => (
                <div key={problem.id} style={styles.reviewQueueItem}>
                  <div style={styles.reviewQueueItemMeta}>
                    <span style={styles.reviewQueueType}>{typeLabelMap[problem.type] || problem.type}</span>
                    {problem.sourceLabel && <span style={styles.reviewQueueSource}>{problem.sourceLabel}</span>}
                    {problem.exposure?.incorrectCount && (
                      <span style={styles.reviewQueueCount}>오답 {problem.exposure.incorrectCount}회</span>
                    )}
                  </div>
                  <div style={styles.reviewQueueText}>{formatPreviewText(problem.question || problem.mainText)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {!statsLoading && !statsError && stats?.perType?.length > 0 && (
          <div style={styles.typeSection}>
            <h3 style={styles.statsHeading}>🎯 유형별 정답률</h3>
            <div style={styles.typeList}>
              {stats.perType.map((entry) => (
                <TypeAccuracyRow key={entry.type} entry={entry} tierInfo={tierInfo} />
              ))}
            </div>
          </div>
        )}

        <MembershipCard />
        <TeacherSection />
        <TeacherAnalyticsSection />
        <StudentJoinCard />

        {/* 티어 혜택 카드 */}
        <div style={styles.benefitsCard}>
          <h3 style={styles.benefitsTitle}>
            🎁 {tierInfo.nameKr} 티어 혜택
          </h3>
          <div style={styles.benefitsList}>
            <div style={styles.benefitItem}>
              <span style={styles.benefitIcon}>⚡</span>
              <span>포인트 {tierInfo.rewards.bonusPoints}x 배율</span>
            </div>
            <div style={styles.benefitItem}>
              <span style={styles.benefitIcon}>🎁</span>
              <span>일일 보너스 {tierInfo.rewards.dailyBonus} LP</span>
            </div>
            {tierInfo.features.profileBadge && (
              <div style={styles.benefitItem}>
                <span style={styles.benefitIcon}>🏆</span>
                <span>전용 프로필 뱃지</span>
              </div>
            )}
            {tierInfo.features.specialEffect && (
              <div style={styles.benefitItem}>
                <span style={styles.benefitIcon}>✨</span>
                <span>특별 이펙트 활성화</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileStatCard = ({ label, value, suffix, tierAccent, isPercent }) => {
  const numeric = Number(value || 0);
  return (
    <div
      style={{
        ...styles.profileStatCard,
        ...(tierAccent || {})
      }}
    >
      <div style={styles.profileStatLabel}>{label}</div>
      <div style={styles.profileStatValue}>
        {isPercent ? numeric.toFixed(1) : numeric.toLocaleString()}
        {suffix && <span style={styles.profileStatSuffix}>{suffix}</span>}
      </div>
    </div>
  );
};

const TypeAccuracyRow = ({ entry, tierInfo }) => {
  const accuracy = Number(entry.accuracy || 0);
  const correct = Number(entry.correct || 0);
  const incorrect = Number(entry.incorrect || 0);
  const total = Number(entry.total || 0);
  return (
    <div style={styles.typeRow}>
      <div style={styles.typeHeaderRow}>
        <span>{typeLabelMap[entry.type] || entry.type}</span>
        <span>{accuracy.toFixed(1)}%</span>
      </div>
      <div style={styles.typeBar}>
        <div
          style={{
            ...styles.typeBarFill,
            width: `${accuracy}%`,
            background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.color}AA)`
          }}
        />
      </div>
      <div style={styles.typeMeta}>
        <span>정답 {correct.toLocaleString()}문</span>
        <span>오답 {incorrect.toLocaleString()}문</span>
        <span>총 {total.toLocaleString()}문</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, var(--color-slate-900) 0%, var(--color-slate-650) 50%, var(--color-slate-900) 100%)',
    position: 'relative',
    overflow: 'hidden'
  },
  header: {
    position: 'relative',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '40px'
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
    backdropFilter: 'blur(10px)'
  },
  headerContent: {
    position: 'relative',
    textAlign: 'center',
    zIndex: 10
  },
  pageTitle: {
    fontSize: '48px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, var(--surface-soft-solid) 0%, var(--border-subtle) 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    textShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
    letterSpacing: '2px'
  },
  pageSubtitle: {
    fontSize: '18px',
    color: 'rgba(248, 250, 252, 0.7)',
    margin: '10px 0 0 0',
    fontWeight: '500'
  },
  mainContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px'
  },
  profileTierCard: {
    marginBottom: '40px'
  },
  tierCard: {
    background: 'rgba(30, 41, 59, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '25px',
    padding: '40px',
    marginBottom: '40px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    border: '2px solid',
    borderColor: 'var(--accent-primary)',
    position: 'relative',
    overflow: 'hidden'
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    marginBottom: '30px'
  },
  tierIconLarge: {
    fontSize: '80px',
    filter: 'drop-shadow(0 0 20px currentColor)'
  },
  tierInfo: {
    flex: 1
  },
  tierName: {
    fontSize: '36px',
    fontWeight: '900',
    margin: '0 0 10px 0',
    textShadow: '0 0 20px currentColor'
  },
  userName: {
    fontSize: '24px',
    color: 'var(--text-inverse)',
    fontWeight: '700',
    marginBottom: '15px',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
  },
  pointsDisplay: {
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, var(--warning-strong) 0%, var(--danger) 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(245, 158, 11, 0.5)'
  },
  progressSection: {
    marginTop: '30px'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    fontSize: '16px',
    color: 'var(--tone-muted)',
    fontWeight: '600'
  },
  progressBar: {
    height: '12px',
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
  },
  progressFill: {
    height: '100%',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, var(--accent-primary), var(--violet-soft))',
    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statsSection: {
    marginTop: '48px'
  },
  statsHeading: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--text-inverse)',
    marginBottom: '20px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '18px'
  },
  statsMessage: {
    padding: '18px',
    borderRadius: '16px',
    background: 'rgba(15, 23, 42, 0.6)',
    color: 'var(--tone-muted)',
    textAlign: 'center'
  },
  reviewQueueSection: {
    marginTop: '30px',
    padding: '24px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(147, 197, 253, 0.14))',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    boxShadow: '0 20px 38px rgba(30, 64, 175, 0.18)'
  },
  reviewQueueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  reviewQueueBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    background: 'var(--accent-soft-strong)',
    color: 'var(--accent-badge-text)',
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.05em',
    marginBottom: '10px'
  },
  reviewQueueTitle: {
    margin: '0 0 8px 0',
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--accent-strong)'
  },
  reviewQueueHint: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--tone-strong)'
  },
  reviewQueueButton: {
    padding: '12px 26px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--success-gradient)',
    color: 'var(--text-inverse)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 18px 32px var(--success-shadow)'
  },
  reviewQueueButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  reviewQueueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  reviewQueueItem: {
    padding: '18px',
    borderRadius: '16px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.1)'
  },
  reviewQueueItemMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  reviewQueueType: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'var(--accent-soft)',
    color: 'var(--tone-strong)',
    fontSize: '12px',
    fontWeight: 700
  },
  reviewQueueSource: {
    fontSize: '12px',
    color: 'var(--tone-muted)'
  },
  reviewQueueCount: {
    fontSize: '12px',
    color: 'var(--danger-text)',
    fontWeight: 700
  },
  reviewQueueText: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.6
  },
  reviewQueueEmpty: {
    textAlign: 'center',
    padding: '24px',
    borderRadius: '14px',
    background: 'rgba(226, 232, 240, 0.65)',
    color: 'var(--tone-strong)',
    fontWeight: 600
  },
  profileStatCard: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '22px',
    textAlign: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    color: 'var(--tone-strong)',
    border: '1px solid var(--surface-border)'
  },
  profileStatLabel: {
    fontSize: '14px',
    color: 'var(--tone-strong)',
    marginBottom: '12px'
  },
  profileStatValue: {
    fontSize: '32px',
    fontWeight: 900,
    color: 'var(--text-primary)'
  },
  profileStatSuffix: {
    fontSize: '16px',
    marginLeft: '4px',
    color: 'var(--tone-strong)'
  },
  typeSection: {
    marginTop: '40px'
  },
  typeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  typeRow: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid var(--surface-border)'
  },
  typeHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    color: 'var(--tone-strong)',
    marginBottom: '10px'
  },
  typeBar: {
    width: '100%',
    height: '12px',
    background: 'var(--surface-soft)',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  typeBarFill: {
    height: '100%',
    borderRadius: '999px'
  },
  typeMeta: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
    fontSize: '13px',
    color: 'var(--tone-strong)'
  },
  infoCard: {
    background: 'rgba(51, 65, 85, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  cardIcon: {
    fontSize: '32px',
    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'
  },
  cardContent: {
    flex: 1
  },
  cardLabel: {
    fontSize: '14px',
    color: 'var(--tone-muted)',
    fontWeight: '600',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  cardValue: {
    fontSize: '18px',
    color: 'var(--text-inverse)',
    fontWeight: '700'
  },
  membershipCard: {
    background: 'rgba(15, 23, 42, 0.65)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35)',
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  membershipTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--text-primary)'
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginTop: '8px'
  },
  planCardBase: {
    borderRadius: '18px',
    padding: '18px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)'
  },
  planCardFree: {
    borderRadius: '18px',
    padding: '18px',
    border: '1px solid rgba(148,163,184,0.25)',
    background: 'linear-gradient(135deg, rgba(148,163,184,0.10), rgba(148,163,184,0.06))'
  },
  planCardPremium: {
    borderRadius: '18px',
    padding: '18px',
    border: '1px solid rgba(203,213,225,0.5)',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.10))',
    boxShadow: '0 0 24px rgba(59,130,246,0.35), 0 0 48px rgba(59,130,246,0.25)'
  },
  planCardPro: {
    borderRadius: '18px',
    padding: '18px',
    border: '1px solid rgba(245,158,11,0.65)',
    background: 'linear-gradient(135deg, rgba(245,158,11,0.20), rgba(250,204,21,0.12))',
    boxShadow: '0 0 30px rgba(245,158,11,0.45), 0 0 60px rgba(250,204,21,0.30)'
  },
  planHeader: {
    fontSize: '16px',
    fontWeight: 800,
    marginBottom: '10px',
    color: 'var(--text-primary)'
  },
  planList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: 'var(--tone-strong)',
    fontSize: '14px'
  },
  planPrice: {
    marginTop: '12px',
    fontWeight: 900,
    fontSize: '18px',
    color: 'var(--warning-strong)'
  },
  membershipText: {
    fontSize: '14px',
    color: 'var(--tone-muted)',
    margin: 0
  },
  membershipSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px'
  },
  membershipLabel: {
    display: 'block',
    fontSize: '13px',
    color: 'var(--tone-muted)'
  },
  membershipValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--surface-soft-strong)'
  },
  couponForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  couponInputRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  couponInput: {
    flex: '1 1 240px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'var(--border-subtle)',
    padding: '12px 16px',
    fontSize: '14px'
  },
  couponButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, var(--accent-primary) 100%)',
    color: 'var(--text-on-accent)',
    padding: '12px 18px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer'
  },
  redeemMessage: {
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    textAlign: 'center'
  },
  redeemSuccess: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: 'var(--success-soft)'
  },
  redeemError: {
    background: 'rgba(248, 113, 113, 0.15)',
    color: 'var(--danger-soft)'
  },
  redeemInfo: {
    background: 'rgba(96, 165, 250, 0.15)',
    color: 'var(--accent-primary-light)'
  },
  depositBox: {
    background: 'rgba(15, 23, 42, 0.45)',
    borderRadius: '18px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px dashed rgba(148, 163, 184, 0.3)'
  },
  depositInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    background: 'rgba(30, 64, 175, 0.25)',
    borderRadius: '12px',
    padding: '12px',
    color: 'var(--accent-primary-light)',
    fontWeight: 600
  },
  depositTextarea: {
    width: '100%',
    minHeight: '90px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'var(--surface-soft-solid)',
    padding: '12px',
    fontSize: '14px',
    resize: 'vertical'
  },
  depositButtonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  depositButton: {
    flex: '1 1 200px',
    borderRadius: '12px',
    border: 'none',
    padding: '12px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  teacherCard: {
    background: 'rgba(15, 23, 42, 0.65)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35)',
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  teacherHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  teacherButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--success-lighter) 0%, var(--success) 100%)',
    color: 'var(--text-primary)',
    padding: '10px 16px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer'
  },
  teacherCodeList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  teacherCodeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    padding: '16px'
  },
  teacherCodeMeta: {
    margin: 0,
    color: 'var(--tone-muted)',
    fontSize: '13px'
  },
  teacherCodeBadge: {
    background: 'rgba(148, 163, 184, 0.25)',
    borderRadius: '12px',
    padding: '6px 12px',
    color: 'var(--border-subtle)',
    fontSize: '12px',
    fontWeight: 600
  },
  teacherCodeEmpty: {
    color: 'var(--tone-muted)',
    fontSize: '13px',
    padding: '12px'
  },
  codeDeactivateButton: {
    borderRadius: '10px',
    background: 'rgba(248, 113, 113, 0.15)',
    color: 'var(--danger-soft)',
    padding: '8px 14px',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    cursor: 'pointer'
  },
  teacherStudentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  teacherSectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--surface-soft-solid)'
  },
  teacherStudentList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  teacherStudentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    padding: '16px'
  },
  analyticsCard: {
    background: 'rgba(15, 23, 42, 0.65)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35)',
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  analyticsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  analyticsTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--surface-soft-solid)'
  },
  analyticsButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--info-soft) 0%, var(--info) 100%)',
    color: 'var(--text-primary)',
    padding: '10px 16px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer'
  },
  analyticsButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  analyticsFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px'
  },
  analyticsFilterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '140px'
  },
  analyticsFilterLabel: {
    fontSize: '13px',
    color: 'var(--tone-muted)',
    fontWeight: 600
  },
  analyticsSelect: {
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'var(--border-subtle)',
    padding: '8px 12px',
    fontSize: '14px'
  },
  analyticsError: {
    color: 'var(--danger-soft)',
    fontSize: '14px',
    margin: 0
  },
  analyticsInfo: {
    color: 'var(--tone-muted)',
    fontSize: '14px',
    margin: 0
  },
  analyticsSummaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  analyticsSummaryCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  analyticsSummaryLabel: {
    fontSize: '12px',
    color: 'var(--tone-muted)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  analyticsSummaryValue: {
    fontSize: '18px',
    color: 'var(--surface-soft-solid)',
    fontWeight: 700
  },
  analyticsTableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.15)'
  },
  analyticsTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  analyticsTableHead: {
    textAlign: 'left',
    fontSize: '12px',
    color: 'var(--tone-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
  },
  analyticsTableRow: {
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  analyticsTableRowSelected: {
    background: 'rgba(59, 130, 246, 0.15)'
  },
  analyticsTableCell: {
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--border-subtle)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.08)'
  },
  analyticsTwoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  analyticsPanel: {
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  analyticsPanelTitle: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--surface-soft-strong)',
    fontWeight: 600
  },
  analyticsList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  analyticsListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '13px',
    color: 'var(--border-subtle)',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '10px',
    padding: '8px 12px'
  },
  analyticsDetailCard: {
    background: 'rgba(15, 23, 42, 0.7)',
    borderRadius: '18px',
    padding: '20px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  analyticsDetailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  analyticsDetailTitle: {
    margin: 0,
    fontSize: '16px',
    color: 'var(--surface-soft-solid)',
    fontWeight: 700
  },
  analyticsDetailClose: {
    border: 'none',
    background: 'transparent',
    color: 'var(--tone-muted)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '6px 8px'
  },
  analyticsDetailSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  studentJoinCard: {
    background: 'rgba(15, 23, 42, 0.65)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35)',
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  studentJoinForm: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  studentJoinInput: {
    flex: '1 1 220px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: 'var(--border-subtle)',
    padding: '12px 16px',
    fontSize: '14px'
  },
  studentJoinButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--info-soft) 0%, var(--info) 100%)',
    color: 'var(--text-on-accent)',
    padding: '12px 18px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer'
  },
  benefitsCard: {
    background: 'rgba(30, 41, 59, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '25px',
    padding: '40px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
  },
  benefitsTitle: {
    fontSize: '24px',
    color: 'var(--text-inverse)',
    fontWeight: '800',
    marginBottom: '25px',
    textAlign: 'center',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
  },
  benefitsList: {
    display: 'grid',
    gap: '15px'
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px 20px',
    background: 'rgba(51, 65, 85, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    fontSize: '16px',
    color: 'var(--text-inverse)',
    fontWeight: '600'
  },
  benefitIcon: {
    fontSize: '20px',
    filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))'
  }
};


const MembershipCard = () => {
  const { user, updateUser } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [message, setMessage] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestFeedback, setRequestFeedback] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setInfo(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await api.membership.status();
      if (response?.success) {
        setInfo(response.data || null);
        if (response.user) {
          updateUser({ ...user, ...response.user });
        }
      } else if (response?.message) {
        setError(response.message);
      }
    } catch (err) {
      setError(err?.message || '멤버십 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [updateUser, user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = couponCode.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: '쿠폰 코드를 입력해 주세요.' });
      return;
    }
    try {
      setMessage({ type: 'info', text: '쿠폰을 확인하는 중이에요...' });
      const response = await api.membership.redeem(trimmed);
      if (response?.success) {
        setMessage({ type: 'success', text: response.message || '쿠폰이 적용되었어요!' });
        setCouponCode('');
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: response?.message || '쿠폰을 적용하지 못했어요.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || '쿠폰을 적용하지 못했어요.' });
    }
  };

  const handleMembershipRequest = async (plan) => {
    try {
      setRequestLoading(true);
      setRequestFeedback(null);
      const response = await api.membership.request(plan, requestNote);
      if (response?.success) {
        setRequestFeedback({ type: 'success', text: response.message || '요청이 접수되었습니다.' });
        setRequestNote('');
      } else {
        setRequestFeedback({ type: 'error', text: response?.message || '요청을 처리하지 못했어요.' });
      }
    } catch (err) {
      setRequestFeedback({ type: 'error', text: err?.message || '요청을 처리하지 못했어요.' });
    } finally {
      setRequestLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const summary = info || {};
  const membershipType = (summary.type || user.membership || 'free').toUpperCase();
  const remainingToday = summary.remainingToday === -1 ? '무제한' : `${summary.remainingToday ?? 0}문제`;

  return (
    <div style={styles.membershipCard}>
      <h3 style={styles.membershipTitle}>멤버십 상태</h3>
      {loading ? (
        <p style={styles.membershipText}>멤버십 정보를 불러오는 중이에요...</p>
      ) : error ? (
        <p style={{ ...styles.membershipText, color: 'var(--danger-soft)' }}>{error}</p>
      ) : (
        <div style={styles.membershipSummary}>
          <div>
            <span style={styles.membershipLabel}>현재 등급</span>
            <strong style={styles.membershipValue}>{membershipType}</strong>
          </div>
          <div>
            <span style={styles.membershipLabel}>오늘 남은 횟수</span>
            <strong style={styles.membershipValue}>{remainingToday}</strong>
          </div>
          {summary.expiresAt && (
            <div>
              <span style={styles.membershipLabel}>만료 예정</span>
              <strong style={styles.membershipValue}>{new Date(summary.expiresAt).toLocaleDateString()}</strong>
            </div>
          )}
        </div>
      )}

      <form style={styles.couponForm} onSubmit={handleSubmit}>
        <label style={styles.membershipLabel}>쿠폰 코드</label>
        <div style={styles.couponInputRow}>
          <input
            style={styles.couponInput}
            type="text"
            value={couponCode}
            placeholder="예) LOE-PREMIUM-30"
            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          />
          <button type="submit" style={styles.couponButton}>쿠폰 적용</button>
        </div>
      </form>

      {message && (
        <div
          style={{
            ...styles.redeemMessage,
            ...(message.type === 'success'
              ? styles.redeemSuccess
              : message.type === 'error'
                ? styles.redeemError
                : styles.redeemInfo)
          }}
        >
          {message.text}
        </div>
      )}

      {/* 멤버십 플랜 소개 */}
      <div style={styles.planGrid}>
        <div style={styles.planCardFree}>
          <div style={styles.planHeader}>무료 회원</div>
          <ul style={styles.planList}>
            <li>단어시험 하루 30개</li>
            <li>문제풀이 하루 30개</li>
            <li>기본 학습 기능</li>
          </ul>
          <div style={styles.planPrice}>무료</div>
        </div>
        <div style={styles.planCardPremium}>
          <div style={styles.planHeader}>프리미엄</div>
          <ul style={styles.planList}>
            <li>단어시험 무제한</li>
            <li>문제풀이 무제한</li>
            <li>학습 통계 제공</li>
            <li>프리미엄 뱃지 제공</li>
          </ul>
          <div style={styles.planPrice}>월 12,900원</div>
        </div>
        <div style={styles.planCardPro}>
          <div style={styles.planHeader}>프로</div>
          <ul style={styles.planList}>
            <li>단어시험 무제한</li>
            <li>문제풀이 무제한</li>
            <li>학습 통계 제공</li>
            <li>분석 자료 무제한</li>
            <li>프로 뱃지 제공</li>
          </ul>
          <div style={styles.planPrice}>월 19,900원</div>
        </div>
      </div>

      <div style={styles.depositBox}>
        <h4 style={styles.membershipTitle}>무통장 입금 안내</h4>
        <p style={styles.membershipText}>
          프리미엄(월 12,900원) 또는 프로(월 19,900원)로 업그레이드하고 싶다면 아래 계좌로 입금 후 “입금 확인 요청” 버튼을 눌러 주세요.
          {' '}입금이 확인되는 순간부터 정확히 30일(24시간 × 30)이 지나면 다음 달 결제 안내가 필요해요.
        </p>
        <div style={styles.depositInfo}>
          <span>입금 계좌</span>
          <strong>계좌: 1002557648547 (예금주: 조재권)</strong>
        </div>
        <textarea
          style={styles.depositTextarea}
          placeholder="입금자명, 연락처 등 관리자에게 전하고 싶은 내용을 적어 주세요."
          value={requestNote}
          onChange={(event) => setRequestNote(event.target.value)}
        />
        <div style={styles.depositButtonRow}>
          <button
            type="button"
            style={styles.depositButton}
            disabled={requestLoading}
            onClick={() => handleMembershipRequest('premium')}
          >
            {requestLoading ? '요청 중...' : '프리미엄 입금 확인 요청'}
          </button>
          <button
            type="button"
            style={{ ...styles.depositButton, background: 'var(--danger)', marginLeft: '8px' }}
            disabled={requestLoading}
            onClick={() => handleMembershipRequest('pro')}
          >
            {requestLoading ? '요청 중...' : '프로 입금 확인 요청'}
          </button>
        </div>
        {requestFeedback && (
          <div
            style={{
              ...styles.redeemMessage,
              ...(requestFeedback.type === 'success'
                ? styles.redeemSuccess
                : requestFeedback.type === 'error'
                  ? styles.redeemError
                  : styles.redeemInfo)
            }}
          >
            {requestFeedback.text}
          </div>
        )}
      </div>
    </div>
  );
};

const TeacherSection = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const fetchData = useCallback(async () => {
    if (!isTeacher) return;
    try {
      setLoading(true);
      setError('');
      const [codesResponse, studentsResponse] = await Promise.all([
        api.teacher.codes(),
        api.teacher.students()
      ]);
      if (codesResponse?.success) {
        setCodes(codesResponse.data || []);
      } else if (codesResponse?.message) {
        setError(codesResponse.message);
      }
      if (studentsResponse?.success) {
        setStudents(studentsResponse.data || []);
      } else if (studentsResponse?.message && !error) {
        setError(studentsResponse.message);
      }
    } catch (err) {
      setError(err?.message || '학생 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [error, isTeacher]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.teacher.generateCode();
      if (response?.success) {
        await fetchData();
      } else if (response?.message) {
        setError(response.message);
      } else {
        setError('새 반 코드를 만들지 못했어요.');
      }
    } catch (err) {
      setError(err?.message || '새 반 코드를 만들지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (code) => {
    try {
      await api.teacher.deactivateCode(code);
      await fetchData();
    } catch (err) {
      setError(err?.message || '반 코드를 비활성화하지 못했어요.');
    }
  };

  if (!isTeacher) {
    return null;
  }

  return (
    <div style={styles.teacherCard}>
      <div style={styles.teacherHeader}>
        <h3 style={styles.membershipTitle}>내 반 코드</h3>
        <button type="button" style={styles.teacherButton} onClick={handleGenerate}>새 코드 만들기</button>
      </div>

      {error && <p style={{ ...styles.membershipText, color: 'var(--danger-soft)' }}>{error}</p>}

      {loading ? (
        <p style={styles.membershipText}>반 코드 정보를 불러오는 중이에요...</p>
      ) : (
        <ul style={styles.teacherCodeList}>
          {codes.length ? (
            codes.map((item) => (
              <li key={item.code} style={styles.teacherCodeItem}>
                <div>
                  <strong>{item.code}</strong>
                  <p style={styles.teacherCodeMeta}>
                    {item.active ? '사용 가능' : item.usedBy ? '사용 완료' : '비활성화됨'} · 생성 {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
                {item.active ? (
                  <button type="button" style={styles.codeDeactivateButton} onClick={() => handleDeactivate(item.code)}>비활성화</button>
                ) : (
                  <span style={styles.teacherCodeBadge}>완료</span>
                )}
              </li>
            ))
          ) : (
            <li style={styles.teacherCodeEmpty}>아직 생성한 반 코드가 없어요.</li>
          )}
        </ul>
      )}

      <div style={styles.teacherStudentSection}>
        <h4 style={styles.teacherSectionTitle}>내 학생</h4>
        {students.length ? (
          <ul style={styles.teacherStudentList}>
            {students.map((student) => (
              <li key={student.id} style={styles.teacherStudentItem}>
                <div>
                  <strong>{student.name || student.username}</strong>
                  <p style={styles.teacherCodeMeta}>
                    학교 {student.school || '-'} · {student.grade ? `${student.grade}학년` : '학년 정보 없음'}
                  </p>
                </div>
                <span style={styles.teacherCodeBadge}>등록 {student.linkedAt ? new Date(student.linkedAt).toLocaleDateString() : ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={styles.membershipText}>등록된 학생이 아직 없어요.</p>
        )}
      </div>
    </div>
  );
};

const TeacherAnalyticsSection = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const [range, setRange] = useState('7');
  const [grade, setGrade] = useState('');
  const [membership, setMembership] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [data, setData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!isTeacher) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.teacher.analyticsOverview({ range, grade, membership });
      if (response?.success) {
        setData(response.data);
      } else {
        setError(response?.message || '반 학습 통계를 불러오지 못했어요.');
      }
    } catch (err) {
      setError(err?.message || '반 학습 통계를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, range, grade, membership]);

  const fetchStudentDetail = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      setDetailLoading(true);
      setDetailError('');
      const response = await api.teacher.analyticsStudent(studentId, { range });
      if (response?.success) {
        setStudentDetail(response.data);
      } else {
        setDetailError(response?.message || '학생 상세 통계를 불러오지 못했어요.');
      }
    } catch (err) {
      setDetailError(err?.message || '학생 상세 통계를 불러오지 못했어요.');
    } finally {
      setDetailLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!data?.students?.length) {
      setSelectedStudentId(null);
      setStudentDetail(null);
      setDetailError('');
      return;
    }
    if (selectedStudentId) {
      const exists = data.students.some((student) => student.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(null);
        setStudentDetail(null);
        setDetailError('');
      }
    }
  }, [data, selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetail(null);
      setDetailError('');
      return;
    }
    fetchStudentDetail(selectedStudentId);
  }, [selectedStudentId, fetchStudentDetail]);

  if (!isTeacher) {
    return null;
  }

  const summary = data?.summary;
  const students = data?.students || [];
  const byType = data?.byType || [];
  const daily = data?.daily || [];

  const handleExport = async () => {
    if (!students.length || exporting) return;
    try {
      setExporting(true);
      setError('');
      const csv = await api.teacher.analyticsExport({ range, grade, membership });
      if (!csv) {
        throw new Error('CSV 데이터를 받지 못했어요.');
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const parts = ['loe-class-analytics', `${range}d`];
      if (grade) parts.push(`g${grade}`);
      if (membership) parts.push(membership);
      link.href = url;
      link.setAttribute('download', `${parts.join('-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 500);
    } catch (err) {
      setError(err?.message || 'CSV 내보내기에 실패했어요.');
    } finally {
      setExporting(false);
    }
  };

  const handleSelectStudent = (studentId) => {
    if (selectedStudentId === studentId) {
      setSelectedStudentId(null);
      return;
    }
    setSelectedStudentId(studentId);
  };

  const formatPercent = (value) => (value || value === 0 ? `${Number(value).toFixed(1)}%` : '-');
  const formatCount = (value) => (Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '-');
  const formatSeconds = (value) => {
    if (value || value === 0) {
      const numberValue = Number(value);
      if (!Number.isNaN(numberValue)) {
        const rounded = Math.round(numberValue * 10) / 10;
        return `${rounded.toLocaleString()}초`;
      }
    }
    return '-';
  };
  const formatMembership = (value) => {
    const key = String(value || '').toLowerCase();
    if (key === 'free') return '무료';
    if (key === 'basic') return '베이직';
    if (key === 'premium') return '프리미엄';
    if (key === 'pro') return '프로';
    return value || '-';
  };
  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
  };

  return (
    <div style={styles.analyticsCard}>
      <div style={styles.analyticsHeader}>
        <h3 style={styles.analyticsTitle}>📊 반 학습 대시보드</h3>
        <button
          type="button"
          style={{
            ...styles.analyticsButton,
            ...(exporting || !students.length ? styles.analyticsButtonDisabled : {})
          }}
          onClick={handleExport}
          disabled={exporting || !students.length}
        >
          {exporting ? '내보내는 중...' : 'CSV 다운로드'}
        </button>
      </div>

      <div style={styles.analyticsFilters}>
        <div style={styles.analyticsFilterGroup}>
          <label style={styles.analyticsFilterLabel}>기간</label>
          <select style={styles.analyticsSelect} value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
            <option value="180">최근 180일</option>
          </select>
        </div>
        <div style={styles.analyticsFilterGroup}>
          <label style={styles.analyticsFilterLabel}>학년</label>
          <select style={styles.analyticsSelect} value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">전체</option>
            <option value="1">고1</option>
            <option value="2">고2</option>
            <option value="3">고3</option>
          </select>
        </div>
        <div style={styles.analyticsFilterGroup}>
          <label style={styles.analyticsFilterLabel}>멤버십</label>
          <select style={styles.analyticsSelect} value={membership} onChange={(event) => setMembership(event.target.value)}>
            <option value="">전체</option>
            <option value="free">무료</option>
            <option value="basic">베이직</option>
            <option value="premium">프리미엄</option>
            <option value="pro">프로</option>
          </select>
        </div>
      </div>

      {error && <p style={styles.analyticsError}>{error}</p>}

      {loading ? (
        <p style={styles.analyticsInfo}>데이터를 불러오는 중이에요...</p>
      ) : !students.length ? (
        <p style={styles.analyticsInfo}>아직 통계가 없어요. 학생들이 문제를 풀면 자동으로 채워질 거예요!</p>
      ) : (
        <>
          {summary && (
            <div style={styles.analyticsSummaryRow}>
              <div style={styles.analyticsSummaryCard}>
                <span style={styles.analyticsSummaryLabel}>총 학생</span>
                <strong style={styles.analyticsSummaryValue}>{formatCount(summary.totalStudents)}</strong>
              </div>
              <div style={styles.analyticsSummaryCard}>
                <span style={styles.analyticsSummaryLabel}>활동 학생</span>
                <strong style={styles.analyticsSummaryValue}>{formatCount(summary.activeStudents)}</strong>
              </div>
              <div style={styles.analyticsSummaryCard}>
                <span style={styles.analyticsSummaryLabel}>문항 시도</span>
                <strong style={styles.analyticsSummaryValue}>{formatCount(summary.totalAttempts)}</strong>
              </div>
              <div style={styles.analyticsSummaryCard}>
                <span style={styles.analyticsSummaryLabel}>평균 정답률</span>
                <strong style={styles.analyticsSummaryValue}>{formatPercent(summary.accuracy)}</strong>
              </div>
              <div style={styles.analyticsSummaryCard}>
                <span style={styles.analyticsSummaryLabel}>평균 풀이 시간</span>
                <strong style={styles.analyticsSummaryValue}>{formatSeconds(summary.avgTimeSeconds)}</strong>
              </div>
            </div>
          )}

          <div style={styles.analyticsTableWrapper}>
            <table style={styles.analyticsTable}>
              <thead>
                <tr>
                  <th style={styles.analyticsTableHead}>학생</th>
                  <th style={styles.analyticsTableHead}>학년</th>
                  <th style={styles.analyticsTableHead}>멤버십</th>
                  <th style={styles.analyticsTableHead}>시도</th>
                  <th style={styles.analyticsTableHead}>정답률</th>
                  <th style={styles.analyticsTableHead}>최근 학습</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  return (
                    <tr
                      key={student.id}
                      style={{
                        ...styles.analyticsTableRow,
                        ...(isSelected ? styles.analyticsTableRowSelected : {})
                      }}
                      onClick={() => handleSelectStudent(student.id)}
                    >
                      <td style={styles.analyticsTableCell}>{student.name}</td>
                      <td style={styles.analyticsTableCell}>{student.grade ? `고${student.grade}` : '-'}</td>
                      <td style={styles.analyticsTableCell}>{formatMembership(student.membership)}</td>
                      <td style={styles.analyticsTableCell}>{formatCount(student.attempts)}</td>
                      <td style={styles.analyticsTableCell}>{formatPercent(student.accuracy)}</td>
                      <td style={styles.analyticsTableCell}>{formatDate(student.lastActivity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={styles.analyticsTwoColumn}>
            <div style={styles.analyticsPanel}>
              <h4 style={styles.analyticsPanelTitle}>유형별 정답률</h4>
              <ul style={styles.analyticsList}>
                {byType.length ? (
                  byType.map((item) => (
                    <li key={item.type} style={styles.analyticsListItem}>
                      <span>{item.type}</span>
                      <span>{formatPercent(item.accuracy)} · {formatCount(item.total)}문항</span>
                    </li>
                  ))
                ) : (
                  <li style={styles.analyticsListItem}>아직 유형별 데이터가 없어요.</li>
                )}
              </ul>
            </div>
            <div style={styles.analyticsPanel}>
              <h4 style={styles.analyticsPanelTitle}>최근 {Number(range)}일 학습 흐름</h4>
              <ul style={styles.analyticsList}>
                {daily.slice(-7).map((item) => (
                  <li key={item.date} style={styles.analyticsListItem}>
                    <span>{item.date}</span>
                    <span>{formatPercent(item.accuracy)} · {formatCount(item.total)}문항</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {selectedStudentId && (
        <div style={styles.analyticsDetailCard}>
          <div style={styles.analyticsDetailHeader}>
            <h4 style={styles.analyticsDetailTitle}>학생 상세</h4>
            <button
              type="button"
              style={styles.analyticsDetailClose}
              onClick={() => setSelectedStudentId(null)}
            >
              닫기
            </button>
          </div>

          {detailLoading ? (
            <p style={styles.analyticsInfo}>학생 데이터를 불러오는 중이에요...</p>
          ) : detailError ? (
            <p style={styles.analyticsError}>{detailError}</p>
          ) : studentDetail ? (
            <div>
              <div style={styles.analyticsDetailSummary}>
                <div>
                  <span style={styles.analyticsSummaryLabel}>학생</span>
                  <strong style={styles.analyticsSummaryValue}>{studentDetail.student.name}</strong>
                </div>
                <div>
                  <span style={styles.analyticsSummaryLabel}>정답률</span>
                  <strong style={styles.analyticsSummaryValue}>{formatPercent(studentDetail.summary.accuracy)}</strong>
                </div>
                <div>
                  <span style={styles.analyticsSummaryLabel}>시도</span>
                  <strong style={styles.analyticsSummaryValue}>{formatCount(studentDetail.summary.attempts)}</strong>
                </div>
                <div>
                  <span style={styles.analyticsSummaryLabel}>최근 학습</span>
                  <strong style={styles.analyticsSummaryValue}>{formatDate(studentDetail.summary.lastActivity)}</strong>
                </div>
                <div>
                  <span style={styles.analyticsSummaryLabel}>평균 풀이 시간</span>
                  <strong style={styles.analyticsSummaryValue}>{formatSeconds(studentDetail.summary.avgTimeSeconds)}</strong>
                </div>
                <div>
                  <span style={styles.analyticsSummaryLabel}>멤버십</span>
                  <strong style={styles.analyticsSummaryValue}>{formatMembership(studentDetail.student.membership)}</strong>
                </div>
              </div>

              <div style={styles.analyticsTwoColumn}>
                <div style={styles.analyticsPanel}>
                  <h4 style={styles.analyticsPanelTitle}>유형별</h4>
                  <ul style={styles.analyticsList}>
                    {studentDetail.byType.length ? (
                      studentDetail.byType.map((item) => (
                        <li key={item.type} style={styles.analyticsListItem}>
                          <span>{item.type}</span>
                          <span>{formatPercent(item.accuracy)} · {formatCount(item.total)}문항</span>
                        </li>
                      ))
                    ) : (
                      <li style={styles.analyticsListItem}>아직 유형별 데이터가 없어요.</li>
                    )}
                  </ul>
                </div>
                <div style={styles.analyticsPanel}>
                  <h4 style={styles.analyticsPanelTitle}>최근 시도</h4>
                  <ul style={styles.analyticsList}>
                    {studentDetail.recentAttempts.length ? (
                      studentDetail.recentAttempts.slice(0, 5).map((attempt) => (
                        <li key={attempt.id} style={styles.analyticsListItem}>
                          <span>{formatDate(attempt.date)} · {attempt.type}</span>
                          <span>{attempt.isCorrect ? '정답' : '오답'} · {formatSeconds(attempt.timeSpent)}</span>
                        </li>
                      ))
                    ) : (
                      <li style={styles.analyticsListItem}>아직 최근 풀이 기록이 없어요.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <p style={styles.analyticsInfo}>학생 데이터를 불러올 수 없어요.</p>
          )}
        </div>
      )}
    </div>
  );
};

const StudentJoinCard = () => {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null);

  if (user?.role !== 'student') {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setMessage({ type: 'error', text: '반 코드를 입력해 주세요.' });
      return;
    }
    try {
      setMessage({ type: 'info', text: '반 코드를 확인하는 중이에요...' });
      const response = await api.teacher.join(trimmed);
      if (response?.success) {
        setMessage({ type: 'success', text: response.message || '선생님 반에 등록되었어요!' });
        setCode('');
      } else {
        setMessage({ type: 'error', text: response?.message || '반 코드 등록에 실패했어요.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || '반 코드 등록에 실패했어요.' });
    }
  };

  return (
    <div style={styles.studentJoinCard}>
      <h3 style={styles.membershipTitle}>선생님 반 코드 등록</h3>
      <p style={styles.membershipText}>선생님께 받은 코드를 입력하면 선생님이 학습 진행 상황을 확인할 수 있어요.</p>
      <form style={styles.studentJoinForm} onSubmit={handleSubmit}>
        <input
          style={styles.studentJoinInput}
          type="text"
          value={code}
          placeholder="예) CL-ABC123"
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
        <button type="submit" style={styles.studentJoinButton}>반에 등록</button>
      </form>
      {message && (
        <div
          style={{
            ...styles.redeemMessage,
            ...(message.type === 'success'
              ? styles.redeemSuccess
              : message.type === 'error'
                ? styles.redeemError
                : styles.redeemInfo)
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};



export default ProfilePage;
