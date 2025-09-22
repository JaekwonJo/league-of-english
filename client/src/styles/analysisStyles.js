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
    background: '#6366f1',
    color: 'white',
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
    color: '#1f2937',
    fontSize: '2rem',
    margin: '0 0 10px 0'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    margin: 0
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    color: '#dc2626',
    margin: '20px 0'
  },
  retryButton: {
    background: '#dc2626',
    color: 'white',
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
    color: '#6b7280'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    marginBottom: '16px'
  },
  cardTitle: {
    color: '#1f2937',
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
    background: '#6366f1',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  meta: {
    color: '#6b7280',
    fontSize: '14px'
  },
  cardContent: {
    marginBottom: '16px'
  },
  summary: {
    color: '#374151',
    lineHeight: '1.6',
    fontSize: '14px',
    margin: 0,
    display: '-webkit-box',
    webkitLineClamp: 3,
    webkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardFooter: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px'
  },
  date: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  detailContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  documentInfo: {
    background: '#f8fafc',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  documentTitle: {
    color: '#1f2937',
    fontSize: '1.4rem',
    margin: '0 0 8px 0'
  },
  documentMeta: {
    color: '#6b7280',
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
    color: '#1f2937',
    fontSize: '1.2rem',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e5e7eb'
  },
  sectionContent: {
    color: '#374151',
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
    background: '#f1f5f9',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
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
    color: '#6366f1',
    fontSize: '0.9rem',
    fontWeight: '500'
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },

  errorContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#dc2626'
  },

  secondaryRetryButton: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    marginTop: '10px'
  },

  compactEmptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },

  analyzeButton: {
    background: '#10b981',
    color: 'white',
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
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  passageHeader: {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc'
  },

  passageBadge: {
    background: '#dcfce7',
    color: '#16a34a',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500'
  },

  passagePreview: {
    padding: '16px',
    color: '#4b5563',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },

  passageFooter: {
    padding: '12px 16px',
    background: '#f9fafb',
    borderTop: '1px solid #f3f4f6',
    color: '#6366f1',
    fontSize: '0.9rem',
    fontWeight: '500'
  },

  analysisContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },

  originalText: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    fontSize: '1rem',
    lineHeight: '1.7',
    color: '#1f2937',
    marginBottom: '20px'
  },

  studyGuide: {
    background: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: '8px',
    padding: '16px',
    color: '#1f2937',
    lineHeight: '1.6'
  },

  word: {
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '4px'
  },

  meaning: {
    color: '#64748b',
    fontSize: '0.9rem'
  },

  vocabularyItem: {
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
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