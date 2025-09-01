/**
 * HomePage 컴포넌트
 * 대시보드 메인 화면
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import logger from '../utils/logger';
import tierConfig from '../config/tierConfig.json';

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.problems.stats();
      setStats(data);
      logger.info('Dashboard data loaded', data);
    } catch (error) {
      logger.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  const tierInfo = getTierInfo();
  const nextTier = getNextTier();
  const progress = calculateProgress();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>안녕하세요, {user?.name}님! 👋</h1>
      
      {/* 티어 카드 */}
      {tierInfo.id === 'challenger' ? (
        <div className="challenger-master-container">
          <div className="challenger-legendary-badge">LEGENDARY</div>
          <div className="challenger-particles">
            <div className="challenger-particle"></div>
            <div className="challenger-particle"></div>
            <div className="challenger-particle"></div>
            <div className="challenger-particle"></div>
            <div className="challenger-particle"></div>
          </div>
          <div className="challenger-content">
            <div style={{textAlign: 'center', marginBottom: '20px'}}>
              <div className="challenger-crown">👑</div>
              <h1 className="challenger-title">CHALLENGER</h1>
            </div>
            <div className="challenger-points">
              {user?.points?.toLocaleString() || 0} LP
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.tierCard}>
          <div style={styles.tierHeader}>
            <span style={styles.tierIcon}>{tierInfo.icon}</span>
            <div>
              <h2 style={{ ...styles.tierName, color: tierInfo.color }}>
                {tierInfo.name}
              </h2>
              <p style={styles.points}>{user?.points || 0} LP</p>
            </div>
          </div>
        
          {nextTier && (
            <div style={styles.progressSection}>
              <div style={styles.progressInfo}>
                <span>다음 티어: {nextTier.name}</span>
                <span>{nextTier.minLP - user?.points} LP 필요</span>
              </div>
              <div style={styles.progressBar}>
                <div 
                  style={{ 
                    ...styles.progressFill, 
                    width: `${progress}%`,
                    background: tierInfo.color 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 통계 카드들 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>오늘 푼 문제</h3>
          <p style={styles.statValue}>{stats?.overall?.total || 0}</p>
          <p style={styles.statLabel}>문제</p>
        </div>

        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>정답률</h3>
          <p style={styles.statValue}>{stats?.overall?.accuracy || 0}%</p>
          <p style={styles.statLabel}>정확도</p>
        </div>

        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>평균 시간</h3>
          <p style={styles.statValue}>{stats?.overall?.avgTime || 0}</p>
          <p style={styles.statLabel}>초</p>
        </div>

        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>연속 학습</h3>
          <p style={styles.statValue}>7</p>
          <p style={styles.statLabel}>일</p>
        </div>
      </div>

      {/* 빠른 시작 버튼들 */}
      <div style={styles.quickStart}>
        <h2 style={styles.sectionTitle}>빠른 시작</h2>
        <div style={styles.buttonGrid}>
          <button 
            style={styles.quickButton}
            onClick={() => window.location.href = '/study'}
          >
            📚 문제 풀기
          </button>
          <button 
            style={styles.quickButton}
            onClick={() => window.location.href = '/vocabulary'}
          >
            📖 단어 시험
          </button>
          <button 
            style={styles.quickButton}
            onClick={() => window.location.href = '/stats'}
          >
            📊 통계 보기
          </button>
          <button 
            style={styles.quickButton}
            onClick={() => window.location.href = '/ranking'}
          >
            🏆 랭킹 확인
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
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
    fontSize: '32px',
    color: '#111827',
    marginBottom: '30px'
  },
  tierCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px'
  },
  tierIcon: {
    fontSize: '48px'
  },
  tierName: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0'
  },
  points: {
    fontSize: '18px',
    color: '#6B7280',
    margin: '5px 0'
  },
  progressSection: {
    marginTop: '20px'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#6B7280'
  },
  progressBar: {
    height: '10px',
    background: '#F3F4F6',
    borderRadius: '5px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)'
  },
  statTitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '10px 0'
  },
  statLabel: {
    fontSize: '12px',
    color: '#9CA3AF'
  },
  quickStart: {
    marginTop: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '20px',
    color: '#111827'
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  quickButton: {
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  }
};

export default HomePage;