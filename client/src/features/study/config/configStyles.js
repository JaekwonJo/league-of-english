const baseButton = {
  padding: '12px 24px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};

const styles = {
  container: {
    maxWidth: '920px',
    margin: '0 auto',
    padding: '32px',
    minHeight: '100vh',
    background: 'var(--app-background)',
    color: 'var(--text-primary)',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '36px',
    color: 'var(--tone-hero)'
  },
  quickGuide: {
    padding: '22px 24px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.12))',
    border: '1px solid rgba(148, 163, 184, 0.32)',
    boxShadow: '0 18px 38px rgba(15, 23, 42, 0.12)'
  },
  quickGuideTitle: {
    margin: '0 0 16px',
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--tone-hero)'
  },
  quickGuideList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  quickGuideItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '14px 16px',
    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.08)'
  },
  quickGuideIcon: {
    fontSize: '22px',
    lineHeight: 1
  },
  quickGuideBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  quickGuideLabel: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  quickGuideText: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  },
  headerSlot: {
    marginTop: '32px',
    marginBottom: '24px',
  },
  savedSessionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '18px 20px',
    marginBottom: '24px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    borderRadius: '18px',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.1)',
    flexWrap: 'wrap'
  },
  savedSessionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  savedSessionMeta: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  savedSessionMetaMuted: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  savedSessionActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  resumeButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--indigo) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(79, 70, 229, 0.25)'
  },
  discardButton: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(220, 38, 38, 0.35)',
    background: 'transparent',
    color: 'var(--danger-strong)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  section: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '28px',
    marginBottom: '28px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
    border: '1px solid var(--surface-border)',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary)'
  },
  sectionHint: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '18px',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '18px',
  },
  searchInput: {
    flex: '1 1 260px',
    minWidth: '220px',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  clearSearchButton: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  documentList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
    maxHeight: '360px',
    overflowY: 'auto',
    paddingRight: '6px',
  },
  documentButton: {
    textAlign: 'left',
    padding: '16px',
    borderRadius: '14px',
    border: '2px solid transparent',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
  },
  documentButtonActive: {
    borderColor: 'var(--accent-primary)',
    boxShadow: '0 12px 28px rgba(59, 130, 246, 0.25)',
    transform: 'translateY(-2px)',
    color: 'var(--tone-hero)'
  },
  documentTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    marginBottom: '6px',
    color: 'var(--tone-hero)'
  },
  documentMeta: {
    display: 'block',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  emptyDocumentList: {
    gridColumn: '1 / -1',
    padding: '24px',
    borderRadius: '14px',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    textAlign: 'center',
    border: '1px dashed var(--surface-border)',
  },
  errorBox: {
    background: 'var(--danger-surface)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-strong)',
    padding: '14px 18px',
    borderRadius: '14px',
    marginBottom: '20px',
  },
  select: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
  },
  stepActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  stepActionsSplit: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  passageActionBar: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    position: 'sticky',
    bottom: 0,
    paddingTop: '16px',
    background: 'linear-gradient(180deg, rgba(249,250,251,0) 0%, var(--surface-soft-shell) 45%)',
    backdropFilter: 'blur(6px)'
  },
  primaryButton: {
    ...baseButton,
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--indigo) 100%)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 14px 28px rgba(59, 130, 246, 0.35)',
  },
  secondaryButton: {
    ...baseButton,
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
    border: '1px solid var(--surface-border)',
  },
  randomButton: {
    ...baseButton,
    padding: '8px 18px',
    background: 'linear-gradient(135deg, var(--teal-accent) 0%, var(--accent-primary) 100%)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 10px 24px rgba(20, 184, 166, 0.28)',
  },
  previewButton: {
    ...baseButton,
    padding: '8px 18px',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 12px 28px rgba(99, 102, 241, 0.28)'
  },
  dangerButton: {
    ...baseButton,
    background: 'linear-gradient(135deg, var(--danger-strong) 0%, var(--danger-stronger) 100%)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 12px 24px rgba(220, 38, 38, 0.35)',
  },
  startButton: {
    ...baseButton,
    padding: '14px 36px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--success) 0%, var(--success-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    boxShadow: '0 16px 36px rgba(16, 185, 129, 0.45)',
    transition: 'transform 0.2s ease',
  },
  startButtonDisabled: {
    background: 'linear-gradient(135deg, var(--color-slate-600) 0%, var(--color-slate-650) 100%)',
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.6,
  },
  loadingCard: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '28px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    border: '1px solid var(--surface-border)',
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '4px solid rgba(148, 163, 184, 0.25)',
    borderTopColor: 'rgba(129, 140, 248, 0.9)',
    margin: '0 auto 12px',
    animation: 'spin 1s linear infinite',
  },
  bulkActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  bulkButton: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--color-blue-500)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)',
  },
  bulkRandomButton: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--teal-accent) 0%, var(--accent-primary) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(20, 184, 166, 0.28)',
  },
  bulkClearButton: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: 'none',
  },
  selectionBadge: {
    fontSize: '14px',
    color: 'var(--tone-hero)',
    background: 'var(--surface-soft)',
    padding: '4px 12px',
    borderRadius: '999px',
  },
  selectionLimitHint: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    margin: '-6px 0 12px',
    opacity: 0.85
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--violet) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 14px 32px rgba(59, 130, 246, 0.35)',
    color: 'var(--text-on-accent)',
    minWidth: '170px',
    justifyContent: 'center',
  },
  typeSelectionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--tone-hero)',
    fontWeight: 700,
    fontSize: '0.9rem'
  },
  countLabel: {
    fontSize: '12px',
    letterSpacing: '0.45px',
    textTransform: 'uppercase',
    color: 'var(--text-on-accent)',
  },
  countNumber: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--text-on-accent)',
    textShadow: '0 0 14px rgba(59, 130, 246, 0.35)',
  },
  countDivider: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    opacity: 0.85,
  },
  countMax: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-on-accent)',
  },
  typeSelectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
  },
  typeSelectCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    minHeight: '90px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: 'var(--text-primary)',
    textAlign: 'center'
  },
  typeSelectCardActive: {
    borderColor: 'var(--color-blue-500)',
    boxShadow: '0 10px 28px rgba(59,130,246,0.22)',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--tone-hero)'
  },
  typeSelectIcon: {
    fontSize: '20px'
  },
  typeSelectBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  typeSelectName: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: 'var(--tone-hero)'
  },
  typeSelectDescription: {
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
    lineHeight: 1.5
  },
  typeSelectBadge: {
    width: 'fit-content',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,0.16)',
    color: 'var(--color-green-600)',
    fontWeight: 700,
    fontSize: '0.75rem'
  },
  previewButtonRow: {
    marginTop: '18px',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  orderModeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderModeOption: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    padding: '16px 18px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  orderModeLabel: {
    fontWeight: 700,
    fontSize: '15px',
    marginBottom: '4px',
  },
  orderModeDescription: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  studyFooterBar: {
    position: 'sticky',
    bottom: 0,
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    paddingTop: '18px',
    background: 'linear-gradient(180deg, rgba(249,250,251,0) 0%, var(--surface-soft-shell) 45%)',
    backdropFilter: 'blur(6px)'
  },
};

export default styles;
