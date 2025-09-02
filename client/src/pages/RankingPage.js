/**
 * RankingPage 컴포넌트
 * 랭킹 및 리더보드 페이지
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import tierConfig from '../config/tierConfig.json';
import logger from '../utils/logger';

const RankingPage = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [tierDistribution, setTierDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('leaderboard');

  useEffect(() => {
    loadRankingData();
  }, []);

  const loadRankingData = async () => {
    try {
      setLoading(true);
      
      // API 호출 (임시로 하드코딩된 데이터 사용)
      const mockRankings = [
        { id: 1, name: '김철수', username: 'chulsoo', points: 15000, school: '서울고등학교', grade: '3', tier: getTierInfo(15000), rank: 1 },
        { id: 2, name: '이영희', username: 'younghee', points: 12500, school: '부산고등학교', grade: '2', tier: getTierInfo(12500), rank: 2 },
        { id: 3, name: '박민수', username: 'minsu', points: 10000, school: '대구고등학교', grade: '3', tier: getTierInfo(10000), rank: 3 },
        // 더 많은 가상 데이터...
      ];
      
      setRankings(mockRankings);
      setMyRank({
        rank: user?.points > 0 ? 15 : null,
        myRank: {
          rank: 15,
          name: user?.name || '사용자',
          points: user?.points || 0,
          tier: getTierInfo(user?.points || 0),
          nextTier: getNextTier(getTierInfo(user?.points || 0)),
          progressToNext: 45
        },
        nearbyUsers: mockRankings.slice(12, 18) // 주변 순위
      });
      
      const mockTierDistribution = tierConfig.tiers.map((tier, index) => ({
        tier: tier.name,
        tierKr: tier.nameKr,
        icon: tier.icon,
        color: tier.color,
        count: Math.floor(Math.random() * 100) + 10,
        percentage: Math.floor(Math.random() * 20) + 5
      }));
      
      setTierDistribution(mockTierDistribution);
      
    } catch (error) {
      logger.error('Failed to load ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (points) => {
    return tierConfig.tiers.find(tier => 
      points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
    ) || tierConfig.tiers[0];
  };

  const getNextTier = (currentTier) => {
    const currentIndex = tierConfig.tiers.findIndex(t => t.id === currentTier.id);
    return tierConfig.tiers[currentIndex + 1] || null;
  };

  const formatPoints = (points) => {
    return points.toLocaleString();
  };

  const getRankDisplay = (rank) => {
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
            
            <div style={styles.rankingList}>
              {rankings.map((ranker, index) => (
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
                      <div style={styles.userName}>
                        {ranker.name}
                        {ranker.id === user?.id && <span style={styles.youBadge}>YOU</span>}
                      </div>
                      <div style={styles.userDetails}>
                        {ranker.school && `${ranker.school} • `}
                        {ranker.grade}학년
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
                      {formatPoints(ranker.points)} LP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 내 순위 탭 */}
      {selectedTab === 'myrank' && (
        <div style={styles.content}>
          <div style={styles.myRankSection}>
            <h2 style={styles.sectionTitle}>내 순위 정보</h2>
            
            {myRank?.rank ? (
              <>
                <div style={styles.myRankCard}>
                  <div style={styles.myRankHeader}>
                    {getRankDisplay(myRank.myRank.rank)}
                    <div>
                      <div style={styles.myRankName}>{myRank.myRank.name}</div>
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
                          {myRank.myRank.nextTier.minLP - myRank.myRank.points} LP 필요
                        </span>
                      </div>
                      <div style={styles.progressBar}>
                        <div 
                          style={{ 
                            ...styles.progressFill, 
                            width: `${myRank.myRank.progressToNext}%`,
                            background: myRank.myRank.tier.color 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
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
              {tierDistribution.map(tier => (
                <div key={tier.tier} style={styles.tierCard}>
                  <div style={styles.tierCardHeader}>
                    <span style={{ color: tier.color, fontSize: '24px' }}>
                      {tier.icon}
                    </span>
                    <div style={styles.tierCardInfo}>
                      <div style={styles.tierCardName}>{tier.tierKr}</div>
                      <div style={styles.tierCardCount}>
                        {tier.count}명 ({tier.percentage}%)
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
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    minHeight: '100vh',
    color: '#F8FAFC'
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
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  title: {
    fontSize: '36px',
    textAlign: 'center',
    marginBottom: '30px',
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
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
  tab: {
    padding: '12px 24px',
    background: 'rgba(30, 41, 59, 0.8)',
    color: '#94A3B8',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
  },
  tabActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#F8FAFC'
  },
  content: {
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '20px',
    padding: '30px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(248, 250, 252, 0.1)'
  },
  sectionTitle: {
    fontSize: '24px',
    marginBottom: '25px',
    textAlign: 'center',
    color: '#F8FAFC'
  },
  leaderboard: {
    width: '100%'
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  rankingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '12px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    transition: 'all 0.3s ease'
  },
  myRankingItem: {
    border: '2px solid #10B981',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
  },
  topRanker: {
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
    border: '1px solid rgba(251, 191, 36, 0.3)'
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
    color: '#94A3B8',
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
    color: '#F8FAFC',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  userDetails: {
    fontSize: '12px',
    color: '#94A3B8'
  },
  youBadge: {
    background: '#10B981',
    color: 'white',
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
    color: '#F8FAFC'
  },
  points: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#F59E0B'
  },
  myRankSection: {
    width: '100%'
  },
  myRankCard: {
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '25px',
    border: '2px solid #10B981'
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
    color: '#F8FAFC'
  },
  myRankPoints: {
    fontSize: '16px',
    color: '#F59E0B',
    fontWeight: 'bold'
  },
  myTierBadge: {
    marginLeft: 'auto',
    textAlign: 'center'
  },
  myTierName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#F8FAFC',
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
    color: '#94A3B8'
  },
  progressBar: {
    height: '10px',
    background: '#374151',
    borderRadius: '5px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
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
    color: '#F8FAFC',
    marginBottom: '10px'
  },
  noRankDescription: {
    fontSize: '16px',
    color: '#94A3B8',
    marginBottom: '30px'
  },
  startButton: {
    padding: '15px 30px',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
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
    color: '#F8FAFC'
  },
  tierCardCount: {
    fontSize: '14px',
    color: '#94A3B8'
  },
  tierProgressBar: {
    height: '6px',
    background: '#374151',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  tierProgressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  }
};

export default RankingPage;