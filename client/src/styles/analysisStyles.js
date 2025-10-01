export const analysisStyles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Noto Sans KR', sans-serif"
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  backButton: {
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  title: {
    color: 'var(--color-slate-800)',
    fontSize: '2rem',
    margin: '0 0 10px 0'
  },
  subtitle: {
    color: 'var(--color-slate-500)',
    fontSize: '1.1rem',
    margin: 0
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    color: 'var(--color-slate-500)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--border-muted)',
    borderTop: '4px solid var(--indigo)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  error: {
    background: 'var(--danger-surface)',
    border: '1px solid var(--danger-border)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    color: 'var(--danger-strong)',
    margin: '20px 0'
  },
  retryButton: {
    background: 'var(--danger-strong)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '15px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: 'var(--color-slate-500)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid var(--border-muted)'
  },
  cardHeader: {
    marginBottom: '16px'
  },
  cardTitle: {
    color: 'var(--color-slate-800)',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    margin: '0 0 12px 0',
    lineHeight: '1.4'
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  badge: {
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  meta: {
    color: 'var(--color-slate-500)',
    fontSize: '14px'
  },
  cardContent: {
    marginBottom: '16px'
  },
  summary: {
    color: 'var(--color-slate-700)',
    lineHeight: '1.6',
    fontSize: '14px',
    margin: 0,
    display: '-webkit-box',
    webkitLineClamp: 3,
    webkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardFooter: {
    borderTop: '1px solid var(--border-muted)',
    paddingTop: '12px'
  },
  date: {
    color: 'var(--color-slate-400)',
    fontSize: '12px'
  },
  detailContainer: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  documentInfo: {
    background: 'var(--surface-soft-solid)',
    padding: '24px',
    borderBottom: '1px solid var(--border-muted)'
  },
  documentTitle: {
    color: 'var(--color-slate-800)',
    fontSize: '1.4rem',
    margin: '0 0 8px 0'
  },
  documentMeta: {
    color: 'var(--color-slate-500)',
    fontSize: '14px',
    margin: 0
  },
  content: {
    padding: '24px'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    color: 'var(--color-slate-800)',
    fontSize: '1.2rem',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid var(--border-muted)'
  },
  sectionContent: {
    color: 'var(--color-slate-700)',
    lineHeight: '1.7',
    fontSize: '15px'
  },
  list: {
    paddingLeft: '24px',
    margin: '0'
  },
  listItem: {
    marginBottom: '12px'
  },
  vocabularyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },
  vocabularyCard: {
    background: 'var(--surface-soft-strong)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)'
  },
  questionList: {
    paddingLeft: '24px',
    margin: '0',
    counterReset: 'question'
  },
  questionItem: {
    marginBottom: '16px',
    lineHeight: '1.6'
  },

  // 새로운 지문별 분석을 위한 추가 스타일들
  secondaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },

  clickHint: {
    color: 'var(--indigo)',
    fontSize: '0.9rem',
    fontWeight: '500'
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    color: 'var(--color-slate-500)'
  },

  errorContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--danger-strong)'
  },

  secondaryRetryButton: {
    background: 'var(--danger-strong)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    marginTop: '10px'
  },

  compactEmptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--color-slate-500)'
  },

  analyzeButton: {
    background: 'var(--success)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '20px'
  },

  passageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },

  passageCard: {
    background: 'var(--surface-card)',
    borderRadius: '12px',
    border: '1px solid var(--border-muted)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  passageHeader: {
    padding: '16px',
    borderBottom: '1px solid var(--surface-soft-muted)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface-soft-solid)'
  },

  passageBadge: {
    background: 'var(--success-surface-strong)',
    color: 'var(--success-strong)',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500'
  },

  passagePreview: {
    padding: '16px',
    color: 'var(--color-slate-600)',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },

  passageFooter: {
    padding: '12px 16px',
    background: 'var(--surface-soft-shell)',
    borderTop: '1px solid var(--surface-soft-muted)',
    color: 'var(--indigo)',
    fontSize: '0.9rem',
    fontWeight: '500'
  },

  analysisContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },

  originalText: {
    background: 'var(--surface-soft-solid)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '20px',
    fontSize: '1rem',
    lineHeight: '1.7',
    color: 'var(--color-slate-800)',
    marginBottom: '20px'
  },

  studyGuide: {
    background: 'var(--info-surface)',
    border: '1px solid var(--info)',
    borderRadius: '8px',
    padding: '16px',
    color: 'var(--color-slate-800)',
    lineHeight: '1.6'
  },

  word: {
    fontWeight: 'bold',
    color: 'var(--color-slate-650)',
    marginBottom: '4px'
  },

  meaning: {
    color: 'var(--color-slate-500)',
    fontSize: '0.9rem'
  },

  vocabularyItem: {
    background: 'var(--surface-soft-strong)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column'
  },

  bulletList: {
    paddingLeft: '20px'
  },

  bulletItem: {
    marginBottom: '8px',
    lineHeight: '1.6'
  }
};

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .analysis-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(style);
