const baseOption = {
  border: '1px solid var(--surface-border)',
  borderRadius: '14px',
  padding: '16px',
  background: 'var(--surface-card)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const reviewStyles = {
  option: baseOption,
  optionCorrect: {
    borderColor: 'var(--success-soft)',
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(5, 150, 105, 0.08))',
  },
  optionIncorrect: {
    borderColor: 'var(--danger-border)',
    background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.14), rgba(239, 68, 68, 0.08))',
  },
  optionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  marker: {
    fontWeight: 700,
    color: 'var(--accent-primary)',
    marginRight: '10px',
  },
  optionText: {
    color: 'var(--text-primary)',
    lineHeight: 1.6,
  },
  badgeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  badgeBase: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  badgeCorrect: {
    background: 'var(--success-surface-strong)',
    color: 'var(--success-deep)',
  },
  badgeUser: {
    background: 'var(--accent-primary-pale)',
    color: 'var(--accent-badge-text)',
  },
  badgeIncorrect: {
    background: 'var(--color-red-100)',
    color: 'var(--danger-stronger)',
  },
  metaBox: {
    marginTop: '18px',
    padding: '16px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    fontSize: '14px',
  },
  explanation: {
    marginTop: '18px',
    padding: '18px',
    borderRadius: '12px',
    background: 'var(--surface-soft-shell)',
    border: '1px solid var(--surface-border)',
    color: 'var(--text-primary)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  explanationTitle: {
    fontWeight: 700,
    marginBottom: '8px',
    color: 'var(--accent-primary)',
  },
};

export default reviewStyles;
