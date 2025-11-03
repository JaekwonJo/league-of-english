export const studyModeStyles = {
  wrapper: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '24px 16px 48px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '24px'
  },
  resetButton: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  progressSection: {
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressBarOuter: {
    width: '100%',
    height: '10px',
    borderRadius: '999px',
    background: 'var(--surface-border)',
    overflow: 'hidden'
  },
  progressBarInner: {
    height: '100%',
    background: 'var(--progress-gradient)',
    transition: 'width 0.3s ease'
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 600
  },
  problemList: {
    display: 'flex',
    flexDirection: 'column'
  },
  submitBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginTop: '32px',
    flexWrap: 'wrap'
  },
  submitHint: {
    color: 'var(--text-secondary)',
    fontSize: '14px'
  },
  submitButton: {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--submit-gradient)',
    color: 'var(--text-inverse)',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 15px 35px var(--submit-shadow)',
    transition: 'opacity 0.2s ease'
  },
  submitButtonDisabled: {
    opacity: 0.55,
    boxShadow: 'none'
  },
  scrollTopButton: {
    position: 'fixed',
    right: '32px',
    bottom: '32px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--scroll-top-bg)',
    color: 'var(--scroll-top-text)',
    fontSize: '22px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 24px var(--accent-shadow)',
    transition: 'transform 0.2s ease, opacity 0.2s ease',
    zIndex: 1200
  }
};

export const reviewModeStyles = {
  wrapper: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '32px 16px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--accent-strong)'
  },
  navButton: {
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 28px var(--accent-shadow)',
    transition: 'transform 0.2s ease'
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    borderRadius: '20px',
    background: 'var(--review-empty-bg)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '18px'
  }
};
