import React, { useEffect, useMemo, useState } from 'react';
import OrderProblemDisplay from './components/OrderProblemDisplay';
import InsertionProblemDisplay from './components/InsertionProblemDisplay';
import GrammarProblemDisplay from './components/GrammarProblemDisplay';
import ReviewOptions from './components/ReviewOptions';
import ChoiceButtons from './components/ChoiceButtons';
import { problemDisplayStyles, orderStyles } from './problemDisplayStyles';
import {
  renderWithUnderline,
  renderBlankSegments,
  renderSummarySentence,
  formatSeconds,
  circledDigitIndex,
  CIRCLED_DIGITS,
} from './utils/textFormatters';

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

  const rawCorrectAnswer = reviewMeta?.correctAnswer ?? problem.correctAnswer ?? problem.answer ?? '';
  const correctIndices = useMemo(() => (
    new Set(
      String(rawCorrectAnswer)
        .split(/[\s,]+/)
        .map(circledDigitIndex)
        .filter((value) => Number.isInteger(value)),
    )
  ), [rawCorrectAnswer]);

  const rawUserAnswer = reviewMeta?.userAnswer ?? userAnswer ?? selectedAnswer;
  const userAnswerIndices = useMemo(() => (
    new Set(
      String(rawUserAnswer)
        .split(/[\s,]+/)
        .map(circledDigitIndex)
        .filter((value) => Number.isInteger(value)),
    )
  ), [rawUserAnswer]);

  const optionRecords = useMemo(() => (
    generalOptions.map((option, idx) => {
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
    })
  ), [generalOptions]);

  const correctChoices = useMemo(
    () => optionRecords.filter((option) => correctIndices.has(option.index)),
    [optionRecords, correctIndices],
  );

  const userChoices = useMemo(
    () => optionRecords.filter((option) => userAnswerIndices.has(option.index)),
    [optionRecords, userAnswerIndices],
  );

  const isAnswerCorrect = useMemo(() => (
    typeof reviewMeta?.isCorrect === 'boolean'
      ? reviewMeta.isCorrect
      : correctIndices.size > 0 && userAnswerIndices.size > 0
        ? optionRecords.every((option) => {
            const inCorrect = correctIndices.has(option.index);
            const inUser = userAnswerIndices.has(option.index);
            return inCorrect === inUser;
          })
        : false
  ), [correctIndices, optionRecords, reviewMeta?.isCorrect, userAnswerIndices]);

  const renderOptionsSection = ({ normalHeading, reviewHeading }) => (
    <div>
      <div style={orderStyles.sentencesLabel}>{isReviewMode ? reviewHeading : normalHeading}</div>
      {isReviewMode ? (
        <ReviewOptions
          optionRecords={optionRecords}
          correctIndices={correctIndices}
          userAnswerIndices={userAnswerIndices}
          correctChoices={correctChoices}
          userChoices={userChoices}
          isAnswerCorrect={isAnswerCorrect}
          explanationText={explanationText}
          reviewMeta={reviewMeta}
        />
      ) : (
        <ChoiceButtons
          optionRecords={optionRecords}
          selectedAnswer={selectedAnswer}
          onSelect={handleSelect}
        />
      )}
    </div>
  );

  const summaryStyles = useMemo(() => ({
    sentenceBox: {
      padding: '18px',
      borderRadius: '12px',
      background: 'var(--surface-soft-shell)',
      border: '1px solid var(--accent-primary-pale)',
      marginBottom: '16px',
      lineHeight: 1.7,
    },
    blank: { color: 'var(--accent-primary-strong)', fontWeight: 700 },
    meta: { color: 'var(--color-slate-400)', fontSize: '14px', marginBottom: '12px' },
  }), []);

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
          color: 'var(--accent-primary)',
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
          color: 'var(--text-secondary)',
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
