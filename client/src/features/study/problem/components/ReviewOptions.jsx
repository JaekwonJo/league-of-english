import React from 'react';
import reviewStyles from '../problemReviewStyles';
import { problemDisplayStyles } from '../problemDisplayStyles';
import { renderWithUnderline } from '../utils/textFormatters';

const formatChoiceList = (choices, showOnlyMarkers) => {
  if (!choices.length) return '선택 없음';
  return choices
    .map((choice) => {
      const value = choice.value || choice.raw;
      if (showOnlyMarkers) {
        return choice.marker;
      }
      return `${choice.marker} ${value}`.trim();
    })
    .join(', ');
};

const ReviewOptions = ({
  optionRecords,
  correctIndices,
  userAnswerIndices,
  correctChoices,
  userChoices,
  isAnswerCorrect,
  explanationText,
  reviewMeta,
  showOnlyMarkers = false,
}) => {
  if (!optionRecords.length) {
    return (
      <div style={problemDisplayStyles.missingOptions}>
        선택지가 준비되어 있지 않아요.
      </div>
    );
  }

  const reviewMetaBox = (
    <div style={reviewStyles.metaBox}>
      <div><strong>정답</strong>: {formatChoiceList(correctChoices, showOnlyMarkers)}</div>
      <div><strong>내 답</strong>: {formatChoiceList(userChoices, showOnlyMarkers)}</div>
      <div><strong>결과</strong>: {isAnswerCorrect ? '정답 ✅' : '오답 ❌'}</div>
      {Number.isFinite(reviewMeta?.timeSpent) && (
        <div><strong>풀이 시간</strong>: {Math.max(0, reviewMeta.timeSpent)}초</div>
      )}
    </div>
  );

  const explanationBlock = explanationText ? (
    <div style={reviewStyles.explanation}>
      <div style={reviewStyles.explanationTitle}>💡 쉬운 해설</div>
      {renderWithUnderline(explanationText)}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid var(--surface-border)', background: 'var(--surface-card)', cursor: 'pointer', fontWeight: 700 }}
          title="맨 위로 가기"
        >
          ↑ 맨 위로
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {optionRecords.map((option) => {
        const isCorrectChoice = correctIndices.has(option.index);
        const isUserChoice = userAnswerIndices.has(option.index);
        const style = {
          ...reviewStyles.option,
          ...(isCorrectChoice ? reviewStyles.optionCorrect : {}),
          ...(isUserChoice && !isCorrectChoice ? reviewStyles.optionIncorrect : {}),
        };

        const badges = [];
        if (isCorrectChoice) {
          badges.push(
            <span key="correct" style={{ ...reviewStyles.badgeBase, ...reviewStyles.badgeCorrect }}>
              정답
            </span>
          );
        }
        if (isUserChoice) {
          badges.push(
            <span
              key="user"
              style={{
                ...reviewStyles.badgeBase,
                ...(isCorrectChoice ? reviewStyles.badgeCorrect : reviewStyles.badgeUser),
                ...(isUserChoice && !isCorrectChoice ? reviewStyles.badgeIncorrect : {}),
              }}
            >
              내 답
            </span>
          );
        }

        return (
          <div key={`${option.marker}-${option.index}`} style={style}>
            <div style={reviewStyles.optionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={reviewStyles.marker}>{option.marker}</span>
                {!showOnlyMarkers && (
                  <span style={reviewStyles.optionText}>
                    {option.value ? renderWithUnderline(option.value) : renderWithUnderline(option.raw)}
                  </span>
                )}
              </div>
              {badges.length > 0 && <div style={reviewStyles.badgeRow}>{badges}</div>}
            </div>
          </div>
        );
      })}
      {reviewMetaBox}
      {explanationBlock}
    </div>
  );
};

export default ReviewOptions;
