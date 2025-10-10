import React from 'react';
import { palette, layoutStyles } from '../resultStyles';

const RankPanel = ({ myRank, nearby, rankError }) => (
  <div style={{ ...layoutStyles.sectionCard, marginBottom: '32px' }}>
    <h3 style={styles.sectionTitle}>🏆 랭킹 현황</h3>
    {rankError ? (
      <div style={{ color: palette.dangerStronger }}>{rankError}</div>
    ) : (
      <div style={styles.grid}>
        <div style={styles.rankBox}>
          <div style={styles.rankTitle}>내 랭킹</div>
          <div style={styles.rankMain}>
            <span style={styles.rankBadge}>{myRank?.rank ? `#${myRank.rank}` : '-'}</span>
            <span style={styles.rankPoints}>{(myRank?.points || 0).toLocaleString()} LP</span>
          </div>
          <div style={styles.rankMeta}>
            티어: {myRank?.tier?.nameKr || myRank?.tier?.name || '-'}
            {myRank?.nextTier && (
              <>
                {' · '}다음 티어까지 {Math.max(0, 100 - Math.round(myRank.progressToNext || 0))}%
              </>
            )}
          </div>
        </div>
        <div style={styles.nearbyBox}>
          <div style={styles.rankTitle}>주변 랭킹</div>
          {nearby.length === 0 ? (
            <div style={{ color: palette.textSecondary }}>데이터 없음</div>
          ) : (
            <div style={styles.nearbyList}>
              {nearby.map((entry) => (
                <div key={entry.id} style={styles.nearbyRow}>
                  <div style={{ width: 60, color: palette.textPrimary, fontWeight: 600 }}>#{entry.rank}</div>
                  <div
                    style={{
                      flex: 1,
                      color: entry.isMe ? palette.success : palette.textPrimary,
                      fontWeight: entry.isMe ? 700 : 500,
                    }}
                  >
                    {entry.isMe ? '나' : entry.name || entry.id}
                  </div>
                  <div style={{ minWidth: 90, textAlign: 'right', color: palette.textPrimary, fontWeight: 600 }}>
                    {(entry.points || 0).toLocaleString()} LP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

const styles = {
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: palette.textPrimary,
    marginBottom: '18px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  rankBox: {
    background: palette.surfaceGlass,
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)',
  },
  rankTitle: {
    color: palette.textSecondary,
    fontSize: '0.95rem',
    marginBottom: '12px',
    fontWeight: 600,
  },
  rankMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  rankBadge: {
    padding: '6px 14px',
    borderRadius: '999px',
    background: palette.infoGradient,
    color: palette.textInverse,
    fontWeight: 700,
  },
  rankPoints: {
    fontSize: '1.45rem',
    fontWeight: 800,
    color: palette.textPrimary,
  },
  rankMeta: {
    color: palette.textSecondary,
    fontSize: '0.9rem',
  },
  nearbyBox: {
    background: palette.surfaceGlass,
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)',
  },
  nearbyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  nearbyRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px dashed var(--glass-border)',
  },
};

export default RankPanel;
