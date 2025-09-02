/**
 * 문장삽입 문제 표시 컴포넌트
 */

import React from 'react';
import { orderStyles } from './problemDisplayStyles';

const InsertionProblemDisplay = ({ problem, userAnswer, onAnswer }) => {
  const handleChoiceClick = (choiceNumber) => {
    onAnswer(choiceNumber);
  };

  return (
    <>
      {/* 문장삽입 문제용 헤더 - 순서배열과 동일한 디자인 */}
      {problem.metadata && (
        <>
          <div style={orderStyles.orderTitleSection}>
            📚 제목: {problem.metadata.originalTitle || '문서'}
          </div>
          <div style={orderStyles.orderNumberSection}>
            📄 {problem.metadata.problemNumber || '문제번호'}
          </div>
        </>
      )}
      
      {/* 문장삽입 문제 지시문 */}
      <div style={orderStyles.orderInstruction}>
        ✨ Q. 글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.
      </div>

      {/* 주어진 문장 - 순서배열과 동일한 디자인 */}
      <div style={orderStyles.orderGivenContainer}>
        <div style={orderStyles.givenLabel}>🎯 [주어진 문장]</div>
        <div style={orderStyles.orderGivenText}>
          {problem.givenSentence || '주어진 문장 데이터 없음'}
        </div>
      </div>

      {/* 지문 (선택지 마커 포함) - 순서배열과 동일한 디자인 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={orderStyles.sentencesLabel}>📝 [지문]</div>
        <div style={orderStyles.orderSentence}>
          {problem.mainText || '지문 데이터 없음'}
        </div>
      </div>

      {/* 객관식 선택지 */}
      <div style={insertionStyles.choicesSection}>
        <div style={orderStyles.sentencesLabel}>🎲 [선택지]</div>
        <div style={insertionStyles.choicesGrid}>
          {(problem.multipleChoices || []).map((choice, idx) => (
            <button
              key={idx}
              style={{
                ...insertionStyles.choiceButton,
                ...(userAnswer === choice.number ? insertionStyles.choiceSelected : {})
              }}
              onClick={() => handleChoiceClick(choice.number)}
            >
              <strong>{choice.symbol}</strong>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

const insertionStyles = {
  container: {
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '25px',
    padding: '40px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    color: '#F8FAFC',
    lineHeight: '1.8'
  },
  questionHeader: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  questionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#F8FAFC',
    margin: 0
  },
  givenSentenceSection: {
    marginBottom: '30px',
    padding: '25px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '15px',
    border: '2px solid rgba(59, 130, 246, 0.3)'
  },
  givenSentenceLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: '15px',
    textAlign: 'center'
  },
  givenSentence: {
    fontSize: '18px',
    lineHeight: '1.7',
    textAlign: 'center',
    fontWeight: '500',
    color: '#F8FAFC'
  },
  mainTextSection: {
    marginBottom: '30px',
    padding: '30px',
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '15px',
    border: '1px solid rgba(248, 250, 252, 0.1)'
  },
  mainText: {
    fontSize: '17px',
    lineHeight: '1.8',
    color: '#F8FAFC',
    whiteSpace: 'pre-wrap'
  },
  choicesSection: {
    marginBottom: '30px'
  },
  choicesGrid: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  choiceButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '3px solid rgba(248, 250, 252, 0.3)',
    background: 'rgba(51, 65, 85, 0.8)',
    color: '#F8FAFC',
    fontSize: '24px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    ':hover': {
      borderColor: '#3B82F6',
      background: 'rgba(59, 130, 246, 0.2)',
      transform: 'scale(1.1)'
    }
  },
  choiceSelected: {
    borderColor: '#10B981',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.3))',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
    transform: 'scale(1.1)'
  },
  metadata: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    paddingTop: '20px',
    borderTop: '1px solid rgba(248, 250, 252, 0.1)',
    flexWrap: 'wrap'
  },
  metadataItem: {
    fontSize: '14px',
    color: '#94A3B8',
    padding: '8px 16px',
    background: 'rgba(51, 65, 85, 0.6)',
    borderRadius: '20px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    backdropFilter: 'blur(5px)'
  }
};

export default InsertionProblemDisplay;