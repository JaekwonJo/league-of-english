export const adminStyles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Noto Sans KR', sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    color: 'var(--color-slate-800)',
    margin: 0,
    fontSize: '2rem'
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
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
  cardTitle: {
    color: 'var(--color-slate-800)',
    marginBottom: '25px',
    fontSize: '1.5rem'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: 'var(--color-slate-400)',
    fontSize: '18px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '50px',
    color: 'var(--color-slate-400)',
    fontSize: '18px'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  documentCard: {
    background: 'var(--surface-soft-solid)',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid var(--border-subtle)',
    transition: 'all 0.3s'
  },
  documentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  documentTitle: {
    color: 'var(--color-slate-800)',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    flex: 1,
    marginRight: '10px'
  },
  documentActions: {
    display: 'flex',
    gap: '5px'
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
  badge: {
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  meta: {
    color: 'var(--color-slate-500)',
    fontSize: '14px'
  },
  documentFooter: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '10px',
    marginTop: '15px'
  },
  date: {
    color: 'var(--color-slate-400)',
    fontSize: '12px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.55)',
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
  modalTitle: {
    color: 'var(--color-slate-800)',
    marginBottom: '25px',
    fontSize: '1.4rem'
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
    color: 'var(--color-slate-700)',
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
    color: 'var(--color-slate-500)',
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
    color: 'var(--color-slate-500)',
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
    color: 'var(--color-slate-700)',
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
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  feedbackBadge: {
    background: 'var(--danger-surface)',
    color: 'var(--danger-strong)',
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
  feedbackMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '12px',
    color: 'var(--color-slate-500)'
  },
  feedbackReason: {
    background: 'var(--surface-soft-strong)',
    borderRadius: '12px',
    padding: '12px',
    color: 'var(--color-slate-700)',
    lineHeight: 1.6,
    marginBottom: '12px'
  },
  feedbackActions: {
    display: 'flex',
    gap: '10px'
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
    color: 'var(--color-slate-600)',
    border: '1px solid var(--border-muted)',
    borderRadius: '10px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 600
  },
  feedbackEmpty: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--color-slate-400)'
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
    color: 'var(--color-slate-500)',
    fontSize: '13px'
  },
  notificationType: {
    fontWeight: 600
  },
  notificationTimestamp: {
    fontStyle: 'italic'
  },
  notificationPayload: {
    color: 'var(--color-slate-600)',
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
