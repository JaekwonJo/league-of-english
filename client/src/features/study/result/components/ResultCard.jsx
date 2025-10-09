import React from 'react';
import { palette, layoutStyles } from '../resultStyles';
import { formatSeconds } from '../../../../hooks/useStudySession';

const ResultCard = ({
  resultInfo,
  summary,
  tierInfo,
  userPoints,
  currentLpCount,
  perTypeStats,
  detailResults,
  formatTypeLabel,
  formatLpDelta,
  onReview,
  onRestart,
  onHome,
}) => (
  <div style={styles.card}>
    <div style={styles.heroSection}>
      <div style={{ ...styles.gradeCircle, background: resultInfo.bgColor }}>
        <div style={styles.grade}>{resultInfo.grade}</div>
        <div style={styles.accuracy}>{summary.accuracy}%</div>
      </div>
      <div style={styles.message}>{resultInfo.message}</div>
      <div style={styles.emoji}>{resultInfo.emoji}</div>
    </div>

    <TierSection
      tierInfo={tierInfo}
      totalPointsAfter={summary.totalPoints}
      pointsDelta={summary.pointsDelta}
      userPoints={userPoints}
      formatLpDelta={formatLpDelta}
    />

    <StatGrid
      totalCorrect={summary.totalCorrect}
      totalIncorrect={summary.totalIncorrect}
      totalTimeSeconds={summary.totalTimeSeconds}
      lpDelta={formatLpDelta(currentLpCount)}
    />

    {perTypeStats.length > 0 && (
      <TypeStats perTypeStats={perTypeStats} formatTypeLabel={formatTypeLabel} />
    )}

    <ProblemResults detailResults={detailResults} />

    <ActionButtons onReview={onReview} onRestart={onRestart} onHome={onHome} />
  </div>
);

const TierSection = ({ tierInfo, totalPointsAfter, pointsDelta, userPoints, formatLpDelta }) => {
  if (tierInfo.id === 'challenger') {
    return (
      <div style={styles.challengerContainer}>
        <div style={styles.challengerBadge}>LEGENDARY</div>
        <div style={styles.challengerCrown}>👑</div>
        <div style={styles.challengerTitle}>CHALLENGER</div>
        <div style={styles.challengerPoints}>{userPoints.toLocaleString()} LP</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.tierCard, borderColor: tierInfo.color, boxShadow: `0 0 30px ${tierInfo.color}40` }}>
      <div style={styles.tierHeader}>
        <span style={{ ...styles.tierIcon, filter: `drop-shadow(0 0 10px ${tierInfo.color})` }}>
          {tierInfo.icon}
        </span>
        <div>
          <h3 style={{ ...styles.tierName, color: tierInfo.color }}>{tierInfo.nameKr}</h3>
          <div style={styles.tierPoints}>
            {totalPointsAfter.toLocaleString()} LP
            {pointsDelta !== 0 && (
              <span
                style={{
                  ...styles.tierDelta,
                  color: pointsDelta >= 0 ? palette.infoSoft : palette.dangerSoft,
                }}
              >
                {' '}({formatLpDelta(pointsDelta)} LP)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatGrid = ({ totalCorrect, totalIncorrect, totalTimeSeconds, lpDelta }) => (
  <div style={styles.statGrid}>
    <StatBox icon="✅" label="정답" value={`${totalCorrect}개`} />
    <StatBox icon="❌" label="오답" value={`${totalIncorrect}개`} />
    <StatBox
      icon="⏱️"
      label="시간"
      value={`${Math.floor(totalTimeSeconds / 60)}분 ${totalTimeSeconds % 60}초`}
    />
    <StatBox icon="💎" label="LP 획득" value={`${lpDelta} LP`} />
  </div>
);

const StatBox = ({ icon, label, value }) => (
  <div style={styles.statBox}>
    <div style={styles.statIcon}>{icon}</div>
    <div style={styles.statLabel}>{label}</div>
    <div style={styles.statValue}>{value}</div>
  </div>
);

const TypeStats = ({ perTypeStats, formatTypeLabel }) => (
  <div style={{ marginBottom: '32px' }}>
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
          <span>{Number(entry.accuracy ?? 0).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  </div>
);

const ProblemResults = ({ detailResults }) => (
  <div style={{ marginBottom: '32px' }}>
    <h3 style={styles.sectionTitle}>📋 문제별 상세 결과</h3>
    <div style={styles.problemGrid}>
      {detailResults.map((detail, idx) => {
        const isCorrect = Boolean(detail.isCorrect);
        return (
          <div
            key={`problem-${idx}`}
            style={{
              ...styles.problemCard,
              borderLeftColor: isCorrect ? palette.success : palette.danger,
            }}
          >
            <div style={styles.problemHeader}>
              <span style={styles.problemIndex}>#{idx + 1}</span>
              <span style={isCorrect ? styles.correctBadge : styles.wrongBadge}>
                {isCorrect ? '정답' : '오답'}
              </span>
            </div>
            <div style={styles.problemBody}>
              <div style={styles.problemLabel}>내 답안</div>
              <div style={styles.problemAnswer}>{detail.userAnswer || '무응답'}</div>
              {!isCorrect && (
                <>
                  <div style={styles.problemLabel}>정답</div>
                  <div style={styles.correctAnswer}>{detail.correctAnswer || '-'}</div>
                </>
              )}
              {Number.isFinite(detail.timeSpent) && (
                <div style={styles.problemTime}>소요 시간: {formatSeconds(detail.timeSpent)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ActionButtons = ({ onReview, onRestart, onHome }) => (
  <div style={styles.actions}>
    {typeof onReview === 'function' && (
      <button type="button" style={styles.reviewButton} onClick={onReview}>
        🔁 복습하기
      </button>
    )}
    <button type="button" style={styles.restartButton} onClick={() => onRestart(true)}>
      🔄 다시 풀기
    </button>
    <button type="button" style={styles.homeButton} onClick={onHome}>
      🏠 홈으로
    </button>
  </div>
);

const styles = {
  card: {
    ...layoutStyles.sectionCard,
    position: 'relative',
    zIndex: 10,
    background: palette.surfaceOverlay,
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--glass-border)',
  },
  heroSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  gradeCircle: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    margin: '0 auto 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)',
  },
  grade: {
    fontSize: '3.6rem',
    fontWeight: 800,
    color: palette.textInverse,
  },
  accuracy: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: palette.textInverse,
    opacity: 0.85,
  },
  message: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: palette.textInverse,
    textShadow: '0 2px 4px rgba(15, 23, 42, 0.35)',
  },
  emoji: {
    fontSize: '1.8rem',
    marginTop: '8px',
  },
  challengerContainer: {
    marginBottom: '32px',
    borderRadius: '18px',
    padding: '28px',
    textAlign: 'center',
    color: palette.textInverse,
    background: palette.championGradient,
    boxShadow: '0 24px 48px rgba(59, 130, 246, 0.35)',
  },
  challengerBadge: {
    display: 'inline-flex',
    padding: '6px 16px',
    borderRadius: '999px',
    background: palette.championRadial,
    boxShadow: '0 12px 24px rgba(250, 204, 21, 0.35)',
    marginBottom: '12px',
    fontWeight: 700,
  },
  challengerCrown: {
    fontSize: '2.4rem',
  },
  challengerTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
  },
  challengerPoints: {
    marginTop: '8px',
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  tierCard: {
    marginBottom: '32px',
    borderRadius: '18px',
    padding: '24px',
    background: palette.surfaceGlass,
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  tierIcon: {
    fontSize: '2.2rem',
  },
  tierName: {
    fontSize: '1.6rem',
    margin: 0,
  },
  tierPoints: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: palette.textHighlight,
  },
  tierDelta: {
    fontSize: '0.95rem',
    marginLeft: '6px',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statBox: {
    background: palette.surfaceGlass,
    borderRadius: '14px',
    padding: '18px',
    textAlign: 'center',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)',
  },
  statIcon: {
    fontSize: '1.8rem',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '0.9rem',
    color: palette.textMuted,
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: palette.textHighlight,
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: palette.textHighlight,
    textAlign: 'center',
    marginBottom: '18px',
  },
  typeTable: {
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid var(--glass-border)',
  },
  typeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    padding: '12px 16px',
    background: palette.surfaceGlass,
    color: palette.textHighlight,
  },
  typeHeader: {
    fontWeight: 700,
    background: 'rgba(148, 163, 184, 0.2)',
  },
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  problemCard: {
    background: palette.surfaceGlass,
    borderRadius: '14px',
    padding: '18px',
    border: '1px solid var(--glass-border)',
  },
  problemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  problemIndex: {
    fontWeight: 700,
    color: palette.textHighlight,
  },
  correctBadge: {
    background: palette.successGradient,
    color: palette.textInverse,
    borderRadius: '12px',
    padding: '4px 10px',
    fontWeight: 600,
  },
  wrongBadge: {
    background: palette.dangerGradient,
    color: palette.textInverse,
    borderRadius: '12px',
    padding: '4px 10px',
    fontWeight: 600,
  },
  problemBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.95rem',
  },
  problemLabel: {
    color: palette.textMuted,
  },
  problemAnswer: {
    color: palette.textHighlight,
    fontWeight: 700,
    padding: '6px 10px',
    background: palette.surfaceGlass,
    borderRadius: '10px',
  },
  correctAnswer: {
    color: palette.success,
    fontWeight: 700,
    padding: '6px 10px',
    background: 'var(--success-surface-strong)',
    borderRadius: '10px',
  },
  problemTime: {
    fontSize: '0.85rem',
    color: palette.textMuted,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '32px',
  },
  reviewButton: {
    ...layoutStyles.buttonPrimary,
    background: palette.infoGradient,
  },
  restartButton: {
    ...layoutStyles.buttonSecondary,
  },
  homeButton: {
    ...layoutStyles.buttonSecondary,
  },
};

export default ResultCard;
