import React from 'react';
import { palette } from '../resultStyles';

const effectBackgroundMap = {
  celebration: {
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
    animation: 'pulse 2s infinite',
  },
  good: {
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
  },
  encourage: {
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
  },
  comfort: {
    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)',
  },
};

const ResultEffects = ({ effect = 'good', emojiSet = '👍🌟💪' }) => (
  <div style={styles.wrapper}>
    <div style={{ ...styles.background, ...(effectBackgroundMap[effect] || {}) }} />
    <div style={styles.emojiRow}>
      {[...emojiSet].map((icon, idx) => (
        <span key={`${icon}-${idx}`} style={styles.emoji}>
          {icon}
        </span>
      ))}
    </div>
  </div>
);

const styles = {
  wrapper: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  background: {
    position: 'absolute',
    inset: 0,
  },
  emojiRow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px',
  },
  emoji: {
    fontSize: '2rem',
    animation: 'bounce 2s infinite',
    color: palette.textHighlight,
  },
};

export default ResultEffects;
