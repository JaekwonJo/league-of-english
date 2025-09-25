import React, { useState, useEffect } from 'react';
import OrderProblemDisplay from './OrderProblemDisplay';
import InsertionProblemDisplay from './InsertionProblemDisplay';
import GrammarProblemDisplay from './GrammarProblemDisplay';
import { problemDisplayStyles, orderStyles } from './problemDisplayStyles';

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

const renderSummarySentence = (sentence = '', blankStyle = { color: '#2563eb', fontWeight: 700 }) => {
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
  displayMode = 'single'
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
  const isListMode = displayMode === 'list';

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

  const sourceLabel = problem.sourceLabel || problem.source || problem.metadata?.sourceLabel || problem.metadata?.documentTitle;
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

  const summaryStyles = {
    sentenceBox: {
      padding: '18px',
      borderRadius: '12px',
      background: '#F8FAFF',
      border: '1px solid #DBEAFE',
      marginBottom: '16px',
      lineHeight: 1.7
    },
    blank: { color: '#2563eb', fontWeight: 700 },
    meta: { color: '#94A3B8', fontSize: '14px', marginBottom: '12px' }
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
            <div style={orderStyles.orderSourceSection}>Source: {sourceLabel}</div>
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

      <div>
        <div style={orderStyles.sentencesLabel}>Choose the correct answer</div>
        {generalOptions.length === 0 ? (
          <div style={problemDisplayStyles.missingOptions}>Options are not available.</div>
        ) : (
          generalOptions.map((option, idx) => (
            <button
              key={idx}
              style={generalButtonStyle(idx)}
              onClick={() => handleSelect(String(idx + 1))}
            >
              {renderWithUnderline(option)}
            </button>
          ))
        )}
      </div>
    </>
  );

  const generalBody = (
    <>
      {(sourceLabel || problemNumber) && (
        <div style={{ marginBottom: '16px' }}>
          {sourceLabel && (
            <div style={orderStyles.orderSourceSection}>출처: {sourceLabel}</div>
          )}
          {problemNumber && (
            <div style={orderStyles.orderNumberSection}>문항 번호: {problemNumber}</div>
          )}
        </div>
      )}

      {passageText && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {renderWithUnderline(passageText)}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>
        Q{totalProblems > 0 ? `.${problemIndex + 1}` : '.'} {renderWithUnderline(problem.question || problem.instruction || '문제를 확인해 주세요.')}
      </div>

      {sentencesBlock}

      <div>
        <div style={orderStyles.sentencesLabel}>정답을 선택하세요</div>
        {generalOptions.length === 0 ? (
          <div style={problemDisplayStyles.missingOptions}>선택지가 준비되지 않았습니다.</div>
        ) : (
          generalOptions.map((option, idx) => (
            <button
              key={idx}
              style={generalButtonStyle(idx)}
              onClick={() => handleSelect(String(idx + 1))}
            >
              {renderWithUnderline(option)}
            </button>
          ))
        )}
      </div>
    </>
  );

  const cardContent = (
    <div style={cardStyle}>
      {isOrder && (
        <OrderProblemDisplay
          problem={problem}
          parsedOrderData={null}
          onAnswer={handleSelect}
          userAnswer={selectedAnswer}
        />
      )}

      {isInsertion && (
        <InsertionProblemDisplay
          problem={problem}
          onAnswer={handleSelect}
          userAnswer={selectedAnswer}
        />
      )}

      {isGrammar && (
        <GrammarProblemDisplay
          problem={problem}
          onAnswer={handleSelect}
          userAnswer={selectedAnswer}
          showResult={false}
        />
      )}

      {isSummary && summaryBody}

      {isGeneral && generalBody}
    </div>
  );

  if (isListMode) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          color: '#94A3B8',
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