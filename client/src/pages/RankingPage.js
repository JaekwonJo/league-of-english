/**
 * RankingPage 컴포넌트
 * 랭킹 및 리더보드 페이지
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import tierConfig from '../config/tierConfig.json';
import { api } from '../services/api.service';
import logger from '../utils/logger';

const RankingPage = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [leaderboardMeta, setLeaderboardMeta] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [tierDistribution, setTierDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('leaderboard');

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
      <h1 style={styles.title}>🏆 랭킹</h1>

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
          <div style={styles.leaderboard}>
            <h2 style={styles.sectionTitle}>상위 랭커 TOP 100</h2>
            {leaderboardMeta?.total && (
              <p style={styles.leaderboardMeta}>총 {leaderboardMeta.total.toLocaleString()}명의 플레이어가 경쟁 중이에요!</p>
            )}
            
            <div style={styles.rankingList}>
              {rankings.length === 0 && (
                <div style={styles.emptyState}>아직 랭킹에 올라온 플레이어가 없어요. 첫 주인공이 되어 볼까요? ✨</div>
              )}
              {rankings.map((ranker, index) => {
                const lpText = formatPoints(ranker.points);
                return (
                <div
                  key={ranker.id}
                  style={{
                    ...styles.rankingItem,
                    ...(ranker.id === user?.id ? styles.myRankingItem : {}),
                    ...(index < 3 ? styles.topRanker : {})
                  }}
                >
                  <div style={styles.rankInfo}>
                    {getRankDisplay(ranker.rank)}
                    <div style={styles.userInfo}>
                      <div style={{
                        ...styles.userName,
                        ...(ranker.membership === 'premium' ? styles.userNamePremium : {}),
                        ...(ranker.membership === 'pro' ? styles.userNamePro : {})
                      }}>
                        {ranker.name}
                        {ranker.id === user?.id && <span style={styles.youBadge}>YOU</span>}
                      </div>
                      <div style={styles.userDetails}>
                        {ranker.school && `${ranker.school} • `}
                        {ranker.grade}학년
                        {ranker.isActive && <span style={styles.activeBadge}>활동 중</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.tierInfo}>
                    <div style={styles.tierBadge}>
                      <span style={{ color: ranker.tier.color }}>
                        {ranker.tier.icon}
                      </span>
                      <span style={styles.tierName}>
                        {ranker.tier.nameKr}
                      </span>
                    </div>
                    <div style={styles.points}>
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
            <h2 style={styles.sectionTitle}>내 순위 정보</h2>
            
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
            <h2 style={styles.sectionTitle}>티어 분포</h2>
            
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
    marginBottom: '30px'
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
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600
  },
  tab: {
    padding: '12px 24px',
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
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
    color: 'var(--text-primary)'
  },
  leaderboard: {
    width: '100%'
  },
  leaderboardMeta: {
    textAlign: 'center',
    marginBottom: '16px',
    color: 'var(--text-secondary)'
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyState: {
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(148, 163, 184, 0.12)',
    textAlign: 'center',
    color: 'var(--text-secondary)'
  },
  rankingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'var(--surface-soft)',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    transition: 'all 0.3s ease'
  },
  myRankingItem: {
    border: '2px solid var(--success)',
    boxShadow: '0 8px 25px var(--success-shadow)'
  },
  topRanker: {
    background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(245, 158, 11, 0.2))',
    border: '1px solid rgba(250, 204, 21, 0.35)'
  },
  rankInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  medal: {
    fontSize: '24px',
    minWidth: '40px'
  },
  rank: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    minWidth: '40px'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  userName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  userDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-muted)'
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
    gap: '4px'
  },
  tierBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  tierName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  points: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--warning-strong)'
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
    color: 'var(--surface-soft-solid)'
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
    color: 'var(--surface-soft-solid)',
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
    color: 'var(--text-muted)'
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
    background: 'rgba(148, 163, 184, 0.12)'
  },
  nearbyMe: {
    background: 'rgba(59, 130, 246, 0.18)',
    border: '1px solid rgba(59, 130, 246, 0.35)'
  },
  nearbyName: {
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  nearbyTier: {
    fontWeight: 600
  },
  nearbyPoints: {
    fontWeight: 600,
    color: 'var(--text-secondary)'
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
    color: 'var(--surface-soft-solid)',
    marginBottom: '10px'
  },
  noRankDescription: {
    fontSize: '16px',
    color: 'var(--text-muted)',
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
    color: 'var(--text-muted)'
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
