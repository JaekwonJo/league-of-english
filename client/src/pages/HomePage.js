import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const HomePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState(null);
  const [showAllMenu, setShowAllMenu] = useState(false);

  useEffect(() => {
    // Mock mission logic for Phase 1
    // In real Phase 2/3, this will come from the backend based on study history
    const loadMission = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 600));
        setMission({
          type: 'vocabulary',
          title: '오늘의 단어 학습',
          subtitle: '하루 30단어, 꾸준함이 실력입니다.',
          action: 'start_vocab',
          progress: 0 // 0% started
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadMission();
  }, []);

  const handleMissionStart = () => {
    if (mission?.action === 'start_vocab') {
      window.location.href = '/vocabulary';
    }
  };

  const menuItems = [
    { icon: '🧠', title: '어휘 훈련', subtitle: '핵심 단어 마스터하기', color: '#8B5CF6', link: '/vocabulary' },
    { icon: '📊', title: '분석 자료', subtitle: '지문 심층 분석', color: '#3B82F6', link: '/analysis' },
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
      {/* Greeting Section */}
      <header style={styles.header}>
        <h1 style={styles.greeting}>
          반갑습니다, <span style={styles.nameAccent}>{user?.name || '사용자'}</span>님! 👋
        </h1>
        <p style={styles.subGreeting}>오늘도 목표를 향해 한 걸음 더 나아가볼까요?</p>
      </header>

      {/* Main Mission Card (Toss-style Single CTA) */}
      <main style={styles.mainSection}>
        <div 
          className="tilt-hover" 
          style={styles.missionCard} 
          onClick={handleMissionStart}
          role="button"
          tabIndex={0}
        >
          <div style={styles.missionBadge}>추천 학습</div>
          <div style={styles.missionContent}>
            <div style={styles.missionIcon}>📚</div>
            <div style={styles.missionText}>
              <h2 style={styles.missionTitle}>{mission?.title}</h2>
              <p style={styles.missionSubtitle}>{mission?.subtitle}</p>
            </div>
            <div style={styles.arrowIcon}>➜</div>
          </div>
          <div style={styles.missionProgress}>
            <div style={styles.progressBar}><div style={{width: '5%', height: '100%', background: 'var(--accent-primary)'}}></div></div>
            <span style={styles.progressText}>시작 전</span>
          </div>
        </div>
      </main>

      {/* Secondary Toggle for All Menus */}
      <div style={styles.menuToggleSection}>
        <button 
          style={styles.menuToggleButton} 
          onClick={() => setShowAllMenu(!showAllMenu)}
        >
          {showAllMenu ? '전체 메뉴 접기 ▲' : '다른 학습 메뉴 보기 ▼'}
        </button>
      </div>

      {/* Grid Menu (Hidden by default) */}
      {showAllMenu && (
        <section style={styles.menuGrid} className="fade-in-up">
          {menuItems.map((item) => (
            <div 
              key={item.title} 
              style={{...styles.menuItem, borderColor: item.color}}
              onClick={() => window.location.href = item.link}
            >
              <span style={{fontSize: '24px', marginRight: '12px'}}>{item.icon}</span>
              <div>
                <div style={styles.menuItemTitle}>{item.title}</div>
                <div style={styles.menuItemSub}>{item.subtitle}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px', // Mobile-first narrow width like an app
    margin: '0 auto',
    padding: '40px 20px',
    minHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    marginBottom: '40px',
    textAlign: 'left',
  },
  greeting: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  nameAccent: {
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subGreeting: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    margin: 0,
  },
  mainSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // Center vertically if space allows
    marginBottom: '40px',
  },
  missionCard: {
    background: 'rgba(30, 41, 59, 0.7)', // Dark glass
    backdropFilter: 'blur(16px)',
    borderRadius: '24px',
    padding: '32px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  missionBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(99, 102, 241, 0.2)',
    color: '#818CF8',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  missionContent: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  missionIcon: {
    fontSize: '48px',
    marginRight: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionText: {
    flex: 1,
  },
  missionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F8FAFC',
    margin: '0 0 6px 0',
  },
  missionSubtitle: {
    fontSize: '15px',
    color: '#94A3B8',
    margin: 0,
    lineHeight: '1.4',
  },
  arrowIcon: {
    fontSize: '24px',
    color: '#64748B',
    fontWeight: 'bold',
  },
  missionProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressText: {
    fontSize: '13px',
    color: '#64748B',
    fontWeight: '600',
  },
  menuToggleSection: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  menuToggleButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '10px',
    transition: 'color 0.2s',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
    paddingBottom: '40px',
  },
  menuItem: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid var(--surface-border)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s',
  },
  menuItemTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  menuItemSub: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  }
};

export default HomePage;
