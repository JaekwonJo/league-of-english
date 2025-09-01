/**
 * ProblemDisplay 컴포넌트 스타일
 */

export const problemDisplayStyles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  progress: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  timer: {
    fontSize: '18px',
    color: '#667eea'
  },
  problemCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  instruction: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#111827'
  },
  mainText: {
    fontSize: '15px',
    lineHeight: '1.8',
    marginBottom: '20px',
    padding: '20px',
    background: '#F9FAFB',
    borderRadius: '10px'
  },
  insertText: {
    fontSize: '15px',
    padding: '15px',
    background: '#FEF3C7',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  sentences: {
    marginBottom: '20px'
  },
  sentence: {
    fontSize: '15px',
    lineHeight: '1.8',
    marginBottom: '10px'
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  optionButton: {
    padding: '15px',
    background: 'white',
    border: '2px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s'
  },
  selected: {
    background: '#EBF5FF',
    borderColor: '#3B82F6'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px'
  },
  navButton: {
    padding: '12px 24px',
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  nextButton: {
    padding: '12px 24px',
    background: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  finishButton: {
    padding: '15px 35px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
    transform: 'translateY(0)'
  }
};

export const orderStyles = {
  // 순서배열 전용 스타일
  orderProblemCard: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
    border: '2px solid rgba(139, 92, 246, 0.2)',
    boxShadow: '0 25px 50px rgba(139, 92, 246, 0.2)'
  },
  // 분리된 헤더 섹션들
  orderTitleSection: {
    background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
    color: '#E5E7EB',
    padding: '15px 20px',
    borderRadius: '10px',
    marginBottom: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '2px solid #374151',
    textAlign: 'left'
  },
  orderNumberSection: {
    background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
    color: '#CBD5E1',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: '600',
    border: '2px solid #4B5563',
    textAlign: 'left'
  },
  orderSourceSection: {
    background: 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
    color: '#94A3B8',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '600',
    border: '2px solid #6B7280',
    textAlign: 'left'
  },
  orderInstruction: {
    background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
    color: '#E5E7EB',
    padding: '20px',
    borderRadius: '15px',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    border: '2px solid #374151'
  },
  orderOptionButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid transparent',
    fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(0) scale(1)',
    transition: 'all 0.3s ease',
    textAlign: 'left'
  },
  orderSelected: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderColor: '#10b981',
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
  },
  // 순서배열 전용 텍스트 박스 스타일
  orderGivenContainer: {
    marginBottom: '25px'
  },
  orderGivenText: {
    background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
    color: '#E5E7EB',
    border: '2px solid #374151',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    padding: '20px',
    borderRadius: '10px',
    fontSize: '15px',
    lineHeight: '1.8',
    textAlign: 'left'
  },
  givenLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#6B7280'
  },
  sentencesLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#6B7280',
    textAlign: 'left'
  },
  orderSentence: {
    background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
    color: '#E5E7EB',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '10px',
    border: '2px solid #4B5563',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
    textAlign: 'left'
  }
};