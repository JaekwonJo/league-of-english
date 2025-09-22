import React, { useState, useEffect } from 'react';
import { orderStyles } from './problemDisplayStyles';

const underlineStyle = {
  textDecoration: 'underline',
  textDecorationColor: '#fbbf24',
  textDecorationThickness: '3px',
  fontWeight: 'bold',
  backgroundColor: 'rgba(251, 191, 36, 0.2)',
  padding: '2px 4px',
  borderRadius: '4px',
  color: 'inherit'
};

const GrammarProblemDisplay = ({ problem, onAnswer, userAnswer, showResult }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer || null);
  const isCountType = problem.type === 'grammar_count';
  const isSpanType = problem.type === 'grammar_span';

  useEffect(() => {
    setSelectedAnswer(userAnswer || null);
  }, [userAnswer]);

  const normalizedCorrect = Number(problem.correctAnswer ?? problem.answer ?? 0);

  const handleSelect = (choiceNumber) => {
    if (showResult) return;
    const value = Number(choiceNumber);
    setSelectedAnswer(value);
    onAnswer(String(value));
  };

  const getChoiceStyle = (choiceNumber) => {
    const baseStyle = { ...orderStyles.multipleChoiceButton, width: '100%' };
    const selected = Number(selectedAnswer);

    if (showResult) {
      if (choiceNumber === normalizedCorrect) {
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderColor: '#10b981',
          color: 'white'
        };
      }
      if (choiceNumber === selected && choiceNumber !== normalizedCorrect) {
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          borderColor: '#dc2626',
          color: 'white'
        };
      }
    } else if (choiceNumber === selected) {
      return { ...baseStyle, ...orderStyles.multipleChoiceSelected };
    }

    return baseStyle;
  };

  const renderTextWithUnderline = (input) => {
    if (!input) return null;
    let str = String(input);

    // Normalize custom markers like <<1>>text<</1>> to <u>text</u>
    str = str.replace(/<<\s*(\d+)\s*>>/g, '<u>').replace(/<\/\s*(\d+)\s*>>/g, '</u>');

    const tokens = str.split(/(<\/?u>)/i);
    if (tokens.length === 1) {
      return <>{str}</>;
    }

    const elements = [];
    let underline = false;

    tokens.forEach((token, idx) => {
      const lower = token.toLowerCase();
      if (lower === '<u>') {
        underline = true;
        return;
      }
      if (lower === '</u>') {
        underline = false;
        return;
      }
      if (!token) return;
      if (underline) {
        elements.push(
          <span key={`underline-${idx}`} style={underlineStyle}>
            {token}
          </span>
        );
      } else {
        elements.push(<React.Fragment key={`text-${idx}`}>{token}</React.Fragment>);
      }
    });

    if (elements.length === 0) {
      return <>{str}</>;
    }

    return <span style={{ lineHeight: 1.6 }}>{elements}</span>;
  };

  const rawChoices = problem.choices || problem.options || problem.multipleChoices || [];
  const choiceList = rawChoices.length
    ? rawChoices.map((choice) => {
        if (choice && typeof choice === 'object') {
          if (typeof choice.value === 'string') return choice.value;
          if (typeof choice.text === 'string') return choice.text;
          if (typeof choice.label === 'string' && typeof choice.content === 'string') {
            return `${choice.label}. ${choice.content}`;
          }
        }
        return choice;
      })
    : [];

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

      {(isCountType || isSpanType) && (problem.text || problem.mainText) && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {renderTextWithUnderline(problem.text || problem.mainText)}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={orderStyles.sentencesLabel}>
          {isCountType ? '아래에서 [오류 개수]를 선택하세요' : '아래에서 [정답]을 선택하세요'}
        </div>
        {choiceList.length === 0 ? (
          <div style={{ color: '#dc2626', padding: '12px 0' }}>
            선택지가 준비되지 않았어요. 관리자에게 문의해주세요.
          </div>
        ) : (
          choiceList.map((choice, index) => {
            const choiceNumber = index + 1;
            return (
              <button
                key={index}
                style={getChoiceStyle(choiceNumber)}
                onClick={() => handleSelect(choiceNumber)}
              >
                {isCountType ? choice : renderTextWithUnderline(choice)}
              </button>
            );
          })
        )}
      </div>

      {showResult && (
        <div style={{ ...orderStyles.orderGivenContainer, marginTop: '20px' }}>
          <div
            style={{
              ...orderStyles.orderGivenText,
              background:
                Number(selectedAnswer) === normalizedCorrect
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
              {Number(selectedAnswer) === normalizedCorrect ? '정답입니다!' : '아쉽습니다!'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '12px' }}>
              정답: {normalizedCorrect || '정보 없음'}
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
