export const adminStyles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Noto Sans KR', sans-serif",
    wordBreak: 'keep-all'
  },
  containerMobile: {
    padding: '16px 14px',
    width: '100%',
    wordBreak: 'keep-all',
    textAlign: 'left'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px'
  },
  title: {
    color: 'var(--text-primary)',
    margin: 0,
    fontSize: '2rem'
  },
  titleMobile: {
    fontSize: '1.7rem',
    lineHeight: 1.3
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  headerButtonsMobile: {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  primaryButton: {
    background: 'var(--indigo-gradient)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  secondaryButton: {
    background: 'var(--surface-card)',
    color: 'var(--indigo)',
    border: '2px solid var(--indigo)',
    borderRadius: '12px',
    padding: '10px 22px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  cardMobile: {
    padding: '22px'
  },
  mockExamCard: {
    position: 'relative',
    borderRadius: '28px',
    padding: '36px',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(79,70,229,0.75) 0%, rgba(14,165,233,0.62) 38%, rgba(236,233,254,0.78) 100%)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 44px 80px rgba(15, 23, 42, 0.28)'
  },
  mockExamCardMobile: {
    padding: '26px'
  },
  mockExamGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 12% 22%, rgba(255,255,255,0.35), transparent 55%), radial-gradient(circle at 82% 10%, rgba(14,165,233,0.28), transparent 60%)',
    pointerEvents: 'none'
  },
  mockExamContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  mockExamHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  mockExamTitle: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 800,
    letterSpacing: '-0.01em'
  },
  mockExamDescription: {
    margin: 0,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.98rem'
  },
  mockExamForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
    gap: '16px'
  },
  mockExamFormMobile: {
    gridTemplateColumns: '1fr'
  },
  mockExamField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'rgba(255,255,255,0.18)',
    borderRadius: '18px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.22)'
  },
  mockExamLabel: {
    fontSize: '0.92rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  mockExamRequired: {
    fontSize: '0.85rem',
    color: 'rgba(248, 250, 252, 0.9)'
  },
  mockExamHint: {
    fontSize: '0.85rem',
    color: 'rgba(248, 250, 252, 0.78)'
  },
  mockExamInput: {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.35)',
    padding: '10px 14px',
    fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.92)',
    color: 'var(--text-primary)'
  },
  mockExamFileInput: {
    borderRadius: '12px',
    border: '1px dashed rgba(255,255,255,0.4)',
    padding: '10px',
    background: 'rgba(255,255,255,0.9)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  mockExamFileName: {
    fontSize: '0.88rem',
    color: 'rgba(248, 250, 252, 0.85)'
  },
  mockExamActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  mockExamActionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch'
  },
  mockExamUploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 22px',
    borderRadius: '16px',
    border: 'none',
    fontWeight: 700,
    fontSize: '0.98rem',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.75) 100%)',
    color: 'var(--indigo-strong)',
    boxShadow: '0 28px 54px rgba(15,23,42,0.25)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  mockExamUploadButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  mockExamTip: {
    flex: 1,
    margin: 0,
    fontSize: '0.9rem',
    color: 'rgba(248, 250, 252, 0.85)'
  },
  cardTitle: {
    color: 'var(--text-primary)',
    marginBottom: '25px',
    fontSize: '1.5rem'
  },
  cardTitleMobile: {
    fontSize: '1.25rem',
    lineHeight: 1.35
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: 'var(--text-muted)',
    fontSize: '18px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '50px',
    color: 'var(--text-muted)',
    fontSize: '18px'
  },
  emptyStateMobile: {
    padding: '32px 16px',
    fontSize: '1rem'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  documentsGridMobile: {
    gridTemplateColumns: '1fr',
    gap: '16px'
  },
  documentCard: {
    background: 'var(--surface-soft-solid)',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid var(--border-subtle)',
    transition: 'all 0.3s'
  },
  documentCardMobile: {
    padding: '18px'
  },
  documentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  documentHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '12px'
  },
  documentTitle: {
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    flex: 1,
    marginRight: '10px'
  },
  documentTitleMobile: {
    marginRight: 0,
    fontSize: '15px',
    lineHeight: 1.4
  },
  documentActions: {
    display: 'flex',
    gap: '5px'
  },
  documentActionsMobile: {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  analyzeButton: {
    background: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text-on-accent)',
    transition: 'all 0.3s'
  },
  editButton: {
    background: 'var(--warning)',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text-on-accent)',
    transition: 'all 0.3s'
  },
  deleteButton: {
    background: 'var(--danger)',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text-on-accent)',
    transition: 'all 0.3s'
  },
  documentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  documentMetaMobile: {
    flexWrap: 'wrap',
    gap: '8px'
  },
  badge: {
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  badgeMobile: {
    padding: '4px 10px',
    fontSize: '11px'
  },
  meta: {
    color: 'var(--text-secondary)',
    fontSize: '14px'
  },
  documentFooter: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '10px',
    marginTop: '15px'
  },
  date: {
    color: 'var(--text-muted)',
    fontSize: '12px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--dialog-scrim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '30px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '20px'
  },
  modalTitle: {
    color: 'var(--text-primary)',
    marginBottom: '25px',
    fontSize: '1.4rem'
  },
  modalSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px'
  },
  modalSecondaryButton: {
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '10px 22px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  modalPrimaryButton: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 22px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 28px rgba(59, 130, 246, 0.28)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '15px'
  },
  label: {
    color: 'var(--text-secondary)',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  fileInput: {
    padding: '10px',
    border: '2px dashed var(--border-light)',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  fileHelp: {
    color: 'var(--text-secondary)',
    fontSize: '12px'
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  cancelButton: {
    background: 'var(--surface-soft-muted)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  submitButton: {
    background: 'var(--indigo-gradient)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  categoryList: {
    marginBottom: '20px'
  },
  categoryTag: {
    display: 'inline-block',
    background: 'var(--border-muted)',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    borderRadius: '20px',
    margin: '4px',
    fontSize: '12px'
  },
  addCategoryForm: {
    display: 'flex',
    gap: '10px'
  },
  addButton: {
    background: 'var(--success)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  feedbackSection: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '24px',
    marginTop: '30px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)'
  },
  feedbackSectionMobile: {
    padding: '20px',
    marginTop: '24px'
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  feedbackHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '12px'
  },
  feedbackBadge: {
    background: 'var(--danger-surface)',
    color: 'var(--danger-strong)',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  feedbackBadgeSuccess: {
    background: 'var(--success-surface)',
    color: 'var(--success-strong)',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  feedbackBadgeHold: {
    background: 'var(--warning-surface)',
    color: 'var(--warning-strong)',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  feedbackItem: {
    border: '1px solid var(--border-muted)',
    borderRadius: '16px',
    padding: '18px',
    background: 'var(--surface-soft-solid)'
  },
  feedbackItemMobile: {
    padding: '16px',
    textAlign: 'left'
  },
  feedbackMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '12px',
    color: 'var(--text-secondary)'
  },
  feedbackMetaMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px'
  },
  feedbackReason: {
    background: 'var(--surface-soft-strong)',
    borderRadius: '12px',
    padding: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginBottom: '12px'
  },
  feedbackActions: {
    display: 'flex',
    gap: '10px'
  },
  feedbackActionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '8px'
  },
  feedbackActionResolve: {
    background: 'var(--success)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 600
  },
  feedbackActionDismiss: {
    background: 'var(--surface-card)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-muted)',
    borderRadius: '10px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 600
  },
  feedbackActionDeactivate: {
    background: 'var(--danger-surface)',
    color: 'var(--danger-strong)',
    border: '1px solid var(--danger-border)',
    borderRadius: '10px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 600
  },
  feedbackActionDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  feedbackEmpty: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--text-muted)'
  },
  feedbackError: {
    background: 'var(--danger-surface)',
    border: '1px solid var(--danger-border)',
    borderRadius: '12px',
    color: 'var(--danger-strong)',
    padding: '16px',
    marginBottom: '16px'
  },
  notificationsSection: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    marginTop: '40px'
  },
  notificationsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  notificationList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  notificationItem: {
    background: 'var(--surface-soft-solid)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  notificationMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'var(--text-secondary)',
    fontSize: '13px'
  },
  notificationType: {
    fontWeight: 600
  },
  notificationTimestamp: {
    fontStyle: 'italic'
  },
  notificationPayload: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    lineHeight: 1.5
  },
  notificationActions: {
    display: 'flex',
    gap: '10px'
  },
  notificationButton: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-muted)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
