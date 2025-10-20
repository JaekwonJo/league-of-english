import React from 'react';
import { problemDisplayStyles } from '../problemDisplayStyles';

const BLANK_PLACEHOLDER_SEGMENT = /(__+)/g;
export const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤'];

export const renderWithUnderline = (input) => {
  if (input === null || input === undefined) return null;
  const str = String(input);
  const tokens = str
    .replace(/<<\s*(\d+)\s*>>/g, '<u>')
    .replace(/<\/\s*(\d+)\s*>>/g, '</u>')
    .split(/(<\/?u>)/i);
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
        <span key={`u-${idx}`} style={problemDisplayStyles.underlineSpan}>
          {token}
        </span>
      );
    } else {
      elements.push(<React.Fragment key={`t-${idx}`}>{token}</React.Fragment>);
    }
  });
  return <span style={{ lineHeight: 1.6 }}>{elements}</span>;
};

const blankHighlightStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '96px',
  padding: '2px 10px',
  borderRadius: '12px',
  background: 'var(--violet-surface-strong)',
  border: '1px solid var(--indigo-border)',
  color: 'var(--indigo-deep)',
  fontWeight: 700,
  letterSpacing: '0.18em',
  fontFamily: '"Pretendard", "Noto Sans KR", sans-serif',
  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.12)',
  margin: '0 3px',
};

export const renderBlankSegments = (text, keyPrefix = 'blank') => {
  if (text === null || text === undefined) return null;
  const raw = String(text);
  const pieces = raw.split(BLANK_PLACEHOLDER_SEGMENT);
  return pieces.map((piece, idx) => {
    if (!piece) {
      return null;
    }
    if (/^_+$/.test(piece)) {
      return (
        <span key={`${keyPrefix}-token-${idx}`} style={blankHighlightStyle} aria-label="빈칸">
          <span aria-hidden="true">____</span>
        </span>
      );
    }
    return (
      <React.Fragment key={`${keyPrefix}-text-${idx}`}>
        {renderWithUnderline(piece)}
      </React.Fragment>
    );
  });
};

export const renderSummarySentence = (
  sentence = '',
  blankStyle = { color: 'var(--indigo-stronger)', fontWeight: 700 },
) => {
  const segments = String(sentence).split(/(\(A\)|\(B\))/g);
  return (
    <span>
      {segments.map((segment, idx) => {
        if (segment === '(A)' || segment === '(B)') {
          return (
            <span key={`blank-${idx}`} style={blankStyle}>
              {segment}
            </span>
          );
        }
        if (!segment) return null;
        return <React.Fragment key={`text-${idx}`}>{segment}</React.Fragment>;
      })}
    </span>
  );
};

export const formatSeconds = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const circledDigitIndex = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  const circled = CIRCLED_DIGITS.indexOf(str[0]);
  if (circled !== -1) return circled + 1;
  const parsed = parseInt(str, 10);
  if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= CIRCLED_DIGITS.length) {
    return parsed;
  }
  return null;
};

export const normalizeAnswerArray = (value) => {
  if (value === null || value === undefined) return [];
  return String(value)
    .replace(/[[\]{}\\]/g, '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => parseInt(token, 10))
    .filter((num) => !Number.isNaN(num))
    .sort((a, b) => a - b);
};

export const normalizeUserAnswer = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return String(value);
};
