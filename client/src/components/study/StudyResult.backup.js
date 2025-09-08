import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import tierConfig from '../../config/tierConfig.json';

const StudyResult = ({ results, onRestart, onHome }) => {
  const { user } = useAuth();
  const [showAnimation, setShowAnimation] = useState(false);
  const [currentLpCount, setCurrentLpCount] = useState(0);
  
  useEffect(() => {
    setShowAnimation(true);
    // LP Ïπ¥Ïö¥???†ÎãàÎ©îÏù¥??
    const lpIncrement = Math.max(1, Math.floor(results.earnedPoints / 50));
    const interval = setInterval(() => {
      setCurrentLpCount(prev => {
        if (prev >= results.earnedPoints) {
          clearInterval(interval);
          return results.earnedPoints;
        }
        return Math.min(prev + lpIncrement, results.earnedPoints);
      });
    }, 30);
    return () => clearInterval(interval);
  }, [results.earnedPoints]);

  const getTierInfo = () => {
    const points = user?.points || 0;
    return tierConfig.tiers.find(tier => 
      points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP)
    ) || tierConfig.tiers[0];
  };

  const getResultInfo = (accuracy) => {
    const acc = parseFloat(accuracy);
    if (acc >= 90) return {
      grade: 'A+',
      color: '#10B981',
      bgColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      message: '?éâ Ï∂ïÌïò?©Îãà?? ?ÑÎ≤Ω???±Í≥º?ÖÎãà??',
      effect: 'celebration',
      emoji: '?éä?®üè?
    };
    if (acc >= 80) return {
      grade: 'A',
      color: '#3B82F6',
      bgColor: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      message: '?ëè ?òÌñà?¥Ïöî! ?åÎ????§Î†•?ÖÎãà??',
      effect: 'good',
      emoji: '?ëç?åü?í™'
    };
    if (acc >= 50) return {
      grade: 'B',
      color: '#F59E0B',
      bgColor: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      message: '?ìà Ï¢ãÏïÑ?? Ï°∞Í∏àÎß????∏Î†•?òÎ©¥ ?ÑÎ≤Ω?¥Ïöî!',
      effect: 'encourage',
      emoji: '?í™?ìö?éØ'
    };
    return {
      grade: 'C',
      color: '#EF4444',
      bgColor: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      message: '?§ó Í¥úÏ∞Æ?ÑÏöî! ?§Ïãú ?ÑÏ†Ñ?¥ÏÑú ?§Î†•???òÎ†§Î≥¥ÏïÑ??',
      effect: 'comfort',
      emoji: '?§ó?íù?åà'
    };
  };

  const resultInfo = getResultInfo(results.accuracy);
  const tierInfo = getTierInfo();

  return (
    <div style={styles.container}>
      {/* ?¥Ìéô??Î∞∞Í≤Ω */}
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
      </div>

      <div style={{
        ...styles.resultCard,
        ...(showAnimation ? styles.cardAnimation : {})
      }}>
        {/* Î©îÏù∏ Í≤∞Í≥º */}
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

        {/* ?∞Ïñ¥ ?ïÎ≥¥ */}
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
                <div className="challenger-crown" style={styles.challengerCrown}>?ëë</div>
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
                    {user?.points?.toLocaleString() || 0} LP
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ?ÅÏÑ∏ ?µÍ≥Ñ */}
        <div style={styles.detailStats}>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>??/div>
            <div style={styles.statLabel}>?ïÎãµ</div>
            <div style={styles.statValue}>{results.totalCorrect}Í∞?/div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>??/div>
            <div style={styles.statLabel}>?§Îãµ</div>
            <div style={styles.statValue}>{results.totalProblems - results.totalCorrect}Í∞?/div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>?±Ô∏è</div>
            <div style={styles.statLabel}>?úÍ∞Ñ</div>
            <div style={styles.statValue}>{Math.floor(results.totalTime / 60)}Î∂?{results.totalTime % 60}Ï¥?/div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statIcon}>?íé</div>
            <div style={styles.statLabel}>LP ?çÎìù</div>
            <div style={styles.statValue}>+{currentLpCount}</div>
          </div>
        </div>

        {/* Î¨∏Ï†úÎ≥??ÅÏÑ∏ Í≤∞Í≥º */}
        <div style={styles.problemResults}>
          <h3 style={styles.sectionTitle}>?ìã Î¨∏Ï†úÎ≥??ÅÏÑ∏ Í≤∞Í≥º</h3>
          <div style={styles.problemGrid}>
            {results.problems.map((problem, idx) => (
              <div key={idx} style={{
                ...styles.problemCard,
                ...(problem.isCorrect ? styles.correctCard : styles.wrongCard)
              }}>
                <div style={styles.problemHeader}>
                  <span style={styles.problemNum}>#{idx + 1}</span>
                  <span style={problem.isCorrect ? styles.correctBadge : styles.wrongBadge}>
                    {problem.isCorrect ? '?ïÎãµ' : '?§Îãµ'}
                  </span>
                </div>
                <div style={styles.problemDetails}>
                  <div style={styles.problemLabel}>???µÏïà:</div>
                  <div style={styles.problemAnswer}>{problem.userAnswer || 'Î¨¥Ïùë??}</div>
                  {!problem.isCorrect && (
                    <>
                      <div style={styles.problemLabel}>?ïÎãµ:</div>
                      <div style={styles.correctAnswer}>{problem.correctAnswer}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ?°ÏÖò Î≤ÑÌäº */}
        <div style={styles.actions}>
          <button 
            style={styles.restartButton} 
            onClick={onRestart}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            ?îÑ ?§Ïãú ?ÄÍ∏?
          </button>
          <button 
            style={styles.homeButton} 
            onClick={onHome}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            ?è† ?àÏúºÎ°?
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
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
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
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
    animation: 'pulse 2s infinite'
  },
  goodBg: {
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)'
  },
  encourageBg: {
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)'
  },
  comfortBg: {
    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
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
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '25px',
    padding: '40px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(248, 250, 252, 0.1)',
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
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
  },
  grade: {
    fontSize: '4rem',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
  },
  accuracy: {
    fontSize: '1.5rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold'
  },
  message: {
    fontSize: '1.5rem',
    color: '#F8FAFC',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
  },
  detailStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '40px'
  },
  statBox: {
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '15px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    backdropFilter: 'blur(10px)'
  },
  statIcon: {
    fontSize: '2rem',
    marginBottom: '10px'
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: '0.9rem',
    marginBottom: '5px'
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  problemResults: {
    marginBottom: '40px'
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: '1.5rem',
    marginBottom: '25px',
    textAlign: 'center'
  },
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  problemCard: {
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    backdropFilter: 'blur(10px)'
  },
  correctCard: {
    borderLeftColor: '#10B981',
    borderLeftWidth: '4px'
  },
  wrongCard: {
    borderLeftColor: '#EF4444',
    borderLeftWidth: '4px'
  },
  problemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  problemNum: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  correctBadge: {
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: 'white',
    padding: '5px 12px',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  wrongBadge: {
    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    color: 'white',
    padding: '5px 12px',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  problemDetails: {
    fontSize: '0.9rem'
  },
  problemLabel: {
    color: '#94A3B8',
    marginBottom: '5px'
  },
  problemAnswer: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    marginBottom: '10px',
    padding: '8px 12px',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '8px'
  },
  correctAnswer: {
    color: '#10B981',
    fontWeight: 'bold',
    padding: '8px 12px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  actions: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center'
  },
  restartButton: {
    padding: '15px 30px',
    background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
    color: '#F8FAFC',
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
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(5, 150, 105, 0.4)'
  },
  // ?∞Ïñ¥ Í¥Ä???§Ì???
  tierSection: {
    marginBottom: '40px',
    textAlign: 'center'
  },
  challengerContainer: {
    position: 'relative',
    background: 'linear-gradient(135deg, rgba(25, 25, 25, 0.95) 0%, rgba(40, 25, 10, 0.9) 25%, rgba(25, 25, 25, 0.95) 50%, rgba(40, 25, 10, 0.9) 75%, rgba(25, 25, 25, 0.95) 100%)',
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
    background: 'linear-gradient(45deg, #8B0000, #FF0000, #FF4500, #FFD700)',
    color: 'white',
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
    background: 'radial-gradient(circle, #FFD700, transparent)',
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
    color: '#FFD700',
    textShadow: '0 0 5px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.4)',
    animation: 'challengerTextGlow 2.5s ease-in-out infinite',
    margin: '0 0 15px 0',
    filter: 'brightness(1.2)'
  },
  challengerPoints: {
    fontSize: '18px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #FFD700, #FF7B00, #FFD700)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
    animation: 'challengerTextGlow 3s ease-in-out infinite'
  },
  tierCard: {
    background: 'rgba(51, 65, 85, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '25px',
    border: '3px solid',
    borderColor: '#3B82F6',
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
    fontSize: '16px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 15px rgba(245, 158, 11, 0.5)'
  }
};

export default StudyResult;
