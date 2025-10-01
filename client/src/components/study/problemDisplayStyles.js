/**
 * Study problem display shared styles
 */

export const problemDisplayStyles = {
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '24px',
    color: 'var(--border-subtle)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    color: 'var(--color-slate-400)'
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
    background: 'linear-gradient(135deg, var(--color-slate-850) 0%, var(--color-slate-900) 100%)',
    color: 'var(--border-muted)',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '20px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    boxShadow: '0 25px 50px rgba(15, 23, 42, 0.4)'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px'
  },
  navButton: {
    padding: '12px 24px',
    background: 'var(--color-slate-800)',
    color: 'var(--color-slate-300)',
    border: '1px solid var(--color-slate-700)',
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
    color: 'var(--danger-soft)',
    fontSize: '14px'
  },
  underlineSpan: {
    textDecoration: 'underline',
    textDecorationColor: 'var(--warning)',
    textDecorationThickness: '3px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    padding: '2px 4px',
    borderRadius: '4px',
    color: 'var(--surface-soft-solid)'
  }
};

export const orderStyles = {
  orderProblemCard: {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    boxShadow: '0 30px 50px rgba(30, 64, 175, 0.25)'
  },
  orderTitleSection: {
    background: 'linear-gradient(135deg, var(--color-slate-800) 0%, var(--color-slate-850) 100%)',
    color: 'var(--border-muted)',
    padding: '14px 20px',
    borderRadius: '12px',
    marginBottom: '10px',
    fontSize: '15px',
    fontWeight: 600,
    border: '1px solid var(--color-slate-700)'
  },
  orderNumberSection: {
    background: 'linear-gradient(135deg, var(--color-slate-650) 0%, var(--color-slate-900) 100%)',
    color: 'var(--color-slate-350)',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid var(--color-slate-600)'
  },
  orderSourceSection: {
    background: 'linear-gradient(135deg, var(--color-slate-700) 0%, var(--color-slate-650) 100%)',
    color: 'var(--color-slate-400)',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid var(--color-slate-600)'
  },
  orderInstruction: {
    background: 'linear-gradient(135deg, var(--color-slate-900) 0%, var(--color-slate-850) 100%)',
    color: 'var(--surface-soft-solid)',
    padding: '20px',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: 700,
    textAlign: 'left',
    marginBottom: '24px',
    border: '1px solid rgba(148, 163, 184, 0.25)'
  },
  orderGivenContainer: {
    marginBottom: '24px'
  },
  orderGivenText: {
    background: 'linear-gradient(135deg, var(--color-slate-650) 0%, var(--color-slate-900) 100%)',
    color: 'var(--border-subtle)',
    border: '1px solid rgba(71, 85, 105, 0.6)',
    boxShadow: '0 15px 30px rgba(15, 23, 42, 0.35)',
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
    color: 'var(--color-slate-400)'
  },
  sentencesLabel: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '14px',
    color: 'var(--color-slate-400)',
    textAlign: 'left'
  },
  orderSentence: {
    background: 'linear-gradient(135deg, var(--color-slate-700) 0%, var(--color-slate-650) 100%)',
    color: 'var(--border-subtle)',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '12px',
    border: '1px solid var(--color-slate-600)',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.3)',
    textAlign: 'left',
    whiteSpace: 'pre-line'
  },
  multipleChoiceButton: {
    width: '100%',
    background: 'linear-gradient(135deg, var(--color-slate-650) 0%, var(--color-slate-900) 100%)',
    color: 'var(--border-subtle)',
    padding: '14px 20px',
    borderRadius: '10px',
    marginBottom: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.25)',
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

