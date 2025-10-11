/**
 * Study problem display shared styles
 */

export const problemDisplayStyles = {
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '24px',
    color: 'var(--text-primary)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    color: 'var(--text-secondary)'
  },
  progress: {
    fontSize: '18px',
    fontWeight: 700
  },
  timer: {
    fontSize: '16px',
    fontWeight: 600
  },
  problemCard: {
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '20px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px'
  },
  feedbackBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '12px 16px',
    marginBottom: '20px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    borderRadius: '14px',
    flexWrap: 'wrap'
  },
  feedbackLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  feedbackButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  feedbackButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '999px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  feedbackButtonActive: {
    borderColor: 'var(--accent-primary)',
    background: 'var(--accent-primary-pale)',
    color: 'var(--accent-primary-strong)'
  },
  feedbackButtonLoading: {
    opacity: 0.6,
    cursor: 'wait'
  },
  feedbackCount: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  feedbackError: {
    color: 'var(--danger)',
    fontSize: '13px'
  },
  feedbackHint: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  navButton: {
    padding: '12px 24px',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  nextButton: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 15px 35px rgba(99, 102, 241, 0.4)'
  },
  finishButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, var(--success) 0%, var(--success-strong) 100%)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 20px 40px rgba(16, 185, 129, 0.45)'
  },
  missingOptions: {
    padding: '12px 0',
    color: 'var(--danger)',
    fontSize: '14px'
  },
  underlineSpan: {
    textDecoration: 'underline',
    textDecorationColor: 'var(--warning-strong)',
    textDecorationThickness: '3px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    padding: '2px 4px',
    borderRadius: '4px',
    color: 'var(--text-primary)'
  }
};

export const orderStyles = {
  orderProblemCard: {
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.15)'
  },
  orderTitleSection: {
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    padding: '14px 20px',
    borderRadius: '12px',
    marginBottom: '10px',
    fontSize: '15px',
    fontWeight: 600,
    border: '1px solid var(--surface-border)'
  },
  orderNumberSection: {
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid var(--surface-border)'
  },
  orderSourceSection: {
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid var(--surface-border)'
  },
  orderInstruction: {
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    padding: '20px',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: 700,
    textAlign: 'left',
    marginBottom: '24px',
    border: '1px solid var(--surface-border)'
  },
  orderGivenContainer: {
    marginBottom: '24px'
  },
  orderGivenText: {
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.15)',
    padding: '22px',
    borderRadius: '12px',
    fontSize: '15px',
    lineHeight: 1.8,
    textAlign: 'left'
  },
  givenLabel: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--accent-primary)'
  },
  sentencesLabel: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '14px',
    color: 'var(--accent-primary)',
    textAlign: 'left'
  },
  orderSentence: {
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '12px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)',
    textAlign: 'left',
    whiteSpace: 'pre-line'
  },
  multipleChoiceButton: {
    width: '100%',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    padding: '14px 20px',
    borderRadius: '10px',
    marginBottom: '10px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
    textAlign: 'left',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  multipleChoiceSelected: {
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
    borderColor: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    transform: 'translateY(-2px)',
    boxShadow: '0 16px 30px rgba(99, 102, 241, 0.45)'
  }
};
