/**
 * RankingPage 컴포넌트
 * 랭킹 및 리더보드 페이지
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import tierConfig from '../config/tierConfig.json';
import { api } from '../services/api.service';
import logger from '../utils/logger';
import EagleGuideChip from '../components/common/EagleGuideChip';
import CommonHero from '../components/common/CommonHero';

const TIER_EMBLEMS = {
  iron: '🪨',
  bronze: '💩',
  silver: '🛡️',
  gold: '✨',
  platinum: '💠',
  diamond: '💎',
  master: '👑',
  challenger: '🌌'
};

const RankingPage = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [leaderboardMeta, setLeaderboardMeta] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [tierDistribution, setTierDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('leaderboard');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  const getTierInfo = useCallback((points) => {
    return tierConfig.tiers.find(tier => 
      points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
    ) || tierConfig.tiers[0];
  }, []);

  const getNextTier = useCallback((currentTier) => {
    const currentIndex = tierConfig.tiers.findIndex(t => t.id === currentTier.id);
    return tierConfig.tiers[currentIndex + 1] || null;
  }, []);

  const computeProgressToNext = useCallback((points, tier, nextTier) => {
    if (!tier) return 0;
    if (!nextTier) return 100;
    const range = (nextTier.minLP || 0) - (tier.minLP || 0);
    if (range <= 0) return 100;
    const progress = (Number(points) || 0) - (tier.minLP || 0);
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, []);

  const loadRankingData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [leaderboardRes, myRankRes, tierRes] = await Promise.all([
        api.ranking.leaderboard({ limit: 100 }),
        api.ranking.myRank(),
        api.ranking.tierDistribution()
      ]);

      const leaderboard = Array.isArray(leaderboardRes?.rankings)
        ? leaderboardRes.rankings.map((entry) => ({
            ...entry,
            tier: entry.tier || getTierInfo(entry.points || 0)
          }))
        : [];

      setRankings(leaderboard);
      setLeaderboardMeta(leaderboardRes?.metadata || null);

      const resolvedMyRank = (() => {
        if (!myRankRes?.myRank) {
          const fallbackTier = getTierInfo(user?.points || 0);
          if ((user?.points || 0) <= 0) return null;
          return {
            rank: leaderboardRes?.currentUser?.rank || null,
            points: user?.points || 0,
            tier: fallbackTier,
            nextTier: getNextTier(fallbackTier),
            progressToNext: computeProgressToNext(user?.points || 0, fallbackTier, getNextTier(fallbackTier)),
            name: user?.name || '나'
          };
        }

        const tier = myRankRes.myRank.tier || getTierInfo(myRankRes.myRank.points || 0);
        const nextTier = myRankRes.myRank.nextTier || getNextTier(tier);
        return {
          ...myRankRes.myRank,
          tier,
          nextTier,
          name: myRankRes.myRank.name || user?.name || '나',
          progressToNext: myRankRes.myRank.progressToNext ?? computeProgressToNext(myRankRes.myRank.points || 0, tier, nextTier)
        };
      })();

      const nearbyUsers = Array.isArray(myRankRes?.nearbyUsers)
        ? myRankRes.nearbyUsers.map((entry) => ({
            ...entry,
            tier: entry.tier || getTierInfo(entry.points || 0)
          }))
        : [];

      setMyRank({
        rank: resolvedMyRank?.rank || leaderboardRes?.currentUser?.rank || null,
        myRank: resolvedMyRank,
        nearbyUsers
      });

      const distribution = Array.isArray(tierRes?.distribution)
        ? tierRes.distribution.map((item) => ({
            ...item,
            percentage: Number(item.percentage) || 0,
            count: Number(item.count) || 0
          }))
        : [];
      setTierDistribution(distribution);
    } catch (fetchError) {
      logger.error('Failed to load ranking data:', fetchError);
      setError(fetchError?.message || '랭킹 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [computeProgressToNext, getNextTier, getTierInfo, user?.name, user?.points]);

  useEffect(() => {
    loadRankingData();
  }, [loadRankingData]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatPoints = useCallback((points) => {
    const numeric = Number(points) || 0;
    return numeric.toLocaleString();
  }, []);

  const getRankDisplay = (rank) => {
    if (!rank || rank < 1) {
      return <span style={styles.rank}>—</span>;
    }
    if (rank <= 3) {
      const medals = ['🥇', '🥈', '🥉'];
      return <span style={styles.medal}>{medals[rank - 1]}</span>;
    }
    return <span style={styles.rank}>#{rank}</span>;
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>랭킹 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <CommonHero
        badge="Ranking Arena"
        title="실시간 랭킹, 오늘의 주인공은 누구?"
        subtitle="LP를 모아 티어를 올려요. 상위권 카드에는 고급 연출을 살짝 더했어요."
      />
      <div style={{ marginTop: '6px' }}>
        <EagleGuideChip text="실시간 LP 순위를 자동으로 모으고 있어요" variant="accent" />
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button type="button" style={styles.retryButton} onClick={loadRankingData}>
            다시 시도하기
          </button>
        </div>
      )}

      {/* 탭 선택 */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'leaderboard' ? styles.tabActive : {})
          }}
          onClick={() => setSelectedTab('leaderboard')}
        >
          🏆 리더보드
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'myrank' ? styles.tabActive : {})
          }}
          onClick={() => setSelectedTab('myrank')}
        >
          📊 내 순위
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'tiers' ? styles.tabActive : {})
          }}
          onClick={() => setSelectedTab('tiers')}
        >
          💎 티어 분포
        </button>
      </div>

      {/* 리더보드 탭 */}
      {selectedTab === 'leaderboard' && (
        <div style={styles.content}>
          <EagleGuideChip text="상위권 플레이어를 눌러 자세한 정보를 볼 수 있어요" />
          <div style={styles.leaderboard}>
            <h2 style={{
              ...styles.sectionTitle,
              ...(isMobile ? styles.sectionTitleMobile : {})
            }}>상위 랭커 TOP 100</h2>
            {leaderboardMeta?.total && (
              <p style={styles.leaderboardMeta}>총 {leaderboardMeta.total.toLocaleString()}명의 플레이어가 경쟁 중이에요!</p>
            )}
            
            <div style={styles.rankingList}>
              {rankings.length === 0 && (
                <div style={styles.emptyState}>아직 랭킹에 올라온 플레이어가 없어요. 첫 주인공이 되어 볼까요? ✨</div>
              )}
              {rankings.map((ranker, index) => {
                const lpText = formatPoints(ranker.points);
                const handle = ranker.username || ranker.handle || ranker.userId || ranker.login || ranker.email || `ID:${ranker.id}`;
                const topNameStyle = index === 0
                  ? styles.top1Name
                  : index === 1
                  ? styles.top2Name
                  : index === 2
                  ? styles.top3Name
                  : {};
                const topCardStyle = index === 0
                  ? styles.top1Card
                  : index === 1
                  ? styles.top2Card
                  : index === 2
                  ? styles.top3Card
                  : {};
                const topGlowStyle = index === 0
                  ? styles.top1Glow
                  : index === 1
                  ? styles.top2Glow
                  : index === 2
                  ? styles.top3Glow
                  : null;
                const tierId = (ranker.tier?.id || '').toLowerCase();
                const tierEmblem = TIER_EMBLEMS[tierId] || '⭐';
                const tierBadgeStyle =
                  tierId === 'iron' ? styles.tierBadgeIron :
                  tierId === 'bronze' ? styles.tierBadgeBronze :
                  tierId === 'silver' ? styles.tierBadgeSilver :
                  tierId === 'gold' ? styles.tierBadgeGold :
                  tierId === 'platinum' ? styles.tierBadgePlatinum :
                  tierId === 'diamond' ? styles.tierBadgeDiamond :
                  tierId === 'master' ? styles.tierBadgeMaster :
                  tierId === 'challenger' ? styles.tierBadgeChallenger :
                  {};
                return (
                <div
                  key={ranker.id}
                  style={{
                    ...styles.rankingItem,
                    ...(ranker.id === user?.id ? styles.myRankingItem : {}),
                    ...(index < 3 ? styles.topRanker : {}),
                    ...topCardStyle,
                    ...(isMobile ? styles.rankingItemMobile : {})
                  }}
                  className="ui-pressable ui-elevate tilt-hover"
                >
                  {index === 0 && (
                    <span style={styles.topCrown} aria-hidden>👑</span>
                  )}
                  {topGlowStyle && (
                    <div style={{ ...styles.topRankAura, ...topGlowStyle }} aria-hidden />
                  )}
                  {index === 1 && (
                    <span style={{
                      position: 'absolute', left: '12px', top: '12px', width: '6px', height: '6px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)'
                    }} className="ui-sparkle" aria-hidden />
                  )}
                  {index === 2 && (
                    <span style={{
                      position: 'absolute', right: '12px', bottom: '10px', width: '6px', height: '6px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)'
                    }} className="ui-sparkle" aria-hidden />
                  )}
                  <div style={{
                    ...styles.rankInfo,
                    ...(isMobile ? styles.rankInfoMobile : {})
                  }}>
                    {getRankDisplay(ranker.rank)}
                    <div style={styles.userInfo}>
                      <div style={{
                        ...styles.userName,
                        ...topNameStyle,
                        ...(ranker.membership === 'premium' ? styles.userNamePremium : {}),
                        ...(ranker.membership === 'pro' ? styles.userNamePro : {})
                      }}>
                        {ranker.name} <span style={styles.userId}>({handle})</span>
                        {ranker.id === user?.id && <span style={styles.youBadge}>YOU</span>}
                      </div>
                      <div style={styles.userDetails}>
                        {ranker.school && `${ranker.school} • `}
                        {ranker.grade}학년
                        {ranker.isActive && <span style={styles.activeBadge}>활동 중</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    ...styles.tierInfo,
                    ...(isMobile ? styles.tierInfoMobile : {})
                  }}>
                    <div style={{ ...styles.tierBadge, ...tierBadgeStyle }}>
                      <span style={styles.tierEmblem}>{tierEmblem}</span>
                      <span style={{ color: ranker.tier.color }}>
                        {ranker.tier.icon}
                      </span>
                      <span style={styles.tierName}>
                        {ranker.tier.nameKr}
                      </span>
                    </div>
                    <div style={{
                      ...styles.points,
                      ...(isMobile ? styles.pointsMobile : {})
                    }}>
                      {lpText} LP
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 내 순위 탭 */}
      {selectedTab === 'myrank' && (
        <div style={styles.content}>
          <div style={styles.myRankSection}>
            <h2 style={{
              ...styles.sectionTitle,
              ...(isMobile ? styles.sectionTitleMobile : {})
            }}>내 순위 정보</h2>
            
            {myRank?.myRank ? (
              <>
                <div style={styles.myRankCard}>
                  <div style={styles.myRankHeader}>
                    {getRankDisplay(myRank.myRank.rank)}
                    <div>
                      <div style={{
                        ...styles.myRankName,
                        ...(user?.membership === 'premium' ? styles.userNamePremium : {}),
                        ...(user?.membership === 'pro' ? styles.userNamePro : {})
                      }}>{myRank.myRank.name}</div>
                      <div style={styles.myRankPoints}>
                        {formatPoints(myRank.myRank.points)} LP
                      </div>
                    </div>
                    <div style={styles.myTierBadge}>
                      <span style={{ color: myRank.myRank.tier.color, fontSize: '32px' }}>
                        {myRank.myRank.tier.icon}
                      </span>
                      <div style={styles.myTierName}>
                        {myRank.myRank.tier.nameKr}
                      </div>
                    </div>
                  </div>

                  {myRank.myRank.nextTier && (
                    <div style={styles.progressSection}>
                      <div style={styles.progressInfo}>
                        <span>다음 티어: {myRank.myRank.nextTier.nameKr}</span>
                        <span>
                          {Math.max(0, (myRank.myRank.nextTier.minLP || 0) - (myRank.myRank.points || 0))} LP 필요
                        </span>
                      </div>
                      <div style={styles.progressBar}>
                        <div 
                          style={{ 
                            ...styles.progressFill, 
                            width: `${Math.min(100, Math.max(0, myRank.myRank.progressToNext || 0))}%`,
                            background: myRank.myRank.tier.color 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {myRank.nearbyUsers?.length > 0 && (
                  <div style={styles.nearbyCard}>
                    <h3 style={styles.nearbyTitle}>내 주변 순위</h3>
                    <ul style={styles.nearbyList}>
                      {myRank.nearbyUsers.map((entry) => (
                        <li key={`nearby-${entry.rank}`} style={{ ...styles.nearbyItem, ...(entry.isMe ? styles.nearbyMe : {}) }}>
                          <span>{getRankDisplay(entry.rank)}</span>
                          <span style={styles.nearbyName}>{entry.isMe ? '나' : entry.name}</span>
                          <span style={{ ...styles.nearbyTier, color: entry.tier.color }}>
                            {entry.tier.icon} {entry.tier.nameKr}
                          </span>
                          <span style={styles.nearbyPoints}>{formatPoints(entry.points)} LP</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.noRank}>
                <div style={styles.noRankIcon}>📊</div>
                <div style={styles.noRankTitle}>아직 순위가 없습니다</div>
                <div style={styles.noRankDescription}>
                  문제를 풀어서 점수를 획득하고 랭킹에 진입해보세요!
                </div>
                <button
                  style={styles.startButton}
                  onClick={() => window.location.href = '/study'}
                >
                  🚀 학습 시작하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 티어 분포 탭 */}
      {selectedTab === 'tiers' && (
        <div style={styles.content}>
          <div style={styles.tierSection}>
            <h2 style={{
              ...styles.sectionTitle,
              ...(isMobile ? styles.sectionTitleMobile : {})
            }}>티어 분포</h2>
            
            <div style={styles.tierDistribution}>
              {tierDistribution.length === 0 && (
                <div style={styles.emptyState}>아직 집계된 티어 정보가 없어요. 계속 학습하면 데이터가 쌓일 거예요! 😊</div>
              )}
              {tierDistribution.map(tier => (
                <div key={tier.tier} style={styles.tierCard}>
                  <div style={styles.tierCardHeader}>
                    <span style={{ color: tier.color, fontSize: '24px' }}>
                      {tier.icon}
                    </span>
                    <div style={styles.tierCardInfo}>
                      <div style={styles.tierCardName}>{tier.tierKr}</div>
                      <div style={styles.tierCardCount}>
                        {tier.count.toLocaleString()}명 ({tier.percentage}%)
                      </div>
                    </div>
                  </div>
                  <div style={styles.tierProgressBar}>
                    <div
                      style={{
                        ...styles.tierProgressFill,
                        width: `${tier.percentage}%`,
                        background: tier.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    background: 'linear-gradient(135deg, var(--color-slate-900) 0%, var(--color-slate-650) 100%)',
    minHeight: '100vh',
    color: 'var(--surface-soft-solid)'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--surface-soft-muted)',
    borderTop: '4px solid var(--indigo)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  title: {
    fontSize: '36px',
    textAlign: 'center',
    marginBottom: '30px',
    background: 'var(--warning-gradient-strong)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 'bold'
  },
  tabs: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 18px',
    marginBottom: '20px',
    borderRadius: '14px',
    background: 'rgba(248, 113, 113, 0.18)',
    color: '#FECACA',
    border: '1px solid rgba(248, 113, 113, 0.45)'
  },
  retryButton: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: 'none',
    background: 'rgba(248, 113, 113, 0.85)',
    color: 'var(--text-on-accent)',
    cursor: 'pointer',
    fontWeight: 600
  },
  tab: {
    padding: '12px 24px',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
    wordBreak: 'keep-all'
  },
  tabActive: {
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
    color: 'var(--text-on-accent)'
  },
  content: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '30px',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--surface-border)'
  },
  sectionTitle: {
    fontSize: '24px',
    marginBottom: '25px',
    textAlign: 'center',
    color: 'var(--tone-hero)',
    wordBreak: 'keep-all'
  },
  sectionTitleMobile: {
    fontSize: '18px',
    whiteSpace: 'nowrap'
  },
  leaderboard: {
    width: '100%'
  },
  leaderboardMeta: {
    textAlign: 'center',
    marginBottom: '16px',
    color: 'var(--tone-strong)'
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  rankingListSlider: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '12px',
    scrollSnapType: 'x mandatory'
  },
  emptyState: {
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(148, 163, 184, 0.12)',
    textAlign: 'center',
    color: 'var(--tone-strong)'
  },
  rankingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,64,175,0.65) 100%)',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    transition: 'all 0.3s ease',
    color: '#f8fafc',
    textShadow: '0 3px 8px rgba(2, 6, 23, 0.45)',
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate',
    flexWrap: 'wrap',
    gap: '12px'
  },
  myRankingItem: {
    border: '2px solid var(--success)',
    boxShadow: '0 8px 25px var(--success-shadow)'
  },
  rankingItemMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%'
  },
  topRanker: {
    background: 'linear-gradient(135deg, rgba(255, 247, 210, 0.85), rgba(252, 211, 77, 0.45))',
    border: '1px solid rgba(250, 204, 21, 0.45)',
    color: '#1f2937',
    textShadow: 'none'
  },
  top1Card: {
    background: 'linear-gradient(135deg, rgba(255, 247, 210, 0.25) 0%, rgba(255, 209, 102, 0.22) 45%, rgba(255, 170, 73, 0.18) 100%)',
    border: '1px solid rgba(255, 221, 136, 0.65)',
    boxShadow: '0 16px 45px rgba(255, 209, 102, 0.45)'
  },
  top2Card: {
    background: 'linear-gradient(135deg, rgba(226, 232, 240, 0.35) 0%, rgba(148, 163, 184, 0.25) 100%)',
    border: '1px solid rgba(203, 213, 225, 0.6)',
    boxShadow: '0 14px 40px rgba(148, 163, 184, 0.35)'
  },
  top3Card: {
    background: 'linear-gradient(135deg, rgba(251, 191, 108, 0.3) 0%, rgba(217, 119, 6, 0.18) 100%)',
    border: '1px solid rgba(251, 146, 60, 0.55)',
    boxShadow: '0 14px 38px rgba(217, 119, 6, 0.35)'
  },
  topRankAura: {
    position: 'absolute',
    inset: '-2px',
    borderRadius: 'inherit',
    opacity: 0.9,
    mixBlendMode: 'screen',
    pointerEvents: 'none',
    zIndex: 0,
    animation: 'rankPulse 6s ease-in-out infinite'
  },
  top1Glow: {
    background: 'radial-gradient(circle at 20% -10%, rgba(255, 255, 255, 0.6), rgba(255, 220, 120, 0.35) 30%, rgba(255, 165, 0, 0.05) 70%)'
  },
  top2Glow: {
    background: 'radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.55), rgba(186, 199, 216, 0.3) 35%, rgba(107, 114, 128, 0.08) 70%)'
  },
  top3Glow: {
    background: 'radial-gradient(circle at 50% -10%, rgba(255, 242, 213, 0.55), rgba(234, 179, 8, 0.28) 40%, rgba(146, 64, 14, 0.08) 75%)'
  },
  topCrown: {
    position: 'absolute',
    right: '10px',
    top: '8px',
    fontSize: '20px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
    animation: 'rankPulse 6s ease-in-out infinite',
    zIndex: 2
  },
  rankInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    position: 'relative',
    zIndex: 1,
    flex: '1 1 auto',
    minWidth: 0,
    flexWrap: 'wrap'
  },
  medal: {
    fontSize: '24px',
    minWidth: '40px'
  },
  rank: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fdfbf5',
    minWidth: '40px'
  },
  rankInfoMobile: {
    width: '100%',
    gap: '10px',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    position: 'relative',
    zIndex: 1,
    minWidth: 0
  },
  userName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    whiteSpace: 'normal',
    overflow: 'visible',
    textOverflow: 'clip',
    maxWidth: '100%',
    textShadow: '0 2px 8px rgba(2, 6, 23, 0.55)'
  },
  userId: {
    fontWeight: 600,
    color: 'rgba(226, 232, 240, 0.9)',
    fontSize: '13px',
    whiteSpace: 'normal',
    opacity: 0.9,
    wordBreak: 'break-word'
  },
  top1Name: {
    color: '#FFE29F',
    textShadow: '0 0 14px rgba(255, 226, 159, 0.65)'
  },
  top2Name: {
    color: '#E5E7EB',
    textShadow: '0 0 12px rgba(229, 231, 235, 0.55)'
  },
  top3Name: {
    color: '#FCD34D',
    textShadow: '0 0 12px rgba(252, 211, 77, 0.5)'
  },
  userDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'rgba(226, 232, 240, 0.65)',
    flexWrap: 'wrap'
  },
  activeBadge: {
    padding: '2px 8px',
    borderRadius: '999px',
    background: 'rgba(56, 189, 248, 0.2)',
    color: '#38BDF8',
    fontWeight: 600,
    fontSize: '10px'
  },
  youBadge: {
    background: 'var(--success)',
    color: 'var(--text-on-accent)',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  tierInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    position: 'relative',
    zIndex: 1,
    marginLeft: 'auto'
  },
  tierInfoMobile: {
    alignItems: 'flex-start',
    width: '100%',
    marginLeft: 0
  },
  tierBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
    backdropFilter: 'blur(6px)'
  },
  tierEmblem: {
    fontSize: '18px',
    filter: 'drop-shadow(0 2px 4px rgba(15, 23, 42, 0.25))'
  },
  tierBadgeIron: {
    background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.85) 0%, rgba(75, 85, 99, 0.9) 60%, rgba(55, 65, 81, 0.95) 100%)'
  },
  tierBadgeBronze: {
    background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.9) 0%, rgba(161, 113, 66, 0.92) 55%, rgba(120, 66, 9, 0.9) 100%)'
  },
  tierBadgeSilver: {
    background: 'linear-gradient(135deg, rgba(229, 231, 235, 0.9) 0%, rgba(148, 163, 184, 0.92) 60%, rgba(100, 116, 139, 0.88) 100%)'
  },
  tierBadgeGold: {
    background: 'linear-gradient(135deg, rgba(255, 214, 102, 0.95) 0%, rgba(249, 176, 34, 0.92) 65%, rgba(217, 119, 6, 0.88) 100%)'
  },
  tierBadgePlatinum: {
    background: 'linear-gradient(135deg, rgba(59, 196, 150, 0.95) 0%, rgba(16, 185, 129, 0.9) 55%, rgba(6, 148, 112, 0.85) 100%)'
  },
  tierBadgeDiamond: {
    background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.9) 0%, rgba(59, 130, 246, 0.9) 55%, rgba(29, 78, 216, 0.85) 100%)'
  },
  tierBadgeMaster: {
    background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.92) 0%, rgba(129, 140, 248, 0.9) 60%, rgba(99, 102, 241, 0.85) 100%)'
  },
  tierBadgeChallenger: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(250, 204, 21, 0.92) 50%, rgba(59, 130, 246, 0.9) 100%)'
  },
  tierName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--text-on-accent)',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
    wordBreak: 'keep-all'
  },
  points: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fcd34d'
  },
  pointsMobile: {
    alignSelf: 'flex-start'
  },
  myRankSection: {
    width: '100%'
  },
  myRankCard: {
    background: 'var(--surface-soft)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '25px',
    border: '2px solid var(--success)'
  },
  myRankHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px'
  },
  myRankName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--tone-hero)'
  },
  userNamePremium: {
    padding: '2px 10px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(203,213,225,0.25), rgba(148,163,184,0.15))',
    boxShadow: '0 0 0 1px rgba(203,213,225,0.6) inset, 0 8px 18px rgba(203,213,225,0.25)'
  },
  userNamePro: {
    padding: '2px 10px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(250,204,21,0.25), rgba(245,158,11,0.15))',
    boxShadow: '0 0 0 1px rgba(250,204,21,0.7) inset, 0 10px 22px rgba(245,158,11,0.35)'
  },
  myRankPoints: {
    fontSize: '16px',
    color: 'var(--warning-strong)',
    fontWeight: 'bold'
  },
  myTierBadge: {
    marginLeft: 'auto',
    textAlign: 'center'
  },
  myTierName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--tone-hero)',
    marginTop: '5px'
  },
  progressSection: {
    marginTop: '20px'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '14px',
    color: 'var(--tone-muted)'
  },
  progressBar: {
    height: '10px',
    background: 'var(--color-slate-700)',
    borderRadius: '5px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  nearbyCard: {
    marginTop: '24px',
    padding: '20px',
    borderRadius: '16px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)'
  },
  nearbyTitle: {
    marginBottom: '12px',
    fontSize: '18px',
    fontWeight: 700,
    textAlign: 'left',
    color: 'var(--text-primary)'
  },
  nearbyList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gap: '10px'
  },
  nearbyItem: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 110px 110px',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'rgba(148, 163, 184, 0.12)',
    color: 'var(--tone-strong)'
  },
  nearbyMe: {
    background: 'rgba(59, 130, 246, 0.18)',
    border: '1px solid rgba(59, 130, 246, 0.35)'
  },
  nearbyName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'keep-all'
  },
  nearbyTier: {
    fontWeight: 600
  },
  nearbyPoints: {
    fontWeight: 600,
    color: 'var(--tone-strong)'
  },
  noRank: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  noRankIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  noRankTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--tone-hero)',
    marginBottom: '10px'
  },
  noRankDescription: {
    fontSize: '16px',
    color: 'var(--tone-muted)',
    marginBottom: '30px'
  },
  startButton: {
    padding: '15px 30px',
    background: 'linear-gradient(135deg, var(--success-strong) 0%, var(--success-deep) 100%)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  tierSection: {
    width: '100%'
  },
  tierDistribution: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  tierCard: {
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(248, 250, 252, 0.1)'
  },
  tierCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  tierCardInfo: {
    flex: 1
  },
  tierCardName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--surface-soft-solid)'
  },
  tierCardCount: {
    fontSize: '14px',
    color: 'var(--surface-soft-solid)'
  },
  tierProgressBar: {
    height: '6px',
    background: 'var(--color-slate-700)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  tierProgressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  }
};

export default RankingPage;
