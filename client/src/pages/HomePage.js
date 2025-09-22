import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import tierConfig from '../config/tierConfig.json';

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const getTierInfo = () => {
    const points = user?.points || 0;
    return tierConfig.tiers.find(
      (tier) => points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
    ) || tierConfig.tiers[0];
  };

  const getNextTier = () => {
    const current = getTierInfo();
    const index = tierConfig.tiers.findIndex((tier) => tier.id === current.id);
    return tierConfig.tiers[index + 1] || null;
  };

  const progressToNextTier = () => {
    const current = getTierInfo();
    const next = getNextTier();
    if (!next) return 100;

    const points = user?.points || 0;
    const range = next.minLP - current.minLP;
    const progress = points - current.minLP;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  };

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner} />
        <p>대시보드를 준비하고 있어요…</p>
      </div>
    );
  }

  const currentTier = getTierInfo();
  const nextTier = getNextTier();
  const progress = progressToNextTier();

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
          <StatCard label="총 학습 세션" value={stats?.totalSessions ?? 0} suffix="회" />
          <StatCard label="정답률" value={stats?.accuracy ?? 0} suffix="%" />
          <StatCard label="누적 문제 수" value={stats?.totalProblems ?? 0} suffix="문" />
          <StatCard label="지난 7일 학습" value={stats?.weeklySessions ?? 0} suffix="회" />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>바로 시작하기</h2>
        <div style={styles.quickGrid}>
          <QuickButton label="CSAT 세트 생성" description="문제 5세트를 바로 생성" onClick={() => (window.location.href = '/study')} />
          <QuickButton label="어휘 훈련" description="빈출 어휘로 연습하기" onClick={() => (window.location.href = '/vocabulary')} />
          <QuickButton label="문서 업로드" description="새 교재를 등록하고 분석" onClick={() => (window.location.href = '/admin')} />
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ label, value, suffix }) => (
  <div style={styles.statCard}>
    <p style={styles.statLabel}>{label}</p>
    <p style={styles.statValue}>
      {Number(value || 0).toLocaleString()}
      {suffix && <span style={styles.statSuffix}>{suffix}</span>}
    </p>
  </div>
);

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
    padding: '24px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#111827'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    marginBottom: '32px'
  },
  tierCard: {
    background: '#FFFFFF',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
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
    color: '#6B7280'
  },
  progressBox: {
    marginTop: '20px'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#4B5563',
    marginBottom: '8px'
  },
  progressBar: {
    width: '100%',
    height: '12px',
    borderRadius: '6px',
    background: '#E5E7EB',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%'
  },
  maxTierMessage: {
    marginTop: '12px',
    color: '#10B981',
    fontWeight: 600
  },
  section: {
    marginTop: '36px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#111827'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  statCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '12px'
  },
  statValue: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: '#111827'
  },
  statSuffix: {
    fontSize: '16px',
    marginLeft: '4px',
    color: '#6B7280'
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(79, 70, 229, 0.35)',
    transition: 'transform 0.2s ease'
  },
  quickDescription: {
    fontSize: '14px',
    opacity: 0.9
  },
  loadingWrapper: {
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#4B5563'
  },
  spinner: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '4px solid #E5E7EB',
    borderTopColor: '#667eea',
    animation: 'spin 1s linear infinite'
  }
};

export default HomePage;
