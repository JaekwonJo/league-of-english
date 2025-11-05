export const adminStyles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Noto Sans KR', sans-serif"
  },
  containerMobile: {
    padding: '16px 14px'
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
    fontSize: '1.7rem'
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
  cardTitle: {
    color: 'var(--text-primary)',
    marginBottom: '25px',
    fontSize: '1.5rem'
  },
  cardTitleMobile: {
    fontSize: '1.25rem'
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
    fontSize: '15px'
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
    padding: '16px'
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
