/**
 * 순서배열 문제 전용 컴포넌트
 */

import React, { useCallback, useMemo, useState } from 'react';
import { orderStyles } from '../problemDisplayStyles';

const OrderProblemDisplay = ({ problem, parsedOrderData, onAnswer, userAnswer }) => {
  const sentences = useMemo(() => (
    problem.sentences || parsedOrderData?.sentences || [
      { label: 'A', text: '데이터 없음 A' },
      { label: 'B', text: '데이터 없음 B' },
      { label: 'C', text: '데이터 없음 C' },
    ]
  ), [problem, parsedOrderData]);

  const choices = useMemo(() => (
    problem.multipleChoices || parsedOrderData?.multipleChoices || null
  ), [problem, parsedOrderData]);

  const [sequence, setSequence] = useState([]);

  const handleToggleSentence = useCallback((label) => {
    setSequence((prev) => {
      const exists = prev.includes(label);
      if (exists) {
        return prev.filter((item) => item !== label);
      }
      return [...prev, label];
    });
  }, []);

  const handleResetSequence = useCallback(() => setSequence([]), []);

  return (
    <>
      {/* 순서배열 문제용 특별 헤더 - 통합된 섹션들 */}
      {(problem.metadata || parsedOrderData?.metadata) && (
        <>
          <div style={orderStyles.orderTitleSection}>
            📚 제목: {(problem.metadata?.originalTitle || parsedOrderData?.metadata.originalTitle || '문서')}
          </div>
          <div style={orderStyles.orderNumberSection}>
            📄 {(problem.metadata?.problemNumber || parsedOrderData?.metadata.problemNumber || '문제번호')}
          </div>
        </>
      )}
      
      {/* 순서배열 문제 지시문 */}
      <div style={orderStyles.orderInstruction}>
        ✨ Q. 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.
      </div>


      {/* 순서배열 주어진 문장 */}
      <div style={orderStyles.orderGivenContainer}>
        <div style={orderStyles.givenLabel}>🎯 [주어진 문장]</div>
        <div style={orderStyles.orderGivenText}>
          {problem.mainText || parsedOrderData?.mainText || '데이터 없음: 확인 중...'}
        </div>
      </div>

      {/* 순서배열 선택지 */}
      <div style={orderStyles.sequenceHelperRow}>
        <span style={orderStyles.sequenceHelperText}>🔢 순서를 직접 메모해 보세요. 다시 누르면 취소됩니다.</span>
        <button
          type="button"
          style={{
            ...orderStyles.sequenceResetButton,
            ...(sequence.length ? {} : orderStyles.sequenceResetButtonDisabled),
          }}
          onClick={handleResetSequence}
          disabled={!sequence.length}
        >
          초기화
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {sentences.map((sent) => {
          const orderIndex = sequence.indexOf(sent.label);
          const isSelected = orderIndex >= 0;
          const displayNumber = isSelected ? orderIndex + 1 : null;
          return (
            <button
              key={sent.label}
              type="button"
              style={{
                ...orderStyles.orderSentence,
                ...(isSelected ? orderStyles.orderSentenceSelected : {}),
              }}
              onClick={() => handleToggleSentence(sent.label)}
            >
              <div style={orderStyles.orderSentenceHeader}>
                <span style={orderStyles.orderSentenceTag}>{sent.label}</span>
                {displayNumber ? (
                  <span style={orderStyles.orderSequenceBadge}>{displayNumber}</span>
                ) : (
                  <span style={orderStyles.orderSequencePlaceholder}>＋</span>
                )}
              </div>
              <div style={orderStyles.orderSentenceBody}>{sent.text}</div>
            </button>
          );
        })}
      </div>

      <div style={orderStyles.sequenceSummary}>
        {sequence.length
          ? sequence.map((label, idx) => `${idx + 1}️⃣ ${label}`).join('  →  ')
          : '선택한 순서가 여기에 표시돼요. 차례대로 눌러 보세요!'}
      </div>

      {/* 객관식 선택지 */}
      {choices && (
        <div style={{ marginBottom: '20px' }}>
          <div style={orderStyles.sentencesLabel}>📝 [정답을 선택하세요]</div>
          {choices.map((choice, idx) => (
            <button
              key={idx}
              style={{
                ...orderStyles.multipleChoiceButton,
                ...(userAnswer === choice.number ? orderStyles.multipleChoiceSelected : {})
              }}
              onClick={() => typeof onAnswer === 'function' && onAnswer(choice.number)}
              disabled={typeof onAnswer !== 'function'}
            >
              <strong>{choice.symbol}</strong> {choice.value}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default OrderProblemDisplay;
