import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api.service';
import tierConfig from '../../config/tierConfig.json';

const palette = {
  success: 'var(--success)',
  successGradient: 'var(--success-gradient)',
  successGradientStrong: 'var(--success-gradient-strong)',
  successGradientDeep: 'var(--success-gradient-deep)',
  accent: 'var(--accent-primary)',
  accentGradient: 'var(--accent-hero-gradient)',
  warning: 'var(--warning-strong)',
  warningGradient: 'var(--warning-gradient)',
  warningGradientStrong: 'var(--warning-gradient-strong)',
  danger: 'var(--danger)',
  dangerGradient: 'var(--danger-gradient)',
  slateGradient: 'var(--slate-gradient)',
  slateSoftGradient: 'var(--slate-soft-gradient)',
  info: 'var(--info)',
  infoSoft: 'var(--info-soft)',
  infoGradient: 'var(--info-gradient)',
  gold: 'var(--color-gold-200)',
  orange: 'var(--color-orange-500)',
  championGradient: 'var(--champion-gradient)',
  championRadial: 'var(--champion-radial)',
  textInverse: 'var(--text-on-accent)',
  textMuted: 'var(--color-slate-400)',
  textSubtle: 'var(--color-slate-350)',
  textHighlight: 'var(--color-slate-75)',
  borderSoft: 'var(--border-subtle)',
  borderMuted: 'var(--border-muted)',
  accentBadge: 'var(--accent-badge-text)',
  accentPale: 'var(--accent-primary-pale)',
  dangerSoft: 'var(--danger-soft)',
  dangerStronger: 'var(--danger-stronger)',
  surfaceOverlay: 'var(--surface-translucent-strong)',
  surfaceGlass: 'var(--surface-translucent)',
  glassBorder: 'var(--glass-border)'
};

const StudyResult = ({ results, onRestart, onReview, onHome }) => {
  const { user } = useAuth();
  const [showAnimation, setShowAnimation] = useState(false);
  const [currentLpCount, setCurrentLpCount] = useState(0);
  const ensureNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const fallbackSummary = {
    total: ensureNumber(results?.totalProblems, 0),
    correct: ensureNumber(results?.totalCorrect, 0),
    accuracy: ensureNumber(results?.accuracy, 0),
    pointsDelta: ensureNumber(results?.earnedPoints, 0),
    totalPoints: ensureNumber(user?.points, 0)
  };
  fallbackSummary.incorrect = Math.max(0, fallbackSummary.total - fallbackSummary.correct);

  const summaryRaw = results?.summary || {};
  const summary = {
    total: ensureNumber(summaryRaw.total, fallbackSummary.total),
    correct: ensureNumber(summaryRaw.correct, fallbackSummary.correct),
    incorrect: ensureNumber(summaryRaw.incorrect, fallbackSummary.incorrect),
    accuracy: ensureNumber(summaryRaw.accuracy, fallbackSummary.accuracy),
    pointsDelta: ensureNumber(summaryRaw.pointsDelta, fallbackSummary.pointsDelta),
    totalPoints: ensureNumber(summaryRaw.totalPoints, fallbackSummary.totalPoints)
  };

  const pointsDelta = summary.pointsDelta;
  const totalPointsAfter = summary.totalPoints;
  const totalProblems = summary.total;
  const totalCorrect = summary.correct;
  const totalIncorrect = summary.incorrect;
  const totalTimeSeconds = ensureNumber(results?.totalTime, 0);
  const perTypeStats = Array.isArray(results?.stats?.perType) ? results.stats.perType : [];

  useEffect(() => {
    setShowAnimation(true);
    setCurrentLpCount(0);
    if (!pointsDelta) {
      setCurrentLpCount(0);
      return undefined;
    }
    const step = Math.max(1, Math.floor(Math.abs(pointsDelta) / 50));
    const direction = pointsDelta >= 0 ? 1 : -1;

    const interval = setInterval(() => {
      setCurrentLpCount((prev) => {
        const next = prev + direction * step;
        if ((direction > 0 && next >= pointsDelta) || (direction < 0 && next <= pointsDelta)) {
          clearInterval(interval);
          return pointsDelta;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [pointsDelta]);

  const typeLabelMap = {
    blank: '빈칸',
    order: '순서 배열',
    insertion: '문장 삽입',
    grammar: '어법',
    vocabulary: '어휘',
    title: '제목',
    theme: '주제',
    summary: '요약',
    implicit: '함축 의미',
    irrelevant: '무관 문장'
  };

  const formatTypeLabel = (type) => typeLabelMap[type] || type;

  const formatLpDelta = (value) => {
    if (!value) return '0';
    return value > 0 ? `+${value}` : `${value}`;
  };

  const getTierInfo = (pointsOverride) => {
    const points = pointsOverride !== undefined ? pointsOverride : user?.points || 0;
    return tierConfig.tiers.find(tier => 
      points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
    ) || tierConfig.tiers[0];
  };

  const getResultInfo = (accuracy) => {
    const acc = parseFloat(accuracy);
    if (acc >= 90) {
      return {
        grade: 'A+',
        color: palette.success,
        bgColor: palette.successGradient,
        message: '🎉 축하합니다! 완벽한 성과입니다!',
        effect: 'celebration',
        emoji: '🎊✨🏆'
      };
    }
    if (acc >= 80) {
      return {
        grade: 'A',
        color: palette.accent,
        bgColor: palette.accentGradient,
        message: '👏 잘했어요! 훌륭한 실력입니다!',
        effect: 'good',
        emoji: '👍🌟💪'
      };
    }
    if (acc >= 50) {
      return {
        grade: 'B',
        color: palette.warning,
        bgColor: palette.warningGradientStrong,
        message: '📈 좋아요! 조금만 더 노력하면 완벽해요!',
        effect: 'encourage',
        emoji: '💪📚🎯'
      };
    }
    return {
      grade: 'C',
      color: palette.danger,
      bgColor: palette.dangerGradient,
      message: '🤗 괜찮아요! 다시 도전해서 실력을 늘려보아요!',
      effect: 'comfort',
      emoji: '🤗💝🌈'
    };
  };

  const resultInfo = getResultInfo(summary.accuracy);
  const tierInfo = getTierInfo(totalPointsAfter);
  const detailResults = (results?.studyResults || results?.problems || []).map((item) => ({
    userAnswer: item.userAnswer ?? item.answer ?? '',
    correctAnswer: item.correctAnswer ?? item.problem?.answer ?? '',
    isCorrect: typeof item.isCorrect === 'boolean' ? item.isCorrect : (item.correct ?? false),
    timeSpent: item.timeSpent ?? item.elapsed ?? 0
  }));
  const [myRank, setMyRank] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [rankError, setRankError] = useState(null);

  useEffect(() => {
    if (results?.rank) {
      setMyRank(results.rank);
    }
  }, [results?.rank]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.ranking.myRank();
        setMyRank(data?.myRank || null);
        setNearby(data?.nearbyUsers || []);
      } catch (e) {
        setRankError('랭킹 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };
    load();
  }, []);

  return (
    <div style={styles.container}>
      {/* 이펙트 배경 */}
      <div style={{
        ...styles.effectBackground,
        ...(resultInfo.effect === 'celebration' ? styles.celebrationBg : {}),
        ...(resultInfo.effect === 'good' ? styles.goodBg : {}),
        ...(resultInfo.effect === 'encourage' ? styles.encourageBg : {}),
        ...(resultInfo.effect === 'comfort' ? styles.comfortBg : {})
      }}>
        <div style={styles.effectEmojis}>
          {resultInfo.emoji.split('').map((emoji, idx) => (
            <span 
              key={idx} 
              style={{
                ...styles.emoji,
                animationDelay: `${idx * 0.2}s`
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* 랭킹 섹션 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={styles.sectionTitle}>🏆 랭킹</div>
          {rankError && <div style={{ color: palette.danger, textAlign: 'center' }}>{rankError}</div>}
          {!rankError && (
            <div style={styles.rankPanel}>
              <div style={styles.myRankBox}>
                <div style={{ fontSize: '14px', color: palette.textMuted }}>내 랭킹</div>
                <div style={{ fontSize: '22px', color: palette.textHighlight, fontWeight: 800 }}>
                  {myRank?.rank ? `#${myRank.rank}` : '-'} · {(myRank?.points || 0).toLocaleString()} LP
                </div>
                <div style={{ fontSize: '13px', color: palette.textMuted }}>
                  티어: {myRank?.tier?.nameKr || myRank?.tier?.name || '-'}
                  {myRank?.nextTier && (
                    <>
                      {' · '}다음 티어까지 {Math.max(0, 100 - Math.round(myRank.progressToNext || 0))}%
                    </>
                  )}
                </div>
              </div>
              <div style={styles.nearbyBox}>
              <div style={{ fontSize: '14px', color: palette.textMuted, marginBottom: 6 }}>주변 랭킹</div>
                {nearby.length === 0 ? (
                  <div style={{ color: palette.textMuted }}>데이터 없음</div>
                ) : (
                  <div>
                    {nearby.map(u => (
                      <div key={u.id} style={styles.nearbyRow}>
                        <div style={{ width: 60, color: palette.textSubtle }}>#{u.rank}</div>
                        <div style={{ flex: 1, color: u.isMe ? palette.success : 'var(--color-slate-200)', fontWeight: u.isMe ? 700 : 500 }}>
                          {u.isMe ? '나' : (u.name || u.id)}
                        </div>
                        <div style={{ minWidth: 90, textAlign: 'right', color: 'var(--color-slate-200)' }}>{(u.points || 0).toLocaleString()} LP</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        ...styles.resultCard,
        ...(showAnimation ? styles.cardAnimation : {})
      }}>
        {/* 메인 결과 */}
        <div style={styles.mainResult}>
          <div style={{
            ...styles.gradeCircle,
            background: resultInfo.bgColor
          }}>
            <div style={styles.grade}>{resultInfo.grade}</div>
            <div style={styles.accuracy}>{results.accuracy}%</div>
          </div>
          <div style={styles.message}>{resultInfo.message}</div>
        </div>

        {/* 티어 정보 */}
        <div style={styles.tierSection}>
          {tierInfo.id === 'challenger' ? (
            <div className="challenger-result-container" style={styles.challengerContainer}>
              <div className="challenger-legendary-badge" style={styles.challengerBadge}>LEGENDARY</div>
              <div className="challenger-particles" style={styles.challengerParticles}>
                <div className="challenger-particle" style={{...styles.challengerParticle, left: '20%'}}></div>
                <div className="challenger-particle" style={{...styles.challengerParticle, left: '40%'}}></div>
                <div className="challenger-particle" style={{...styles.challengerParticle, left: '60%'}}></div>
                <div className="challenger-particle" style={{...styles.challengerParticle, left: '80%'}}></div>
              </div>
              <div style={styles.challengerContent}>
                <div className="challenger-crown" style={styles.challengerCrown}>👑</div>
                <h2 className="challenger-title" style={styles.challengerTitle}>CHALLENGER</h2>
                <div style={styles.challengerPoints}>{user?.points?.toLocaleString() || 0} LP</div>
              </div>
            </div>
          ) : (
            <div style={{
              ...styles.tierCard,
              borderColor: tierInfo.color,
              boxShadow: `0 0 30px ${tierInfo.color}40`
            }}>
              <div style={styles.tierHeader}>
                <span style={{...styles.tierIcon, filter: `drop-shadow(0 0 10px ${tierInfo.color})`}}>
                  {tierInfo.icon}
                </span>
                <div>
                  <h3 style={{...styles.tierName, color: tierInfo.color}}>
                    {tierInfo.nameKr}
                  </h3>
                  <div style={styles.tierPoints}>
                    {totalPointsAfter.toLocaleString()} LP
                    {pointsDelta !== 0 && (
                      <span
                        style={{
                          ...styles.tierDelta,
                          color: pointsDelta >= 0 ? palette.infoSoft : palette.dangerSoft
                        }}
                      >
                        {' '}({formatLpDelta(pointsDelta)} LP)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 상세 통계 */}
        <div style={styles.detailStats}>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statLabel}>정답</div>
            <div style={styles.statValue}>{totalCorrect}개</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>❌</div>
            <div style={styles.statLabel}>오답</div>
            <div style={styles.statValue}>{totalIncorrect}개</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>⏱️</div>
            <div style={styles.statLabel}>시간</div>
            <div style={styles.statValue}>{Math.floor(totalTimeSeconds / 60)}분 {totalTimeSeconds % 60}초</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>💎</div>
            <div style={styles.statLabel}>LP 획득</div>
            <div style={styles.statValue}>{formatLpDelta(currentLpCount)}</div>
          </div>
        </div>

        {perTypeStats.length > 0 && (
          <div style={styles.typeStats}>
            <h3 style={styles.sectionTitle}>📊 유형별 정답률</h3>
            <div style={styles.typeTable}>
              <div style={{ ...styles.typeRow, ...styles.typeHeader }}>
                <span>유형</span>
                <span>정답</span>
                <span>오답</span>
                <span>정답률</span>
              </div>
              {perTypeStats.map((entry) => (
                <div key={entry.type} style={styles.typeRow}>
                  <span>{formatTypeLabel(entry.type)}</span>
                  <span>{entry.correct.toLocaleString()}문</span>
                  <span>{entry.incorrect.toLocaleString()}문</span>
                  <span>{ensureNumber(entry.accuracy, 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 문제별 상세 결과 */}
        <div style={styles.problemResults}>
          <h3 style={styles.sectionTitle}>📋 문제별 상세 결과</h3>
          <div style={styles.problemGrid}>
            {detailResults.map((detail, idx) => (
              <div key={idx} style={{
                ...styles.problemCard,
                ...(detail.isCorrect ? styles.correctCard : styles.wrongCard)
              }}>
                <div style={styles.problemHeader}>
                  <span style={styles.problemNum}>#{idx + 1}</span>
                  <span style={detail.isCorrect ? styles.correctBadge : styles.wrongBadge}>
                    {detail.isCorrect ? '정답' : '오답'}
                  </span>
                </div>
                <div style={styles.problemDetails}>
                  <div style={styles.problemLabel}>내 답안:</div>
                  <div style={styles.problemAnswer}>{detail.userAnswer || '무응답'}</div>
                  {!detail.isCorrect && (
                    <>
                      <div style={styles.problemLabel}>정답:</div>
                      <div style={styles.correctAnswer}>{detail.correctAnswer || '-'}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={styles.actions}>
          {typeof onReview === 'function' && (
            <button 
              style={styles.reviewButton}
              onClick={onReview}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🔁 복습하기
            </button>
          )}
          <button 
            style={styles.restartButton} 
            onClick={onRestart}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            🔄 다시 풀기
          </button>
          <button 
            style={styles.homeButton} 
            onClick={onHome}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            🏠 홈으로
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    background: palette.slateGradient,
    padding: '20px',
    overflow: 'hidden'
  },
  effectBackground: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1
  },
  celebrationBg: {
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
    animation: 'pulse 2s infinite'
  },
  goodBg: {
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)'
  },
  encourageBg: {
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)'
  },
  comfortBg: {
    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)'
  },
  effectEmojis: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px'
  },
  emoji: {
    fontSize: '2rem',
    animation: 'bounce 2s infinite'
  },
  resultCard: {
    position: 'relative',
    zIndex: 10,
    maxWidth: '900px',
    margin: '0 auto',
    background: palette.surfaceOverlay,
    backdropFilter: 'blur(20px)',
    borderRadius: '25px',
    padding: '40px',
    boxShadow: '0 25px 50px rgba(15, 23, 42, 0.35)',
    border: '1px solid var(--glass-border)',
    opacity: 0,
    transform: 'translateY(50px)'
  },
  cardAnimation: {
    opacity: 1,
    transform: 'translateY(0)',
    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  mainResult: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  gradeCircle: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    margin: '0 auto 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)'
  },
  grade: {
    fontSize: '4rem',
    fontWeight: 'bold',
    color: palette.textInverse,
    textShadow: '0 4px 8px rgba(15, 23, 42, 0.35)'
  },
  accuracy: {
    fontSize: '1.5rem',
    color: palette.textInverse,
    fontWeight: 'bold',
    opacity: 0.9
  },
  message: {
    fontSize: '1.5rem',
    color: palette.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadow: '0 2px 4px rgba(15, 23, 42, 0.35)'
  },
  detailStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '40px'
  },
  statBox: {
    background: palette.surfaceGlass,
    borderRadius: '15px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)'
  },
  statIcon: {
    fontSize: '2rem',
    marginBottom: '10px'
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: '0.9rem',
    marginBottom: '5px'
  },
  statValue: {
    color: palette.textHighlight,
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  problemResults: {
    marginBottom: '40px'
  },
  sectionTitle: {
    color: palette.textHighlight,
    fontSize: '1.5rem',
    marginBottom: '25px',
    textAlign: 'center'
  },
  rankPanel: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  myRankBox: { background: palette.surfaceGlass, borderRadius: 12, padding: 16, border: '1px solid var(--glass-border)' },
  nearbyBox: { background: palette.surfaceGlass, borderRadius: 12, padding: 16, border: '1px solid var(--glass-border)' },
  nearbyRow: { display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed var(--glass-border)' },
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  problemCard: {
    background: palette.surfaceGlass,
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)'
  },
  correctCard: {
    borderLeftColor: palette.success,
    borderLeftWidth: '4px'
  },
  wrongCard: {
    borderLeftColor: palette.danger,
    borderLeftWidth: '4px'
  },
  problemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  problemNum: {
    color: palette.textHighlight,
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  correctBadge: {
    background: palette.successGradient,
    color: palette.textInverse,
    padding: '5px 12px',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  wrongBadge: {
    background: palette.dangerGradient,
    color: palette.textInverse,
    padding: '5px 12px',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  problemDetails: {
    fontSize: '0.9rem'
  },
  problemLabel: {
    color: palette.textMuted,
    marginBottom: '5px'
  },
  problemAnswer: {
    color: palette.textHighlight,
    fontWeight: 'bold',
    marginBottom: '10px',
    padding: '8px 12px',
    background: palette.surfaceGlass,
    borderRadius: '8px'
  },
  correctAnswer: {
    color: palette.success,
    fontWeight: 'bold',
    padding: '8px 12px',
    background: 'var(--success-surface-strong)',
    borderRadius: '8px',
    border: '1px solid var(--success-soft)'
  },
  actions: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  reviewButton: {
    padding: '15px 30px',
    background: palette.infoGradient,
    color: palette.textInverse,
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 12px 24px rgba(37, 99, 235, 0.25)'
  },
  restartButton: {
    padding: '15px 30px',
    background: palette.slateSoftGradient,
    color: palette.textInverse,
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
  },
  homeButton: {
    padding: '15px 30px',
    background: palette.successGradientDeep,
    color: palette.textInverse,
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(5, 150, 105, 0.35)'
  },
  // 티어 관련 스타일
  tierSection: {
    marginBottom: '40px',
    textAlign: 'center'
  },
  challengerContainer: {
    position: 'relative',
    background: palette.championGradient,
    border: '3px solid transparent',
    borderRadius: '20px',
    padding: '30px',
    overflow: 'hidden',
    boxShadow: '0 0 5px rgba(255, 215, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.4), 0 0 35px rgba(255, 215, 0, 0.3), 0 0 50px rgba(255, 123, 0, 0.2), inset 0 0 30px rgba(255, 215, 0, 0.1)',
    animation: 'challengerMasterGlow 3s ease-in-out infinite'
  },
  challengerBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: palette.championGradient,
    color: palette.textInverse,
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '1px',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
    boxShadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 69, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    animation: 'challengerCrownPulse 1.8s ease-in-out infinite',
    zIndex: 15
  },
  challengerParticles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 5,
    top: 0,
    left: 0
  },
  challengerParticle: {
    position: 'absolute',
    width: '4px',
    height: '4px',
    background: palette.championRadial,
    borderRadius: '50%',
    animation: 'challengerParticles 3s ease-in-out infinite',
    top: '80%'
  },
  challengerContent: {
    position: 'relative',
    zIndex: 10
  },
  challengerCrown: {
    fontSize: '32px',
    display: 'inline-block',
    animation: 'challengerCrownPulse 2s ease-in-out infinite',
    position: 'relative',
    marginBottom: '10px'
  },
  challengerTitle: {
    fontSize: '24px',
    fontWeight: '900',
    fontFamily: 'Cinzel, Times New Roman, serif',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: palette.gold,
    textShadow: '0 0 5px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.4)',
    animation: 'challengerTextGlow 2.5s ease-in-out infinite',
    margin: '0 0 15px 0',
    filter: 'brightness(1.2)'
  },
  challengerPoints: {
    fontSize: '18px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, var(--color-gold-200), var(--color-orange-500), var(--color-gold-200))',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
    animation: 'challengerTextGlow 3s ease-in-out infinite'
  },
  tierCard: {
    background: palette.surfaceGlass,
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '25px',
    border: '3px solid',
    borderColor: palette.accent,
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.5s ease'
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    justifyContent: 'center'
  },
  tierIcon: {
    fontSize: '40px',
    filter: 'drop-shadow(0 0 15px currentColor)'
  },
  tierName: {
    fontSize: '24px',
    fontWeight: '900',
    margin: '0 0 8px 0',
    textShadow: '0 0 15px currentColor'
  },
  tierPoints: {
    fontSize: '18px',
    fontWeight: '700',
    color: palette.textHighlight
  },
  tierDelta: {
    fontSize: '14px',
    marginLeft: '6px',
    color: palette.info
  },
  typeStats: {
    marginTop: 32
  },
  typeTable: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--glass-border)'
  },
  typeRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '12px 16px',
    background: palette.surfaceGlass,
    color: palette.textHighlight,
    fontSize: 14,
    borderBottom: '1px solid var(--glass-border)'
  },
  typeHeader: {
    background: palette.accentGradient,
    color: palette.textInverse,
    fontWeight: 700
  }
};

export default StudyResult;
