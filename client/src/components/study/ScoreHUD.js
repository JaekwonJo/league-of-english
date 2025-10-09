import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.service';

const ScoreHUD = ({ timeElapsed = 0 }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.ranking.myRank();
        setRank(data?.myRank || null);
      } catch (e) {
        setError('랭킹 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progress = rank?.progressToNext ?? 0;

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.timer}>⏱️ {formatTime(timeElapsed)}</div>
      </div>
      <div style={styles.center}>
        {loading ? (
          <div style={styles.lightText}>랭킹 불러오는 중…</div>
        ) : error ? (
          <div style={styles.lightText}>{error}</div>
        ) : rank ? (
          <div style={styles.progressWrap}>
            <div style={styles.tierLine}>
              <span style={styles.tierName}>{rank.tier?.nameKr || rank.tier?.name || 'Tier'}</span>
              <span style={styles.points}>{(rank.points || 0).toLocaleString()} LP</span>
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
            </div>
            <div style={styles.progressLabel}>다음 티어까지 {Math.max(0, 100 - Math.round(progress))}%</div>
          </div>
        ) : (
          <div style={styles.lightText}>랭킹 정보 없음</div>
        )}
      </div>
      <div style={styles.right}>
        <div style={styles.rank}>🏆 {rank?.rank ? `#${rank.rank}` : '-'}</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 16
  },
  left: { minWidth: 90 },
  center: { flex: 1 },
  right: { minWidth: 90, textAlign: 'right' },
  timer: { color: 'var(--border-subtle)', fontWeight: 700 },
  rank: { color: 'var(--border-subtle)', fontWeight: 700 },
  lightText: { color: 'var(--text-muted)' },
  tierLine: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 6 },
  tierName: { fontWeight: 700 },
  points: { fontWeight: 700 },
  progressWrap: {},
  progressBarBg: { background: 'rgba(148,163,184,0.2)', height: 8, borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { background: 'linear-gradient(90deg, var(--success), var(--accent-primary))', height: '100%' },
  progressLabel: { marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }
};

export default ScoreHUD;

