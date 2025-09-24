import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
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
    fontWeight: 700,
    color: '#f8fafc'
  },
  membershipText: {
    fontSize: '14px',
    color: '#94a3b8',
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
    color: '#cbd5f5'
  },
  membershipValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f1f5f9'
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
    color: '#e2e8f0',
    padding: '12px 16px',
    fontSize: '14px'
  },
  couponButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    color: '#ffffff',
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
    color: '#34d399'
  },
  redeemError: {
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#f87171'
  },
  redeemInfo: {
    background: 'rgba(96, 165, 250, 0.15)',
    color: '#60a5fa'
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
    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    color: '#0f172a',
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
    color: '#94a3b8',
    fontSize: '13px'
  },
  teacherCodeBadge: {
    background: 'rgba(148, 163, 184, 0.25)',
    borderRadius: '12px',
    padding: '6px 12px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: 600
  },
  teacherCodeEmpty: {
    color: '#94a3b8',
    fontSize: '13px',
    padding: '12px'
  },
  codeDeactivateButton: {
    borderRadius: '10px',
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#f87171',
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
    color: '#f8fafc'
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
    color: '#f8fafc'
  },
  analyticsButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    color: '#0f172a',
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
    color: '#94a3b8',
    fontWeight: 600
  },
  analyticsSelect: {
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: '14px'
  },
  analyticsError: {
    color: '#f87171',
    fontSize: '14px',
    margin: 0
  },
  analyticsInfo: {
    color: '#94a3b8',
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
    color: '#94a3b8',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  analyticsSummaryValue: {
    fontSize: '18px',
    color: '#f8fafc',
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
    color: '#94a3b8',
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
    color: '#e2e8f0',
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
    color: '#f1f5f9',
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
    color: '#e2e8f0',
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
    color: '#f8fafc',
    fontWeight: 700
  },
  analyticsDetailClose: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
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
    color: '#e2e8f0',
    padding: '12px 16px',
    fontSize: '14px'
  },
  studentJoinButton: {
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    color: '#ffffff',
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


const MembershipCard = () => {
  const { user, updateUser } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [message, setMessage] = useState(null);

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
        <p style={{ ...styles.membershipText, color: '#f87171' }}>{error}</p>
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

      {error && <p style={{ ...styles.membershipText, color: '#f87171' }}>{error}</p>}

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
                  <p style={styles.teacherCodeMeta}>학교 {student.school || '-'} · {student.grade ? ${student.grade}학년 : '학년 정보 없음'}</p>
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
