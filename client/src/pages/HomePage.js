import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import tierConfig from '../config/tierConfig.json';
import CommonHero from '../components/common/CommonHero';

// 🎄 3D Christmas Tree Component (Enhanced)
const ChristmasTree3D = () => (
  <div className="christmas-tree-wrapper" aria-hidden="true" style={{
    position: 'absolute',
    right: '-50px',
    bottom: '-40px',
    transform: 'scale(1.5)', // Make it bigger!
    opacity: 0.9,
    pointerEvents: 'none',
    zIndex: 0
  }}>
    <div className="christmas-tree-3d">
      <div className="tree-star">⭐</div>
      <div className="tree-layer"></div>
      <div className="tree-layer"></div>
      <div className="tree-layer"></div>
      <div className="tree-layer"></div>
    </div>
  </div>
);

// ✨ Gemini Style Glass Card (Dark & Gold Theme)
const GeminiCard = ({ icon, title, subtitle, onClick, color, isNew }) => {
  return (
    <button
      className="tilt-hover"
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px',
        borderRadius: '24px',
        // Dark Glassmorphism
        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.2)', // Subtle Gold Border
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        minHeight: '160px',
        color: '#fff'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)'; // Bright Gold on Hover
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = `0 15px 40px ${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      }}
    >
      {isNew && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'linear-gradient(135deg, #FF0080 0%, #FF8C00 100%)',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '4px 8px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(255, 0, 128, 0.4)',
          animation: 'pulse 2s infinite'
        }}>
          NEW
        </div>
      )}
      <div
        style={{
          fontSize: '3.2rem',
          marginBottom: '16px',
          filter: `drop-shadow(0 0 15px ${color}80)`, // Neon Glow
          transition: 'transform 0.3s ease'
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.95rem', color: '#CBD5E1', opacity: 0.9, fontWeight: 500 }}>
        {subtitle}
      </div>
      {/* Background Gradient Effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: `radial-gradient(circle at top right, ${color}30, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    </button>
  );
};

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewQueue, setReviewQueue] = useState({ total: 0, problems: [] });
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, reviewData] = await Promise.all([
          api.problems.stats(),
          api.problems.reviewQueue({ limit: 3 })
        ]);
        setStats(statsData);
        setReviewQueue({
          total: Number(reviewData?.total) || 0,
          problems: Array.isArray(reviewData?.problems) ? reviewData.problems.slice(0, 3) : []
        });
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const statCards = [
    { label: '총 학습 세션', value: stats?.totalSessions ?? 0, suffix: '회' },
    { label: '정답률', value: stats?.accuracy ?? 0, suffix: '%', isPercent: true },
    { label: '누적 문제 수', value: stats?.totalProblems ?? 0, suffix: '문' },
    { label: '누적 정답 수', value: stats?.totalCorrect ?? 0, suffix: '문' },
    { label: '지난 7일 학습', value: stats?.weeklySessions ?? 0, suffix: '회' }
  ];

  const menuItems = [
    { icon: '🤖', title: 'AI 튜터 센터', subtitle: '제미나이 선생님과 1:1 과외', color: '#ec4899', link: '/ai-tutor', isNew: true },
    { icon: '🧠', title: '어휘 훈련', subtitle: '핵심 단어 마스터하기', color: '#8B5CF6', link: '/vocabulary' },
    { icon: '📘', title: '워크북', subtitle: '단계별 학습 코스', color: '#10B981', link: '/workbook' },
    { icon: '📝', title: '문제 풀이', subtitle: 'AI & 기출 믹스', color: '#F59E0B', link: '/study' },
    { icon: '🎓', title: '모의고사', subtitle: '실전 감각 익히기', color: '#EC4899', link: '/mock-exam' },
    { icon: '📺', title: '동영상', subtitle: '강의 영상 모음', color: '#EF4444', link: '/video' },
    { icon: '🏆', title: '랭킹', subtitle: '명예의 전당', color: '#FBBF24', link: '/ranking' },
    { icon: '📈', title: '통계', subtitle: '내 학습 리포트', color: '#6366F1', link: '/stats' },
    { icon: '👤', title: '프로필', subtitle: '계정 및 설정', color: '#64748B', link: '/users/profile' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Hero Section with 3D Tree */}
      <CommonHero
        badge="Winter Edition"
        title={`Merry Christmas,\n${user?.name || '관리자'}님! 🎅`}
        subtitle="따뜻한 연말, 하루 30분 투자로 완벽한 학습 루틴을 만들어보세요."
        right={<ChristmasTree3D />}
      >
        {/* No additional children needed here */}
      </CommonHero>

      {/* 3x3 Menu Grid */}
      <section style={styles.menuGrid}>
        {menuItems.map((item) => (
          <GeminiCard
            key={item.title}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            color={item.color}
            isNew={item.isNew}
            onClick={() => (window.location.href = item.link)}
          />
        ))}
      </section>

      {/* Tier & Stats Dashboard */}
      <section style={styles.dashboardSection}>
        <div style={styles.tierCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '4rem' }}>{currentTier.icon}</div>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: currentTier.color }}>{currentTier.name}</h2>
              <p style={{ fontSize: '1.2rem', margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                {(user?.points || 0).toLocaleString()} LP
              </p>
            </div>
          </div>
          
          {nextTier ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>다음 티어: {nextTier.name}</span>
                <span>{Math.max(0, nextTier.minLP - (user?.points || 0))} LP 남음</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'var(--surface-border)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: currentTier.color, transition: 'width 1s ease' }} />
              </div>
            </div>
          ) : (
            <p style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>최고 등급 달성! 축하합니다! 🎉</p>
          )}
        </div>

        <div style={styles.statsCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>오늘의 요약 🦅</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>페이스 체크</span>
          </div>
          <div style={styles.miniStatGrid}>
            {statCards.map((stat) => (
              <div key={stat.label} style={styles.miniStatItem}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {stat.isPercent ? stat.value.toFixed(1) : stat.value.toLocaleString()}
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '2px' }}>{stat.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px'
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', // Responsive grid
    gap: '20px',
    marginTop: '20px'
  },
  dashboardSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px'
  },
  tierCard: {
    background: 'var(--surface-card)',
    borderRadius: '24px',
    padding: '32px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 12px 36px rgba(0,0,0,0.05)'
  },
  statsCard: {
    background: 'var(--surface-card)',
    borderRadius: '24px',
    padding: '32px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 12px 36px rgba(0,0,0,0.05)'
  },
  miniStatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px'
  },
  miniStatItem: {
    padding: '16px',
    borderRadius: '16px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)'
  }
};

export default HomePage;