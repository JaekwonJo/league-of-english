/**
 * 분석 관련 스타일 설정
 * 모든 분석 컴포넌트에서 공통으로 사용
 */

export const modalStyles = {
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
    width: '90%',
    maxWidth: '1200px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }
};

export const headerStyles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 30px',
    borderBottom: '1px solid var(--border-subtle)'
  },
  title: {
    color: 'var(--text-primary)',
    margin: '0 0 10px 0',
    fontSize: '1.5rem'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '5px'
  },
  documentInfo: {
    marginTop: '10px'
  },
  documentTitle: {
    color: 'var(--text-primary)',
    margin: '0 0 5px 0',
    fontSize: '1.1rem'
  },
  documentMeta: {
    color: 'var(--text-secondary)',
    margin: 0,
    fontSize: '14px'
  }
};

export const contentStyles = {
  content: {
    flex: 1,
    padding: '20px 30px',
    overflow: 'auto'
  },
  passageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  analyzeButton: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

export const loadingStyles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 30px',
    color: 'var(--text-secondary)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--border-subtle)',
    borderTop: '4px solid var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  }
};

export const statusStyles = {
  error: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--danger)'
  },
  info: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--text-secondary)'
  },
  cachedBadge: {
    background: 'var(--accent-primary-muted)',
    color: 'var(--info-strong)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'inline-block'
  }
};

export const navigationStyles = {
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderTop: '1px solid var(--border-subtle)'
  },
  prevButton: {
    background: 'var(--color-slate-500)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer'
  },
  nextButton: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer'
  },
  pageInfo: {
    color: 'var(--text-secondary)',
    fontSize: '14px'
  }
};
