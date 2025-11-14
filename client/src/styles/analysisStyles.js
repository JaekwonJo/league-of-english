export const analysisStyles = {
  container: {
    padding: '28px 20px 72px',
    maxWidth: '1080px',
    margin: '0 auto',
    fontFamily: "'Noto Sans KR', sans-serif"
  },
  header: {
    marginBottom: '28px',
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
    fontSize: '2.1rem',
    margin: '0 0 10px 0',
    letterSpacing: '-0.01em'
  },
  subtitle: {
    color: 'var(--tone-strong)',
    fontSize: '1.05rem',
    margin: 0
  },
  sectionGuideRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  docHero: {
    position: 'relative',
    padding: '44px 36px',
    borderRadius: '34px',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,64,175,0.65) 45%, rgba(14,165,233,0.45) 100%)',
    boxShadow: '0 40px 80px rgba(15, 23, 42, 0.45)',
    overflow: 'hidden',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '32px',
    alignItems: 'center',
    marginBottom: '36px'
  },
  docHeroGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 55%), radial-gradient(circle at 85% 25%, rgba(129,140,248,0.25), transparent 45%), radial-gradient(circle at 70% 80%, rgba(45,212,191,0.28), transparent 50%)',
    pointerEvents: 'none'
  },
  docHeroContent: {
    position: 'relative',
    zIndex: 1,
    flex: '1 1 380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  docHeroBadge: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    borderRadius: '999px',
    background: 'rgba(15,23,42,0.4)',
    color: '#fef9f0',
    fontWeight: 700,
    fontSize: '0.86rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    boxShadow: '0 18px 32px rgba(15,23,42,0.28)'
  },
  docHeroHeadline: {
    margin: 0,
    fontSize: '2.4rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'rgba(248, 250, 252, 0.98)'
  },
  docHeroSub: {
    margin: 0,
    color: 'rgba(248, 250, 252, 0.9)',
    fontSize: '1.05rem',
    lineHeight: 1.7,
    maxWidth: '520px'
  },
  docHeroSearchRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '480px'
  },
  docSearchInput: {
    flex: '1 1 auto',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(255, 255, 255, 0.92)',
    padding: '15px 20px',
    fontSize: '1rem',
    boxShadow: '0 12px 30px rgba(79, 70, 229, 0.2)',
    color: 'var(--text-primary)'
  },
  docSearchClear: {
    borderRadius: '16px',
    border: 'none',
    padding: '12px 16px',
    background: 'rgba(79, 70, 229, 0.12)',
    color: '#4338CA',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(79, 70, 229, 0.18)'
  },
  docSearchButton: {
    borderRadius: '16px',
    border: 'none',
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(79,70,229,1) 0%, rgba(14,165,233,1) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 18px 36px rgba(79, 70, 229, 0.28)'
  },
  docHeroNote: {
    margin: 0,
    fontSize: '0.92rem',
    color: 'rgba(248,250,252,0.85)'
  },
  docHeroStatPill: {
    marginTop: '12px',
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(15,23,42,0.3)',
    color: '#f8fafc',
    fontWeight: 600,
    boxShadow: '0 22px 40px rgba(15,23,42,0.35)'
  },
  docCategoryStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginTop: '30px'
  },
  docCategorySection: {
    background: 'var(--surface-card)',
    borderRadius: '26px',
    padding: '20px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 18px 36px rgba(15, 23, 42, 0.16)'
  },
  docCategoryHeaderButton: {
    width: '100%',
    border: 'none',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '18px',
    padding: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    color: '#e2e8f0',
    boxShadow: '0 16px 32px rgba(15,23,42,0.35)'
  },
  docCategoryHeaderButtonCollapsed: {
    background: 'rgba(15,23,42,0.35)'
  },
  docCategoryHeaderText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'left'
  },
  docCategoryTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#f8fafc'
  },
  docCategoryDescription: {
    fontSize: '0.92rem',
    color: 'rgba(226, 232, 240, 0.75)'
  },
  docCategoryToggle: {
    fontWeight: 700,
    color: '#cbd5f5'
  },
  docCategoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '18px',
    marginTop: '18px'
  },
  documentCard: {
    position: 'relative',
    padding: '20px',
    borderRadius: '24px',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    color: '#f8fafc',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  docGlassHeader: {
    position: 'relative',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: '18px',
    padding: '16px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 14px 28px rgba(15,23,42,0.25)'
  },
  docBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  docBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(15,23,42,0.5)',
    color: '#e0e7ff',
    fontWeight: 700,
    fontSize: '0.78rem',
    border: '1px solid rgba(255,255,255,0.25)'
  },
  docCodePill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(14,165,233,0.18)',
    color: '#bae6fd',
    fontWeight: 700,
    fontSize: '0.78rem',
    border: '1px solid rgba(14,165,233,0.35)'
  },
  docGradePill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(129,140,248,0.18)',
    color: '#c7d2fe',
    fontWeight: 700,
    fontSize: '0.78rem',
    border: '1px solid rgba(129,140,248,0.35)'
  },
  docGlassSub: {
    margin: 0,
    color: 'rgba(248,250,252,0.92)',
    fontSize: '0.95rem',
    lineHeight: 1.6
  },
  documentCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '12px'
  },
  documentCardTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'rgba(248,250,252,0.96)',
    letterSpacing: '-0.01em'
  },
  documentCardBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px'
  },
  documentCardBadge: {
    padding: '4px 12px',
    borderRadius: '999px',
    background: 'rgba(15,23,42,0.45)',
    color: '#e0f2fe',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  documentCardDescription: {
    fontSize: '0.98rem',
    lineHeight: 1.7,
    color: 'rgba(248,250,252,0.9)'
  },
  documentCardMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '0.85rem'
  },
  documentCardMeta: {
    color: 'rgba(226, 232, 240, 0.85)'
  },
  documentCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '18px',
    gap: '14px'
  },
  documentCardHint: {
    fontSize: '0.9rem',
    color: 'rgba(248,250,252,0.88)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  documentCardPill: {
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.24)',
    color: '#f0f9ff',
    fontWeight: 700,
    fontSize: '0.82rem'
  },
  passageMetaWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%'
  },
  passageLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    width: '100%'
  },
  passageLabelText: {
    fontWeight: 700,
    fontSize: '1rem',
    color: '#f8fafc'
  },
  passageLabelEdit: {
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e7ff',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: '6px 12px',
    cursor: 'pointer'
  },
  passageStatChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '12px',
    background: 'rgba(24, 32, 68, 0.6)',
    color: 'rgba(248,250,252,0.78)',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  passageStatValue: {
    fontSize: '0.98rem',
    fontWeight: 800,
    color: 'rgba(248,250,252,0.92)'
  },
  passageMetaButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%'
  },
  passageMetaGhost: {
    borderRadius: '999px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    padding: '10px 18px',
    cursor: 'pointer',
    width: '100%'
  },
  passageMetaPrimary: {
    borderRadius: '999px',
    border: '1px solid transparent',
    padding: '10px 18px',
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)',
    width: '100%'
  },
  passageMetaDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    boxShadow: 'none'
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
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    padding: '28px',
    borderBottom: '1px solid rgba(148,163,184,0.28)'
  },
  documentTitle: {
    color: '#f8fafc',
    fontSize: '1.6rem',
    margin: '0 0 10px 0',
    letterSpacing: '-0.01em'
  },
  documentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#e0e7ff',
    fontSize: '0.92rem',
    margin: 0
  },
  documentMetaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#e0e7ff',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  content: {
    padding: '24px'
  },
  section: {
    marginBottom: '36px'
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: '1.3rem',
    marginBottom: '18px',
    paddingBottom: '10px',
    borderBottom: '2px solid rgba(99, 102, 241, 0.35)',
    letterSpacing: '-0.01em'
  },
  sectionContent: {
    color: '#e2e8f0',
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

  variantHero: {
    background: 'linear-gradient(145deg, rgba(24, 32, 68, 0.95), rgba(30, 64, 175, 0.65))',
    borderRadius: '28px',
    padding: '28px 30px',
    marginBottom: '28px',
    boxShadow: '0 34px 52px rgba(15, 23, 42, 0.55)'
  },
  variantHeroRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  variantHeroPill: {
    background: 'rgba(255, 255, 255, 0.12)',
    padding: '6px 14px',
    borderRadius: '999px',
    color: '#e0e7ff',
    fontWeight: 600,
    fontSize: '0.88rem',
    border: '1px solid rgba(255, 255, 255, 0.25)'
  },
  variantHeroBadge: {
    background: 'rgba(14, 165, 233, 0.2)',
    color: '#bae6fd',
    padding: '6px 14px',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.88rem'
  },
  variantHeroTitle: {
    margin: '0 0 10px',
    color: '#f8fafc',
    fontSize: '1.6rem',
    letterSpacing: '-0.01em'
  },
  variantHeroSubtitle: {
    margin: 0,
    color: 'rgba(226, 232, 240, 0.85)',
    fontSize: '1rem',
    lineHeight: 1.6
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
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  variantTabActive: {
    background: 'linear-gradient(135deg, rgba(79,70,229,1), rgba(14,165,233,1))',
    color: '#f8fafc',
    borderColor: 'transparent',
    boxShadow: '0 12px 24px rgba(14,165,233,0.35)'
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
    background: 'linear-gradient(150deg, rgba(17,24,39,0.92), rgba(37,99,235,0.45))',
    borderRadius: '20px',
    padding: '22px',
    boxShadow: '0 24px 44px rgba(15, 23, 42, 0.45)',
    color: '#f8fafc',
    border: '1px solid rgba(148, 163, 184, 0.3)'
  },
  metaTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#f8fafc'
  },
  metaList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: 1.6,
    color: 'rgba(226, 232, 240, 0.9)'
  },
  sentenceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sentenceCard: {
    padding: '24px 26px',
    borderRadius: '20px',
    background: 'linear-gradient(150deg, rgba(17, 24, 39, 0.92), rgba(30, 64, 175, 0.55))',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.45)',
    border: '1px solid rgba(99, 102, 241, 0.25)'
  },
  sentenceCardLast: {
    boxShadow: '0 16px 36px rgba(79, 70, 229, 0.18)'
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
    color: '#c7d2fe'
  },
  sentenceEnglish: {
    fontSize: '1.08rem',
    fontWeight: 600,
    color: '#f8fafc',
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
    color: '#e2e8f0',
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
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px 14px',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  sentenceLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#c7d2fe'
  },
  sentenceText: {
    fontSize: '0.98rem',
    lineHeight: 1.75,
    color: '#e2e8f0',
    whiteSpace: 'pre-wrap'
  },
  sentenceBlock: {
    fontSize: '0.98rem',
    lineHeight: 1.75,
    color: '#e2e8f0',
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
    color: '#f8fafc'
  },
  vocabMeta: {
    fontSize: '0.9rem',
    color: 'rgba(226, 232, 240, 0.75)',
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
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  metaButtonPrimary: {
    background: 'linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(14,165,233,1) 100%)',
    border: 'none',
    color: '#f8fafc',
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
  modalInput: {
    width: '100%',
    borderRadius: '10px',
    border: '1px solid var(--border-muted)',
    padding: '10px 12px',
    fontSize: '0.95rem',
    fontFamily: 'inherit'
  },
  modalHint: {
    margin: '0 0 8px 0',
    fontSize: '0.9rem',
    color: 'var(--tone-muted)'
  },
  modalError: {
    margin: '6px 0 0 0',
    fontSize: '0.85rem',
    color: 'var(--danger)'
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
    maxWidth: '880px',
    margin: '0 auto',
    color: '#e2e8f0'
  },

  originalText: {
    background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(30, 64, 175, 0.65))',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '24px',
    padding: '26px',
    fontSize: '1.02rem',
    lineHeight: '1.74',
    color: '#e2e8f0',
    marginBottom: '28px',
    boxShadow: '0 24px 44px rgba(15, 23, 42, 0.45)'
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
  loadingWordActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 6
  },
  loadingMoreButton: {
    padding: '8px 14px',
    borderRadius: 12,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(15, 23, 42, 0.12)'
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
  loadingQuoteTranslation: {
    margin: 0,
    color: 'var(--tone-strong)',
    fontSize: '0.95rem'
  },
  word: {
    fontWeight: 'bold',
    color: '#fef9f0',
    marginBottom: '4px'
  },

  meaning: {
    color: 'rgba(226, 232, 240, 0.85)',
    fontSize: '0.9rem'
  },

  vocabularyItem: {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(148,163,184,0.3)',
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
