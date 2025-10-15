import React from 'react';
import { problemDisplayStyles, orderStyles } from '../problemDisplayStyles';
import { renderWithUnderline } from '../utils/textFormatters';

const ChoiceButtons = ({ optionRecords, selectedAnswer, onSelect, showOnlyMarkers = false, disabled = false }) => {
  if (!optionRecords.length) {
    return (
      <div style={problemDisplayStyles.missingOptions}>
        선택지가 준비되지 않았습니다.
      </div>
    );
  }

  const buttonStyle = (idx) => ({
    ...orderStyles.multipleChoiceButton,
    ...(selectedAnswer === String(idx + 1) ? orderStyles.multipleChoiceSelected : {}),
    ...(disabled ? { cursor: 'not-allowed', opacity: 0.7 } : {}),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {optionRecords.map((option, idx) => (
        <button
          key={`${option.marker}-${idx}`}
          type="button"
          style={buttonStyle(idx)}
          onClick={disabled ? undefined : () => onSelect(String(idx + 1))}
          disabled={disabled}
        >
          {showOnlyMarkers ? option.marker : renderWithUnderline(option.raw)}
        </button>
      ))}
    </div>
  );
};

export default ChoiceButtons;
