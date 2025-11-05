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
    color: 'var(--text-primary)',
    fontSize: '2rem',
    margin: '0 0 10px 0'
  },
  subtitle: {
    color: 'var(--tone-strong)',
    fontSize: '1.1rem',
    margin: 0
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    color: 'var(--tone-strong)'
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
    color: 'var(--tone-strong)'
  },
  emptySearch: {
    textAlign: 'center',
    padding: '40px 20px',
    border: '1px dashed var(--border-muted)',
    borderRadius: '16px',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  searchRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px'
  },
  searchInput: {
    flex: '1 1 280px',
    minWidth: '220px',
    borderRadius: '12px',
    border: '1px solid var(--border-muted)',
    padding: '12px 14px',
    fontSize: '0.95rem',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)'
  },
  searchClear: {
    borderRadius: '12px',
    border: '1px solid var(--border-muted)',
    padding: '10px 18px',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px var(--surface-shadow)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid var(--border-muted)'
  },
  cardHeader: {
    marginBottom: '16px'
  },
  cardTitle: {
    color: 'var(--text-primary)',
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
    color: 'var(--tone-strong)',
    fontSize: '14px'
  },
  cardContent: {
    marginBottom: '16px'
  },
  cardContentSingle: {
    marginBottom: '16px',
    color: 'var(--tone-strong)',
    fontSize: '14px',
    lineHeight: 1.6
  },
  summary: {
    color: 'var(--tone-strong)',
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
    color: 'var(--tone-muted)',
    fontSize: '12px'
  },
  detailContainer: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px var(--surface-shadow)',
    overflow: 'hidden'
  },
  documentInfo: {
    background: 'var(--surface-soft-solid)',
    padding: '24px',
    borderBottom: '1px solid var(--border-muted)'
  },
  documentTitle: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    margin: '0 0 8px 0'
  },
  documentMeta: {
    color: 'var(--tone-strong)',
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
    color: 'var(--text-primary)',
    fontSize: '1.2rem',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid var(--border-muted)'
  },
  sectionContent: {
    color: 'var(--text-primary)',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

  variantTabs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  variantTab: {
    padding: '10px 18px',
    borderRadius: '999px',
    border: '1px solid var(--border-muted)',
    background: 'var(--surface-soft-solid)',
    color: 'var(--tone-strong)',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  variantTabActive: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    borderColor: 'transparent',
    boxShadow: '0 10px 18px var(--submit-shadow)'
  },
  variantToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  variantToolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  variantSelectAll: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 600,
    color: 'var(--tone-strong)'
  },
  variantSelectionInfo: {
    fontSize: '0.9rem',
    color: 'var(--tone-muted)'
  },
  variantDeleteButton: {
    border: '1px solid var(--danger-border)',
    background: 'var(--danger-surface)',
    color: 'var(--danger-strong)',
    borderRadius: '10px',
    padding: '10px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  },
  variantDeleteButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  variantSelectionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px'
  },
  variantSelectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid var(--border-muted)',
    background: 'var(--surface-soft)',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--tone-strong)'
  },
  variantMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '28px'
  },
  metaCard: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 12px 28px var(--surface-shadow)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)'
  },
  metaTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    marginBottom: '12px',
    color: 'var(--text-primary)'
  },
  metaList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: 1.6
  },
  sentenceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px'
  },
  sentenceCard: {
    padding: '0 0 28px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.35)'
  },
  sentenceCardLast: {
    borderBottom: 'none',
    paddingBottom: 0
  },
  sentenceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '10px'
  },
  sentenceTitleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px'
  },
  sentenceNumber: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--accent-primary)'
  },
  sentenceEnglish: {
    fontSize: '1.08rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em'
  },
  topicBadge: {
    padding: '4px 12px',
    borderRadius: '999px',
    background: 'rgba(244, 114, 182, 0.18)',
    color: '#F472B6',
    fontSize: '0.75rem',
    fontWeight: 700
  },
  sentenceKorean: {
    fontSize: '1.02rem',
    fontWeight: 500,
    color: 'var(--tone-strong)',
    marginBottom: '14px',
    lineHeight: 1.7
  },
  sentenceBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  sentenceSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  sentenceSectionEmphasis: {
    background: 'var(--surface-soft-solid)',
    borderRadius: '12px',
    padding: '12px 14px',
    border: '1px solid var(--border-subtle)'
  },
  sentenceLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--accent-primary)'
  },
  sentenceText: {
    fontSize: '0.98rem',
    lineHeight: 1.75,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap'
  },
  sentenceBlock: {
    fontSize: '0.98rem',
    lineHeight: 1.75,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap'
  },
  vocabList: {
    margin: '6px 0 0',
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  vocabListItem: {
    lineHeight: 1.7,
    fontSize: '0.96rem',
    color: 'var(--tone-strong)'
  },
  vocabMeta: {
    fontSize: '0.9rem',
    color: 'var(--tone-muted)',
    lineHeight: 1.5
  },
  emptyVariant: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '28px',
    textAlign: 'center',
    color: 'var(--tone-strong)',
    border: '1px dashed var(--border-muted)'
  },
  feedbackBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  feedbackButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--border-muted)',
    background: 'var(--surface-soft-solid)',
    color: 'var(--tone-strong)',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  feedbackButtonActive: {
    background: 'var(--success-surface)',
    borderColor: 'var(--success-strong)',
    color: 'var(--success-strong)',
    boxShadow: '0 6px 16px rgba(34, 197, 94, 0.25)'
  },
  feedbackCount: {
    fontSize: '0.9rem',
    color: 'var(--tone-muted)'
  },
  metaButtonGhost: {
    background: 'rgba(148, 163, 184, 0.18)',
    border: 'none',
    color: 'var(--tone-strong)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  metaButtonPrimary: {
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)',
    border: 'none',
    color: 'var(--text-on-accent)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)'
  },
  metaButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  reportButton: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--danger-border)',
    background: 'var(--danger-surface)',
    color: 'var(--danger-strong)',
    cursor: 'pointer',
    fontWeight: 600
  },
  feedbackMessage: {
    marginTop: '8px',
    color: 'var(--tone-strong)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContentSmall: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '420px',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)'
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '1.2rem',
    color: 'var(--text-primary)'
  },
  modalTextarea: {
    width: '100%',
    minHeight: '120px',
    borderRadius: '12px',
    border: '1px solid var(--border-muted)',
    padding: '12px',
    fontSize: '0.95rem',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '18px'
  },
  modalPrimaryButton: {
    background: 'var(--danger)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: 600
  },
  modalSecondaryButton: {
    background: 'var(--surface-soft-solid)',
    color: 'var(--tone-strong)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: 600
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
    color: 'var(--tone-strong)'
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
    color: 'var(--tone-strong)'
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
    color: 'var(--tone-strong)',
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
    color: 'var(--text-primary)',
    marginBottom: '20px'
  },

  studyGuide: {
    background: 'var(--info-surface)',
    border: '1px solid var(--info)',
    borderRadius: '8px',
    padding: '16px',
    color: 'var(--text-primary)',
    lineHeight: '1.6'
  },

  generationOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 12, 16, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1350,
    padding: '24px'
  },
  generationCard: {
    width: 'min(420px, 92%)',
    background: 'var(--surface-card)',
    borderRadius: 24,
    padding: '32px 36px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    textAlign: 'center',
    boxShadow: '0 32px 60px rgba(15, 23, 42, 0.35)'
  },
  generationBadge: {
    alignSelf: 'center',
    background: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--accent-primary)',
    padding: '4px 12px',
    borderRadius: 999,
    fontWeight: 600,
    letterSpacing: 1
  },
  generationTitle: {
    margin: 0,
    fontSize: '1.4rem',
    color: 'var(--text-primary)'
  },
  generationSubtitle: {
    margin: 0,
    color: 'var(--tone-strong)',
    lineHeight: 1.5
  },
  generationButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  generationButton: {
    minWidth: 120,
    padding: '12px 18px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 14px 30px rgba(99, 102, 241, 0.35)'
  },
  generationCancel: {
    alignSelf: 'center',
    marginTop: 4,
    background: 'none',
    border: 'none',
    color: 'var(--tone-muted)',
    cursor: 'pointer'
  },
  generationEmpty: {
    padding: 16,
    borderRadius: 12,
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)'
  },
  loadingCard: {
    width: 'min(460px, 94%)',
    padding: '38px 32px',
    borderRadius: 26,
    background: 'var(--surface-card)',
    boxShadow: '0 32px 60px rgba(15, 23, 42, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    textAlign: 'center'
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '6px solid rgba(148, 163, 184, 0.25)',
    borderTopColor: 'var(--accent-primary)',
    animation: 'spin 1s linear infinite'
  },
  loadingMessage: {
    margin: 0,
    fontSize: '1.1rem',
    color: 'var(--text-primary)'
  },
  loadingWordStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%'
  },
  loadingWordBox: {
    background: 'var(--surface-soft)',
    borderRadius: 14,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%'
  },
  loadingWord: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--accent-primary)'
  },
  loadingMeaning: {
    color: 'var(--tone-strong)'
  },
  loadingQuoteStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%'
  },
  loadingQuoteBox: {
    background: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 14,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%'
  },
  loadingQuote: {
    margin: 0,
    color: 'var(--tone-strong)',
    fontStyle: 'italic'
  },
  loadingQuoteAuthor: {
    alignSelf: 'flex-end',
    color: 'var(--tone-muted)',
    fontSize: '0.9rem'
  },
  word: {
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  },

  meaning: {
    color: 'var(--tone-strong)',
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
