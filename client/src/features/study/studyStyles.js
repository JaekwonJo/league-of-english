export const studyStyles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
    minHeight: '400px',
    textAlign: 'center'
  },
  loadingProgressPanel: {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '6px'
  },
  progressBarOuter: {
    width: '100%',
    height: '8px',
    background: 'var(--surface-soft-muted)',
    borderRadius: '999px',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px var(--surface-shadow)'
  },
  progressBarInner: {
    height: '100%',
    background: 'var(--progress-gradient)',
    transition: 'width 0.45s ease'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--surface-border)',
    borderTop: '4px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  loadingSnippet: {
    maxWidth: '520px',
    background: 'var(--surface-soft-strong)',
    borderRadius: '18px',
    padding: '18px 22px',
    boxShadow: '0 16px 32px var(--surface-shadow)'
  },
  loadingMessage: {
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontWeight: 600,
    margin: 0
  },
  quoteText: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  quoteMeta: {
    margin: '6px 0 4px',
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  quoteTranslation: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  flashcardArea: {
    marginTop: '8px',
    background: 'var(--surface-translucent)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 18px 28px var(--surface-shadow)',
    width: '100%',
    maxWidth: '420px'
  },
  flashcardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '12px'
  },
  flashcardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  flashcardMoreButton: {
    marginTop: '16px',
    padding: '10px 18px',
    background: 'var(--success-gradient)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 24px var(--success-shadow)'
  },
  flashcardItem: {
    background: 'var(--surface-card)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: 'var(--text-primary)',
    boxShadow: '0 10px 20px var(--surface-shadow)'
  },
  flashcardWord: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '4px',
    color: 'var(--text-primary)'
  },
  flashcardMeaning: {
    fontSize: '14px',
    color: 'var(--text-muted)'
  },
  flashcardCountdown: {
    fontSize: '13px',
    color: 'var(--text-muted)'
  },
  reviewCallout: {
    marginBottom: '24px',
    padding: '24px',
    borderRadius: '18px',
    background: 'var(--review-callout-bg)',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 18px 40px var(--accent-shadow)',
    color: 'var(--text-primary)'
  },
  reviewCalloutHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '18px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  reviewBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    background: 'var(--accent-soft-strong)',
    color: 'var(--accent)',
    fontWeight: 700,
    fontSize: '12px',
    marginBottom: '8px',
    letterSpacing: '0.04em'
  },
  reviewCalloutTitle: {
    fontSize: '20px',
    fontWeight: 800,
    marginBottom: '4px',
    color: 'var(--text-primary)'
  },
  reviewCalloutSubtitle: {
    fontSize: '14px',
    color: 'var(--review-hint)'
  },
  reviewErrorBox: {
    marginBottom: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'var(--danger-bg)',
    color: 'var(--danger-text)',
    fontSize: '13px',
    lineHeight: 1.5,
    border: '1px solid var(--danger-border)'
  },
  reviewCalloutList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewPreviewItem: {
    background: 'var(--surface-translucent)',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 10px 24px var(--surface-shadow)'
  },
  reviewPreviewMeta: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  reviewPreviewType: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'var(--accent-soft)',
    color: 'var(--accent-strong)',
    fontSize: '12px',
    fontWeight: 700
  },
  reviewPreviewSource: {
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  reviewPreviewText: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.6
  },
  reviewEmptyPreview: {
    textAlign: 'center',
    padding: '24px',
    borderRadius: '14px',
    background: 'var(--surface-overlay)',
    color: 'var(--review-hint)',
    fontWeight: 600
  },
  reviewActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  reviewRefreshButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: '1px solid var(--accent-soft-strong)',
    background: 'var(--accent-soft-strong)',
    color: 'var(--accent-deep)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },
  reviewStartButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--accent-gradient)',
    color: 'var(--text-inverse)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 24px var(--accent-shadow)',
    transition: 'transform 0.2s ease'
  },
  reviewButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none'
  },
  reviewList: {
    display: 'grid',
    gap: '14px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
  },
  reviewItem: {
    background: 'var(--surface-card)',
    borderRadius: '12px',
    padding: '14px 16px',
    boxShadow: '0 12px 24px var(--surface-shadow)'
  },
  generationSummary: {
    margin: '24px 0',
    borderRadius: '18px',
    border: '1px solid var(--glass-border)',
    background: 'var(--surface-card)',
    boxShadow: '0 18px 32px var(--surface-shadow)'
  },
  generationSummaryHeader: {
    padding: '20px 24px 12px',
    fontWeight: 800,
    fontSize: '18px',
    color: 'var(--text-primary)'
  },
  generationSummaryBody: {
    padding: '0 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  generationSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  generationSummaryType: {
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  generationSummaryStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  generationSummaryWarning: {
    color: 'var(--warning)',
    fontWeight: 600
  },
  generationSummaryFooter: {
    padding: '16px 24px',
    borderTop: '1px solid var(--surface-border)',
    fontSize: '14px',
    color: 'var(--text-secondary)'
  }
};
