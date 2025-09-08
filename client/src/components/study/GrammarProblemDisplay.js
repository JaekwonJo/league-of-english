import React, { useState, useEffect } from 'react';
import { orderStyles } from './problemDisplayStyles';

const GrammarProblemDisplay = ({ problem, onAnswer, userAnswer, showResult }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer || null);
  const isCountType = problem.type === 'grammar_count';

  useEffect(() => {
    setSelectedAnswer(userAnswer || null);
  }, [userAnswer]);

  const handleSelect = (index) => {
    if (showResult) return;
    setSelectedAnswer(index);
    onAnswer(index);
  };

  const getChoiceStyle = (index) => {
    const baseStyle = { ...orderStyles.multipleChoiceButton, width: '100%' };
    if (showResult) {
      if (index === problem.correctAnswer) {
        return { ...baseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981', color: 'white' };
      } else if (index === selectedAnswer && index !== problem.correctAnswer) {
        return { ...baseStyle, background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', borderColor: '#dc2626', color: 'white' };
      }
    } else if (index === selectedAnswer) {
      return { ...baseStyle, ...orderStyles.multipleChoiceSelected };
    }
    return baseStyle;
  };

  // Allow underline markup via <u>...</u> and legacy ??word?? markers
  const renderTextWithUnderline = (text) => {
    if (!text) return text;
    const str = String(text);
    if (str.includes('<u>')) {
      const sanitized = str
        .replace(/<\/(?!u\b)[^>]*>/gi, '')
        .replace(/<(?!u\b)[^>]+>/gi, (m) => m.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      return <span dangerouslySetInnerHTML={{ __html: sanitized }} style={{ lineHeight: 1.6 }} />;
    }
    const parts = str.split('??');
    if (parts.length <= 1) return text;
    return parts.map((part, idx) => (
      idx % 2 === 1 ? (
        <span
          key={idx}
          style={{
            textDecoration: 'underline',
            textDecorationColor: '#fbbf24',
            textDecorationThickness: '3px',
            fontWeight: 'bold',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            padding: '2px 4px',
            borderRadius: '4px',
            color: 'inherit'
          }}
        >
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    ));
  };

  return (
    <>
      {problem.source && (
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px', fontStyle: 'italic' }}>
          출처: {problem.source}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>
        Q. {problem.question || '다음 글의 밑줄 친 부분에 문법 오류가 있는 것은?'}
      </div>

      {isCountType && problem.text && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px' }}>
          {renderTextWithUnderline(problem.text)}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={orderStyles.sentencesLabel}>
          {isCountType ? '아래에서 [오류 개수]를 선택하세요' : '아래에서 [정답]을 선택하세요'}
        </div>
        {problem.choices && problem.choices.map((choice, index) => (
          <button key={index} style={getChoiceStyle(index)} onClick={() => handleSelect(index + 1)}>
            {isCountType ? choice : renderTextWithUnderline(choice)}
          </button>
        ))}
      </div>

      {showResult && (
        <div style={{ ...orderStyles.orderGivenContainer, marginTop: '20px' }}>
          <div
            style={{
              ...orderStyles.orderGivenText,
              background:
                selectedAnswer === problem.correctAnswer
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
              {selectedAnswer === problem.correctAnswer ? '정답입니다!' : '아쉽습니다!'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '12px' }}>
              정답: {problem.choices && problem.choices[problem.correctAnswer] ? `${problem.correctAnswer + 1}` : '정보 없음'}
            </div>
            {problem.explanation && (
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <strong>해설:</strong> {problem.explanation}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GrammarProblemDisplay;

