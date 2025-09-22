import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import tierConfig from '../config/tierConfig.json';

const ProfilePage = () => {
  const { user } = useAuth();
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

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
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
    background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
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
    borderColor: '#3B82F6',
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
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: '15px',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
  },
  pointsDisplay: {
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
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
    color: '#CBD5E1',
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
    background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
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
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  cardValue: {
    fontSize: '18px',
    color: '#F8FAFC',
    fontWeight: '700'
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
    color: '#F8FAFC',
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
    color: '#F8FAFC',
    fontWeight: '600'
  },
  benefitIcon: {
    fontSize: '20px',
    filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))'
  }
};

export default ProfilePage;