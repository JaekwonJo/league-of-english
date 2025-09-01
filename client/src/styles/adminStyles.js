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
    color: '#1f2937',
    margin: 0,
    fontSize: '2rem'
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
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
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '12px',
    padding: '10px 22px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  cardTitle: {
    color: '#1f2937',
    marginBottom: '25px',
    fontSize: '1.5rem'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#9ca3af',
    fontSize: '18px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '50px',
    color: '#9ca3af',
    fontSize: '18px'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  documentCard: {
    background: '#f8fafc',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s'
  },
  documentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  documentTitle: {
    color: '#1f2937',
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
  editButton: {
    background: '#fbbf24',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  deleteButton: {
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'white',
    transition: 'all 0.3s'
  },
  documentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  badge: {
    background: '#667eea',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  meta: {
    color: '#6b7280',
    fontSize: '14px'
  },
  documentFooter: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '10px',
    marginTop: '15px'
  },
  date: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    color: '#1f2937',
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
    color: '#374151',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  fileInput: {
    padding: '10px',
    border: '2px dashed #d1d5db',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  fileHelp: {
    color: '#6b7280',
    fontSize: '12px'
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  cancelButton: {
    background: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
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
    background: '#e5e7eb',
    color: '#374151',
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
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  }
};