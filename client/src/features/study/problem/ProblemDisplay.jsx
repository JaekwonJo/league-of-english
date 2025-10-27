import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { api } from '../../../services/api.service';

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const FEEDBACK_ACTIONS = {
  LIKE: 'like',
  REPORT: 'report'
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
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState('');

  useEffect(() => {
    setSelectedAnswer(userAnswer ?? '');
  }, [userAnswer, problemIndex]);

  const effectiveProblem = useMemo(() => problem || {}, [problem]);
  const metadata = useMemo(() => effectiveProblem.metadata || {}, [effectiveProblem]);
  const problemId = Number(effectiveProblem.id);

  const isOrder = effectiveProblem.type === 'order';
  const isInsertion = effectiveProblem.type === 'insertion';
  const isGrammar = ['grammar', 'grammar_count', 'grammar_span', 'grammar_multi'].includes(effectiveProblem.type);
  const isSummary = effectiveProblem.type === 'summary';
  const isGeneral = !isOrder && !isInsertion && !isGrammar && !isSummary;
  const isBlank = effectiveProblem.type === 'blank';
  const isReviewMode = displayMode === 'review';
  const isListMode = displayMode === 'list';
  const isPreviewMode = displayMode === 'preview';
  const shouldShowFeedback = !isReviewMode && !isPreviewMode && Number.isInteger(problemId) && problemId > 0;

  const handleSelect = (answer) => {
    if (isPreviewMode) return;
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
    ...(isMobile ? { padding: '16px' } : {}),
    ...orderStyles.orderProblemCard
  };

  const rawSourceLabel = effectiveProblem.sourceLabel || effectiveProblem.source || metadata.sourceLabel || metadata.documentTitle;
  const sourceLabel = (() => {
    if (!rawSourceLabel) return '';
    const trimmed = String(rawSourceLabel).trim();
    if (!trimmed) return '';
    const cleaned = trimmed.replace(/^\s*(출처|Source)\s*[:\u2502|]?\s*/iu, '').trim();
    if (!cleaned) return '';
    const hasPrefix = /^\s*(출처|Source)\s*[:\u2502|]?/iu.test(trimmed);
    return hasPrefix ? `출처│${cleaned}` : cleaned;
  })();
  const problemNumber = metadata.problemNumber;
  const passageText = useMemo(
    () => effectiveProblem.mainText || effectiveProblem.text || '',
    [effectiveProblem]
  );
  const generalOptions = useMemo(
    () => (Array.isArray(effectiveProblem.options) ? effectiveProblem.options : []),
    [effectiveProblem]
  );
  const summaryKeywords = Array.isArray(metadata.keywords)
    ? metadata.keywords
    : Array.isArray(effectiveProblem.keywords)
    ? effectiveProblem.keywords
    : [];
  const summaryPattern = metadata.summaryPattern || effectiveProblem.summaryPattern || '';
  const summarySentence = effectiveProblem.summarySentence || '';
  const summarySentenceKor = effectiveProblem.summarySentenceKor || '';
  const explanationText = effectiveProblem.explanation || '';

  const rawCorrectAnswer = reviewMeta?.correctAnswer ?? effectiveProblem.correctAnswer ?? effectiveProblem.answer ?? '';
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

  const blankPassageText = useMemo(() => {
    if (!isBlank) return passageText;
    const raw = String(passageText || '');
    if (/_{2,}/.test(raw)) {
      return raw;
    }
    const blankMeta = metadata?.blank || {};
    const candidateSources = [
      metadata?.targetExpression,
      metadata?.target_expression,
      metadata?.target,
      metadata?.originalExpression,
      metadata?.original_expression,
      metadata?.targetPhrase,
      metadata?.target_phrase,
      metadata?.correctAnswerText,
      blankMeta?.targetExpression,
      blankMeta?.target_expression,
      effectiveProblem?.targetExpression,
      effectiveProblem?.target_expression
    ].filter(Boolean);

    const tryReplace = (input, candidate) => {
      if (!candidate) return input;
      let updated = input;
      const base = String(candidate).trim();
      if (!base) return updated;
      const variants = new Set([base]);
      variants.add(base.replace(/[–—]/g, '-'));
      variants.add(base.replace(/[-–—]/g, ' '));
      for (const variant of variants) {
        const cleanVariant = String(variant || '').trim();
        if (!cleanVariant) continue;
        const regexSource = escapeRegExp(cleanVariant)
          .split(/\s+/)
          .filter(Boolean)
          .join('\\s+');
        if (!regexSource) continue;
        const pattern = new RegExp(regexSource, 'i');
        if (pattern.test(updated)) {
          updated = updated.replace(pattern, '____');
          return updated;
        }
      }
      return updated;
    };

    let updatedText = raw;
    for (const candidate of candidateSources) {
      const attempted = tryReplace(updatedText, candidate);
      if (attempted !== updatedText) {
        updatedText = attempted;
        break;
      }
    }

    if (!/_+/.test(updatedText) && Array.isArray(correctChoices) && correctChoices.length) {
      const primaryChoice = correctChoices[0]?.value || correctChoices[0]?.raw || '';
      const attempted = tryReplace(updatedText, primaryChoice);
      if (attempted !== updatedText) {
        updatedText = attempted;
      }
    }

    if (!/_+/.test(updatedText) && metadata?.targetExpressionOriginal) {
      const attempted = tryReplace(updatedText, metadata.targetExpressionOriginal);
      if (attempted !== updatedText) {
        updatedText = attempted;
      }
    }

    if (!/_+/.test(updatedText)) {
      updatedText = `____ ${updatedText}`.trim();
    }
    return updatedText;
  }, [isBlank, passageText, metadata, correctChoices, effectiveProblem]);

  const displayPassageText = isBlank ? blankPassageText : passageText;

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      if (!shouldShowFeedback) {
        setFeedbackSummary(null);
        setFeedbackError('');
        return;
      }
      setFeedbackLoading(true);
      try {
        const summary = await api.problems.feedback.summary(problemId);
        if (!cancelled) {
          setFeedbackSummary(summary);
          setFeedbackError('');
        }
      } catch (error) {
        if (!cancelled) {
          setFeedbackError(error?.message || '피드백 정보를 불러오지 못했어요.');
        }
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false);
        }
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [problemId, shouldShowFeedback]);

  const handleFeedback = useCallback(async (action) => {
    if (!shouldShowFeedback || !problemId) return;
    let reason;
    if (action === FEEDBACK_ACTIONS.REPORT) {
      reason = window.prompt('어떤 문제가 있었나요? (예: 오타, 정답 오류 등)');
      if (reason === null) return; // user cancelled
    }

    setFeedbackSubmitting(action);
    try {
      const response = await api.problems.feedback.submit(problemId, {
        action,
        reason
      });
      if (response?.summary) {
        setFeedbackSummary(response.summary);
      }
      setFeedbackError('');
    } catch (error) {
      setFeedbackError(error?.message || '피드백을 저장하지 못했어요.');
    } finally {
      setFeedbackSubmitting('');
    }
  }, [problemId, shouldShowFeedback]);

  const feedbackCounts = feedbackSummary?.counts || { like: 0, report: 0 };
  const feedbackUserState = feedbackSummary?.user || { like: false, report: false };

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
      {isPreviewMode ? (
        <div style={problemDisplayStyles.previewOptions}>
          {optionRecords.map((option, idx) => (
            <div key={`${option.marker}-${idx}`} style={problemDisplayStyles.previewOption}>
              <span style={problemDisplayStyles.previewOptionMarker}>{option.marker}</span>
              <span>
                {renderWithUnderline(
                  option.value && option.value.length
                    ? option.value
                    : option.raw.replace(/^(①|②|③|④|⑤)\s*/, '').trim()
                )}
              </span>
            </div>
          ))}
        </div>
      ) : isReviewMode ? (
        <ReviewOptions
          optionRecords={optionRecords}
          correctIndices={correctIndices}
          userAnswerIndices={userAnswerIndices}
          correctChoices={correctChoices}
          userChoices={userChoices}
          isAnswerCorrect={isAnswerCorrect}
          explanationText={explanationText}
          reviewMeta={reviewMeta}
          showOnlyMarkers={effectiveProblem.type === "vocabulary"}
        />
      ) : (
        <ChoiceButtons
          optionRecords={optionRecords}
          selectedAnswer={selectedAnswer}
          onSelect={handleSelect}
          showOnlyMarkers={effectiveProblem.type === "vocabulary"}
          disabled={isPreviewMode}
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
    meta: { color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' },
  }), []);

  const sentencesBlock = Array.isArray(effectiveProblem.sentences) && effectiveProblem.sentences.length > 0 && (
    <div style={{ marginBottom: '20px' }}>
      <div style={orderStyles.sentencesLabel}>문장</div>
      {effectiveProblem.sentences.map((sent, idx) => (
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

      {displayPassageText && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {renderWithUnderline(displayPassageText)}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>
        {renderWithUnderline(effectiveProblem.question || 'Review the question carefully.')}
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

      {displayPassageText && (
        <div style={{ ...orderStyles.orderGivenText, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {isBlank ? renderBlankSegments(displayPassageText, `passage-${problemIndex}`) : renderWithUnderline(displayPassageText)}
        </div>
      )}

      <div style={orderStyles.orderInstruction}>
        Q{totalProblems > 0 ? `.${problemIndex + 1}` : '.'}{' '}
        {isBlank
          ? renderBlankSegments(effectiveProblem.question || effectiveProblem.instruction || '문제를 확인해 주세요.', `question-${problemIndex}`)
          : renderWithUnderline(effectiveProblem.question || effectiveProblem.instruction || '문제를 확인해 주세요.')}
      </div>

      {sentencesBlock}

      {renderOptionsSection({
        normalHeading: isPreviewMode ? '선택지' : '정답을 선택하세요',
        reviewHeading: '선택지와 해설을 확인하세요'
      })}
    </>
  );

  const renderFeedbackBar = () => {
    if (!shouldShowFeedback) return null;
    const likeActive = feedbackUserState.like;
    const reportActive = feedbackUserState.report;
    const isBusy = feedbackLoading || Boolean(feedbackSubmitting);

    return (
      <div style={problemDisplayStyles.feedbackBar}>
        <div style={problemDisplayStyles.feedbackLabel}>이 문제 어땠나요?</div>
        <div style={problemDisplayStyles.feedbackButtons}>
          <button
            type="button"
            style={{
              ...problemDisplayStyles.feedbackButton,
              ...(likeActive ? problemDisplayStyles.feedbackButtonActive : {}),
              ...(isBusy && feedbackSubmitting === FEEDBACK_ACTIONS.LIKE
                ? problemDisplayStyles.feedbackButtonLoading
                : {})
            }}
            disabled={isBusy}
            onClick={() => handleFeedback(FEEDBACK_ACTIONS.LIKE)}
          >
            <span role="img" aria-label="좋아요">👍</span>
            <span>좋아요</span>
            <span style={problemDisplayStyles.feedbackCount}>({feedbackCounts.like || 0})</span>
          </button>
          <button
            type="button"
            style={{
              ...problemDisplayStyles.feedbackButton,
              ...(reportActive ? problemDisplayStyles.feedbackButtonActive : {}),
              ...(isBusy && feedbackSubmitting === FEEDBACK_ACTIONS.REPORT
                ? problemDisplayStyles.feedbackButtonLoading
                : {})
            }}
            disabled={isBusy}
            onClick={() => handleFeedback(FEEDBACK_ACTIONS.REPORT)}
          >
            <span role="img" aria-label="신고">🚨</span>
            <span>신고</span>
            <span style={problemDisplayStyles.feedbackCount}>({feedbackCounts.report || 0})</span>
          </button>
        </div>
        <div style={{ flex: '1 1 100%' }}>
          {feedbackLoading && <span style={problemDisplayStyles.feedbackCount}>피드백 정보를 불러오는 중...</span>}
          {feedbackError && !feedbackLoading && (
            <span style={problemDisplayStyles.feedbackError}>{feedbackError}</span>
          )}
          {!feedbackLoading && !feedbackError && (
            <span style={problemDisplayStyles.feedbackHint}>
              <span role="img" aria-label="관리자에게 알려요">🛠️</span>
              <span>문제가 이상하면 바로 🚨 신고를 눌러주세요. 관리자가 검토 후 숨겨 드려요!</span>
            </span>
          )}
        </div>
      </div>
    );
  };

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
          {effectiveProblem.type && <span>{effectiveProblem.type.toUpperCase()}</span>}
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
          {effectiveProblem.type && <span>{effectiveProblem.type.toUpperCase()}</span>}
        </div>
        {cardContent}
      </div>
    );
  }

  if (isPreviewMode) {
    const previewSource = sourceLabel && sourceLabel.startsWith('출처') ? sourceLabel : `출처│${sourceLabel || '미리보기'}`;
    const previewFootnotes = Array.isArray(effectiveProblem.footnotes)
      ? effectiveProblem.footnotes
      : Array.isArray(metadata.footnotes)
      ? metadata.footnotes
      : [];

    return (
      <div style={problemDisplayStyles.previewWrapper}>
        <div style={problemDisplayStyles.previewCard}>
          <div style={problemDisplayStyles.previewHeader}>
            <div>
              <div style={problemDisplayStyles.previewHeaderTitle}>수능형 문항 미리보기</div>
              <div style={problemDisplayStyles.previewSource}>{previewSource}</div>
            </div>
          </div>
          <div style={problemDisplayStyles.previewQuestion}>
            {renderWithUnderline(effectiveProblem.question || '문제를 확인해 주세요.')}
          </div>
          {displayPassageText && (
            <div style={problemDisplayStyles.previewPassage}>
              {renderWithUnderline(displayPassageText)}
            </div>
          )}

          {renderOptionsSection({
            normalHeading: '보기',
            reviewHeading: '보기'
          })}

          {explanationText && (
            <div style={problemDisplayStyles.previewExplanation}>
              ※ 해설: {explanationText}
            </div>
          )}

          {previewFootnotes.length > 0 && (
            <div style={problemDisplayStyles.previewFootnotes}>
              {previewFootnotes.map((note, idx) => (
                <div key={`footnote-${idx}`}>{note}</div>
              ))}
            </div>
          )}

          <div style={problemDisplayStyles.previewFooterNote}>
            ⓘ 실제 생성 문제와 같은 형식을 미리 살펴볼 수 있어요.
          </div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return null;
  }

  return (
    <div style={{ ...problemDisplayStyles.container, ...(isMobile ? { padding: '12px' } : {}) }}>
      <div style={{
        ...problemDisplayStyles.header,
        ...(isMobile ? { flexDirection: 'column', alignItems: 'flex-start', gap: '6px' } : {})
      }}>
        <div style={problemDisplayStyles.progress}>문항 {problemIndex + 1} / {totalProblems}</div>
        <div style={problemDisplayStyles.timer}>
          경과 {formatSeconds(timeElapsed)}
          {typeof timeLeft === 'number' ? ` · 남은 ${formatSeconds(timeLeft)}` : ''}
        </div>
      </div>

      {cardContent}

      {renderFeedbackBar()}

      <div style={{
        ...problemDisplayStyles.navigation,
        ...(isMobile ? { flexDirection: 'column' } : {})
      }}>
        <button
          style={{ ...problemDisplayStyles.navButton, ...(isMobile ? { width: '100%' } : {}) }}
          onClick={onPrev}
          disabled={problemIndex === 0}
        >
          이전
        </button>

        {problemIndex === totalProblems - 1 ? (
          <button
            style={{ ...problemDisplayStyles.finishButton, ...(isMobile ? { width: '100%' } : {}) }}
            onClick={onFinish}
            disabled={!selectedAnswer}
          >
            제출하기
          </button>
        ) : (
          <button
            style={{ ...problemDisplayStyles.nextButton, ...(isMobile ? { width: '100%' } : {}) }}
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
