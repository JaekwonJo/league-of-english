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

const ProblemDisplay = ({
  problem,
  currentIndex,
  totalProblems,
  userAnswer,
  onAnswer,
  onNext,
  onPrev,
  onFinish,
  timeElapsed
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(userAnswer || '');

  useEffect(() => {
    setSelectedAnswer(userAnswer || '');
  }, [userAnswer, currentIndex]);

  const handleSelect = (answer) => {
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!problem) return null;

  const isOrder = problem.type === 'order';
  const isInsertion = problem.type === 'insertion';
  const isGrammar = ['grammar', 'grammar_count', 'grammar_span', 'grammar_multi'].includes(problem.type);
  const isGeneral = !isOrder && !isInsertion && !isGrammar;

  const cardStyle = {
    ...problemDisplayStyles.problemCard,
    ...orderStyles.orderProblemCard
  };

  const sourceLabel = problem.source || problem.metadata?.documentTitle;
  const problemNumber = problem.metadata?.problemNumber;
  const passageText = problem.mainText || problem.text || '';
  const generalOptions = Array.isArray(problem.options) ? problem.options : [];

  const generalButtonStyle = (idx) => ({
    ...orderStyles.multipleChoiceButton,
    ...(selectedAnswer === String(idx + 1) ? orderStyles.multipleChoiceSelected : {})
  });

  return (
    <div style={problemDisplayStyles.container}>
      <div style={problemDisplayStyles.header}>
        <div style={problemDisplayStyles.progress}>문제 {currentIndex + 1} / {totalProblems}</div>
        <div style={problemDisplayStyles.timer}>Time {formatTime(timeElapsed)}</div>
      </div>

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

        {isGeneral && (
          <>
            {(sourceLabel || problemNumber) && (
              <div style={{ marginBottom: '16px' }}>
                {sourceLabel && (
                  <div style={orderStyles.orderSourceSection}>출처: {sourceLabel}</div>
                )}
                {problemNumber && (
                  <div style={orderStyles.orderNumberSection}>문제 번호: {problemNumber}</div>
                )}
              </div>
            )}

            {passageText && (
              <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                {renderWithUnderline(passageText)}
              </div>
            )}

            <div style={orderStyles.orderInstruction}>
              Q. {renderWithUnderline(problem.question || problem.instruction || '지문을 읽고 알맞은 답을 고르세요.')}
            </div>

            {Array.isArray(problem.sentences) && problem.sentences.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={orderStyles.sentencesLabel}>보기</div>
                {problem.sentences.map((sent, idx) => (
                  <div key={idx} style={orderStyles.orderSentence}>
                    <strong>{sent.label}.</strong> {sent.text}
                  </div>
                ))}
              </div>
            )}

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
        )}
      </div>

      <div style={problemDisplayStyles.navigation}>
        <button
          style={problemDisplayStyles.navButton}
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          이전
        </button>

        {currentIndex === totalProblems - 1 ? (
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
