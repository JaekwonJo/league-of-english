import React, { useState, useEffect } from 'react';
import { orderStyles } from './problemDisplayStyles';

const GrammarProblemDisplay = ({ problem, onAnswer, userAnswer, showResult }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer || null);
  const isCountType = problem.type === 'grammar_count';

  useEffect(() => {
    setSelectedAnswer(userAnswer || null);
  }, [userAnswer]);

  const handleSelect = (index) => {
    if (showResult) return; // 결과 표시 중일 때는 선택 불가
    
    setSelectedAnswer(index);
    onAnswer(index);
  };

  const getChoiceStyle = (index) => {
    const baseStyle = {
      ...orderStyles.multipleChoiceButton,
      width: '100%'
    };

    if (showResult) {
      if (index === problem.correctAnswer) {
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderColor: '#10b981',
          color: 'white'
        };
      } else if (index === selectedAnswer && index !== problem.correctAnswer) {
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          borderColor: '#dc2626',
          color: 'white'
        };
      }
    } else if (index === selectedAnswer) {
      return {
        ...baseStyle,
        ...orderStyles.multipleChoiceSelected
      };
    }

    return baseStyle;
  };

  // 밑줄 친 부분 렌더링 (《》를 밑줄로 변환)
  const renderTextWithUnderline = (text) => {
    if (!text) return text;
    
    // 《텍스트》 패턴을 밑줄로 변환
    return text.split(/(《[^》]*》)/).map((part, index) => {
      if (part.startsWith('《') && part.endsWith('》')) {
        const underlinedText = part.slice(1, -1); // 《》 제거
        return (
          <span
            key={index}
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
            {underlinedText}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* 출처 표시 */}
      {problem.source && (
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '10px',
          fontStyle: 'italic'
        }}>
          📌 출처: {problem.source}
        </div>
      )}
      
      {/* 어법문제 헤더 섹션 - 순서배열과 동일한 스타일 */}
      <div style={orderStyles.orderInstruction}>
        ✨ Q. {problem.question || '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?'}
      </div>

      {/* 개수 선택형일 때 본문 표시 */}
      {isCountType && problem.text && (
        <div style={{ 
          ...orderStyles.orderGivenText,
          marginBottom: '20px'
        }}>
          {renderTextWithUnderline(problem.text)}
        </div>
      )}

      {/* 선택지 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={orderStyles.sentencesLabel}>
          {isCountType ? '🔢 [오류 개수를 선택하세요]' : '📝 [정답을 선택하세요]'}
        </div>
        {problem.choices && problem.choices.map((choice, index) => (
          <button
            key={index}
            style={getChoiceStyle(index)}
            onClick={() => handleSelect(index)}
          >
            {isCountType ? choice : renderTextWithUnderline(choice)}
          </button>
        ))}
      </div>

      {/* 결과 및 해설 */}
      {showResult && (
        <div style={{
          ...orderStyles.orderGivenContainer,
          marginTop: '20px'
        }}>
          <div style={{
            ...orderStyles.orderGivenText,
            background: selectedAnswer === problem.correctAnswer ? 
              'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
              'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
              {selectedAnswer === problem.correctAnswer ? '✅ 정답입니다!' : '❌ 틀렸습니다.'}
            </div>
            
            <div style={{ fontSize: '14px', marginBottom: '12px' }}>
              정답: {problem.choices && problem.choices[problem.correctAnswer] ? 
                `${problem.correctAnswer + 1}번` : '정보 없음'}
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