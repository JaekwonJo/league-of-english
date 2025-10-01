import React, { useState, useEffect } from 'react';
import OrderProblemDisplay from './OrderProblemDisplay';
import InsertionProblemDisplay from './InsertionProblemDisplay';
import GrammarProblemDisplay from './GrammarProblemDisplay';
import { problemDisplayStyles, orderStyles } from './problemDisplayStyles';

const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤'];
const BLANK_PLACEHOLDER_SEGMENT = /(__+)/g;

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
  margin: '0 3px'
};

const renderWithUnderline = (input) => {
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

const renderBlankSegments = (text, keyPrefix = 'blank') => {
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

const renderSummarySentence = (sentence = '', blankStyle = { color: 'var(--indigo-stronger)', fontWeight: 700 }) => {
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

const formatSeconds = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ProblemDisplay = ({
  problem,
  problemIndex = 0,
  totalProblems = 0,
  userAnswer,
  onAnswer,
  onNext,
  onPrev,
  onFinish,
  timeElapsed = 0,
  timeLeft,
  displayMode = 'single',
  reviewMeta = {}
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer ?? '');

  useEffect(() => {
    setSelectedAnswer(userAnswer ?? '');
  }, [userAnswer, problemIndex]);

  if (!problem) return null;

  const isOrder = problem.type === 'order';
  const isInsertion = problem.type === 'insertion';
  const isGrammar = ['grammar', 'grammar_count', 'grammar_span', 'grammar_multi'].includes(problem.type);
  const isSummary = problem.type === 'summary';
  const isGeneral = !isOrder && !isInsertion && !isGrammar && !isSummary;
  const isBlank = problem.type === 'blank';
  const isListMode = displayMode === 'list';
  const isReviewMode = displayMode === 'review';

  const handleSelect = (answer) => {
    setSelectedAnswer(answer);
    if (typeof onAnswer === 'function') {
      if (onAnswer.length >= 2) {
        onAnswer(problemIndex, answer);
      } else {
        onAnswer(answer);
      }
    }
  };

  const cardStyle = {
    ...problemDisplayStyles.problemCard,
    ...orderStyles.orderProblemCard
  };

  const rawSourceLabel = problem.sourceLabel || problem.source || problem.metadata?.sourceLabel || problem.metadata?.documentTitle;
  const sourceLabel = (() => {
    if (!rawSourceLabel) return '';
    const trimmed = String(rawSourceLabel).trim();
    if (!trimmed) return '';
    const cleaned = trimmed.replace(/^\s*(출처|Source)\s*[:\u2502|]?\s*/iu, '').trim();
    if (!cleaned) return '';
    const hasPrefix = /^\s*(출처|Source)\s*[:\u2502|]?/iu.test(trimmed);
    return hasPrefix ? `출처│${cleaned}` : cleaned;
  })();
  const problemNumber = problem.metadata?.problemNumber;
  const passageText = problem.mainText || problem.text || '';
  const generalOptions = Array.isArray(problem.options) ? problem.options : [];
  const summaryKeywords = Array.isArray(problem.metadata?.keywords)
    ? problem.metadata.keywords
    : Array.isArray(problem.keywords)
    ? problem.keywords
    : [];
  const summaryPattern = problem.metadata?.summaryPattern || problem.summaryPattern || '';
  const summarySentence = problem.summarySentence || '';
  const summarySentenceKor = problem.summarySentenceKor || '';
  const explanationText = problem.explanation || '';

  const toIndex = (value) => {
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

  const rawCorrectAnswer = reviewMeta?.correctAnswer ?? problem.correctAnswer ?? problem.answer ?? '';
  const correctIndices = new Set(String(rawCorrectAnswer)
    .split(/[\s,]+/)
    .map(toIndex)
    .filter((value) => Number.isInteger(value)));

  const userAnswerValue = userAnswer ?? '';
  const userAnswerIndices = new Set(String(userAnswerValue)
    .split(/[\s,]+/)
    .map(toIndex)
    .filter((value) => Number.isInteger(value)));

  const optionRecords = generalOptions.map((option, idx) => {
    const raw = String(option || '');
    const markerMatch = raw.match(/^(①|②|③|④|⑤)/);
    const marker = markerMatch ? markerMatch[1] : CIRCLED_DIGITS[idx] || `${idx + 1}`;
    const value = markerMatch ? raw.slice(markerMatch[0].length).trim() : raw.trim();
    return {
      raw,
      marker,
      value,
      index: idx + 1,
    };
  });

  const correctChoices = optionRecords.filter((option) => correctIndices.has(option.index));
  const userChoices = optionRecords.filter((option) => userAnswerIndices.has(option.index));
  const isAnswerCorrect = reviewMeta?.isCorrect ?? (
    correctIndices.size > 0 && userAnswerIndices.size > 0
      ? optionRecords.every((option) => {
        const inCorrect = correctIndices.has(option.index);
        const inUser = userAnswerIndices.has(option.index);
        return inCorrect === inUser;
      })
      : false
  );

  const reviewStyles = {
    option: {
      border: '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding: '16px',
      background: 'var(--surface-soft-shell)',
      boxShadow: '0 12px 24px rgba(148, 163, 184, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    optionCorrect: {
      borderColor: 'var(--success-soft)',
      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(16, 185, 129, 0.05))'
    },
    optionIncorrect: {
      borderColor: 'var(--danger-soft)',
      background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(239, 68, 68, 0.05))'
    },
    optionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px'
    },
    marker: {
      fontWeight: 700,
      color: 'var(--indigo-stronger)',
      marginRight: '10px'
    },
    optionText: {
      color: 'var(--color-slate-900)',
      lineHeight: 1.6
    },
    badgeRow: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    badgeBase: {
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.02em'
    },
    badgeCorrect: {
      background: 'var(--success-surface-strong)',
      color: 'var(--success-deep)'
    },
    badgeUser: {
      background: 'var(--accent-primary-pale)',
      color: 'var(--accent-badge-text)'
    },
    badgeIncorrect: {
      background: 'var(--color-red-100)',
      color: 'var(--danger-stronger)'
    },
    metaBox: {
      marginTop: '18px',
      padding: '16px',
      borderRadius: '12px',
      background: 'var(--color-slate-850)',
      color: 'var(--border-muted)',
      lineHeight: 1.6,
      fontSize: '14px'
    },
    explanation: {
      marginTop: '18px',
      padding: '18px',
      borderRadius: '12px',
      background: 'var(--surface-soft-shell)',
      border: '1px solid var(--border-muted)',
      color: 'var(--color-slate-800)',
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap'
    },
    explanationTitle: {
      fontWeight: 700,
      marginBottom: '8px',
      color: 'var(--indigo-stronger)'
    }
  };

  const formatChoiceList = (choices) => {
    if (!choices.length) return '선택 없음';
    return choices
      .map((choice) => {
        const value = choice.value || choice.raw;
        return `${choice.marker} ${value}`.trim();
      })
      .join(', ');
  };

  const reviewMetaBox = isReviewMode ? (
    <div style={reviewStyles.metaBox}>
      <div><strong>정답</strong>: {formatChoiceList(correctChoices)}</div>
      <div><strong>내 답</strong>: {formatChoiceList(userChoices)}</div>
      <div><strong>결과</strong>: {isAnswerCorrect ? '정답 ✅' : '오답 ❌'}</div>
      {Number.isFinite(reviewMeta?.timeSpent) && (
        <div><strong>풀이 시간</strong>: {Math.max(0, reviewMeta.timeSpent)}초</div>
      )}
    </div>
  ) : null;

  const explanationBlock = isReviewMode && explanationText ? (
    <div style={reviewStyles.explanation}>
      <div style={reviewStyles.explanationTitle}>해설</div>
      {renderWithUnderline(explanationText)}
    </div>
  ) : null;

  const renderReviewOptions = () => (
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
            <span key="user" style={{
              ...reviewStyles.badgeBase,
              ...(isCorrectChoice ? reviewStyles.badgeCorrect : reviewStyles.badgeUser),
              ...(isUserChoice && !isCorrectChoice ? reviewStyles.badgeIncorrect : {})
            }}>
              내 답
            </span>
          );
        }

        return (
          <div key={`${option.marker}-${option.index}`} style={style}>
            <div style={reviewStyles.optionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={reviewStyles.marker}>{option.marker}</span>
                <span style={reviewStyles.optionText}>{option.value ? renderWithUnderline(option.value) : renderWithUnderline(option.raw)}</span>
              </div>
              {badges.length > 0 && <div style={reviewStyles.badgeRow}>{badges}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderInteractiveOptions = () => (
    <>
      {optionRecords.map((option, idx) => (
        <button
          key={`${option.marker}-${idx}`}
          style={generalButtonStyle(idx)}
          onClick={() => handleSelect(String(idx + 1))}
        >
          {renderWithUnderline(option.raw)}
        </button>
      ))}
    </>
  );

  const renderOptionsSection = ({ normalHeading, reviewHeading }) => (
    <div>
      <div style={orderStyles.sentencesLabel}>{isReviewMode ? reviewHeading : normalHeading}</div>
      {optionRecords.length === 0 ? (
        <div style={problemDisplayStyles.missingOptions}>
          {isReviewMode ? '선택지가 준비되어 있지 않아요.' : '선택지가 준비되지 않았습니다.'}
        </div>
      ) : (
        isReviewMode ? renderReviewOptions() : renderInteractiveOptions()
      )}
      {isReviewMode && reviewMetaBox}
      {isReviewMode && explanationBlock}
    </div>
  );

  const summaryStyles = {
    sentenceBox: {
      padding: '18px',
      borderRadius: '12px',
      background: 'var(--surface-soft-shell)',
      border: '1px solid var(--accent-primary-pale)',
      marginBottom: '16px',
      lineHeight: 1.7
    },
    blank: { color: 'var(--accent-primary-strong)', fontWeight: 700 },
    meta: { color: 'var(--color-slate-400)', fontSize: '14px', marginBottom: '12px' }
  };

  const generalButtonStyle = (idx) => ({
    ...orderStyles.multipleChoiceButton,
    ...(selectedAnswer === String(idx + 1) ? orderStyles.multipleChoiceSelected : {})
  });

  const sentencesBlock = Array.isArray(problem.sentences) && problem.sentences.length > 0 && (
    <div style={{ marginBottom: '20px' }}>
      <div style={orderStyles.sentencesLabel}>문장</div>
      {problem.sentences.map((sent, idx) => (
        <div key={idx} style={orderStyles.orderSentence}>
          <strong>{sent.label}.</strong> {sent.text}
        </div>
      ))}
    </div>
  );


  const summaryBody = (
    <>
      {(sourceLabel || problemNumber) && (
        <div style={{ marginBottom: '16px' }}>
          {sourceLabel && (
            <div style={orderStyles.orderSourceSection}>{sourceLabel.startsWith('출처') ? sourceLabel : `출처: ${sourceLabel}`}</div>
          )}
          {problemNumber && (
            <div style={orderStyles.orderNumberSection}>No. {problemNumber}</div>
          )}
        </div>
      )}

      {passageText && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {renderWithUnderline(passageText)}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>
        {renderWithUnderline(problem.question || 'Review the question carefully.')}
      </div>

      {summarySentence && (
        <div style={summaryStyles.sentenceBox}>{renderSummarySentence(summarySentence, summaryStyles.blank)}</div>
      )}

      {summarySentenceKor && (
        <div style={summaryStyles.meta}>{summarySentenceKor}</div>
      )}

      {(summaryPattern || summaryKeywords.length) && (
        <div style={summaryStyles.meta}>
          {summaryPattern && <span>Pattern: {summaryPattern}</span>}
          {summaryPattern && summaryKeywords.length ? ' | ' : ''}
          {summaryKeywords.length ? <span>Keywords: {summaryKeywords.join(', ')}</span> : null}
        </div>
      )}

      {renderOptionsSection({
        normalHeading: 'Choose the correct answer',
        reviewHeading: 'Review the options & explanation'
      })}
    </>
  );

  const generalBody = (
    <>
      {(sourceLabel || problemNumber) && (
        <div style={{ marginBottom: '16px' }}>
          {sourceLabel && (
            <div style={orderStyles.orderSourceSection}>{sourceLabel.startsWith('출처') ? sourceLabel : `출처: ${sourceLabel}`}</div>
          )}
          {problemNumber && (
            <div style={orderStyles.orderNumberSection}>문항 번호: {problemNumber}</div>
          )}
        </div>
      )}

      {passageText && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {isBlank ? renderBlankSegments(passageText, `passage-${problemIndex}`) : renderWithUnderline(passageText)}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>
        Q{totalProblems > 0 ? `.${problemIndex + 1}` : '.'}{' '}
        {isBlank
          ? renderBlankSegments(problem.question || problem.instruction || '문제를 확인해 주세요.', `question-${problemIndex}`)
          : renderWithUnderline(problem.question || problem.instruction || '문제를 확인해 주세요.')}
      </div>

      {sentencesBlock}

      {renderOptionsSection({
        normalHeading: '정답을 선택하세요',
        reviewHeading: '선택지와 해설을 확인하세요'
      })}
    </>
  );

  const cardContent = (
    <div style={cardStyle}>
      {isOrder && (
        <OrderProblemDisplay
          problem={problem}
          parsedOrderData={null}
          onAnswer={isReviewMode ? undefined : handleSelect}
          userAnswer={selectedAnswer}
        />
      )}

      {isInsertion && (
        <InsertionProblemDisplay
          problem={problem}
          onAnswer={isReviewMode ? undefined : handleSelect}
          userAnswer={selectedAnswer}
        />
      )}

      {isGrammar && (
        <GrammarProblemDisplay
          problem={problem}
          onAnswer={handleSelect}
          userAnswer={selectedAnswer}
          showResult={isReviewMode}
        />
      )}

      {isSummary && summaryBody}

      {isGeneral && generalBody}
    </div>
  );

  if (isReviewMode) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          color: 'var(--violet-deep)',
          fontWeight: 700
        }}>
          <span>복습 문항 {problemIndex + 1} / {totalProblems}</span>
          {problem.type && <span>{problem.type.toUpperCase()}</span>}
        </div>
        {cardContent}
      </div>
    );
  }

  if (isListMode) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          color: 'var(--color-slate-400)',
          fontWeight: 600
        }}>
          <span>문항 {problemIndex + 1}</span>
          {problem.type && <span>{problem.type.toUpperCase()}</span>}
        </div>
        {cardContent}
      </div>
    );
  }

  return (
    <div style={problemDisplayStyles.container}>
      <div style={problemDisplayStyles.header}>
        <div style={problemDisplayStyles.progress}>문항 {problemIndex + 1} / {totalProblems}</div>
        <div style={problemDisplayStyles.timer}>
          경과 {formatSeconds(timeElapsed)}
          {typeof timeLeft === 'number' ? ` · 남은 ${formatSeconds(timeLeft)}` : ''}
        </div>
      </div>

      {cardContent}

      <div style={problemDisplayStyles.navigation}>
        <button
          style={problemDisplayStyles.navButton}
          onClick={onPrev}
          disabled={problemIndex === 0}
        >
          이전
        </button>

        {problemIndex === totalProblems - 1 ? (
          <button
            style={problemDisplayStyles.finishButton}
            onClick={onFinish}
            disabled={!selectedAnswer}
          >
            제출하기
          </button>
        ) : (
          <button
            style={problemDisplayStyles.nextButton}
            onClick={onNext}
            disabled={!selectedAnswer}
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
};

export default ProblemDisplay;
