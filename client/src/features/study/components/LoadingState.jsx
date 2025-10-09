import React, { useEffect, useMemo, useState } from 'react';
import { LOADING_SNIPPETS, REVEAL_STEP_SECONDS } from '../constants';
import { pickFlashcards } from '../utils/flashcards';
import { studyStyles as styles } from '../studyStyles';

const useRotatingSnippet = () => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_SNIPPETS.length));

  useEffect(() => {
    if (!LOADING_SNIPPETS.length) return undefined;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_SNIPPETS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return LOADING_SNIPPETS[index] || null;
};

const useFlashcardCountdowns = (cards, revealStepSeconds) => {
  const [countdowns, setCountdowns] = useState([]);

  useEffect(() => {
    if (!cards.length) {
      setCountdowns([]);
      return undefined;
    }

    const initial = cards.map((_, index) => (index + 1) * revealStepSeconds);
    setCountdowns(initial);

    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next = prev.map((value) => (value > 0 ? value - 1 : 0));
        if (next.every((value) => value === 0)) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cards, revealStepSeconds]);

  return countdowns;
};

const LoadingState = ({
  progressPercent = 0,
  progressLabel = '',
  loadingContext = null,
  vocabCards = [],
  fallbackCount = 3,
  onLoadMore
}) => {
  const cards = useMemo(() => {
    if (Array.isArray(vocabCards) && vocabCards.length) {
      return vocabCards;
    }
    return pickFlashcards(fallbackCount);
  }, [vocabCards, fallbackCount]);
  const countdowns = useFlashcardCountdowns(cards, REVEAL_STEP_SECONDS);
  const activeSnippet = useRotatingSnippet();

  const renderFlashcardBody = (card, index) => {
    const secondsRemaining = countdowns[index] ?? REVEAL_STEP_SECONDS * (index + 1);
    const revealMeaning = secondsRemaining === 0;
    return (
      <div key={card.word} style={styles.flashcardItem}>
        <div style={styles.flashcardWord}>{card.word}</div>
        {revealMeaning ? (
          <div style={styles.flashcardMeaning}>{card.meaning}</div>
        ) : (
          <div style={styles.flashcardCountdown}>{secondsRemaining}초 뒤에 뜻이 보여요</div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.loading}>
      <div style={styles.loadingProgressPanel}>
        <div style={styles.progressBarOuter}>
          <div
            style={{
              ...styles.progressBarInner,
              width: `${Math.min(100, Math.max(0, progressPercent))}%`
            }}
          />
        </div>
        <div style={styles.progressLabels}>
          <span>{progressLabel || '문제를 준비하고 있어요...'}</span>
          {loadingContext?.totalRequested ? (
            <span>요청한 문항: {loadingContext.totalRequested}문</span>
          ) : null}
        </div>
      </div>

      <div style={styles.spinner} />

      <div style={styles.loadingSnippet}>
        {activeSnippet?.type === 'quote' ? (
          <>
            <p style={styles.quoteText}>“{activeSnippet.quote}”</p>
            <p style={styles.quoteMeta}>- {activeSnippet.author} -</p>
            <p style={styles.quoteTranslation}>{activeSnippet.translation}</p>
          </>
        ) : (
          <p style={styles.loadingMessage}>{activeSnippet?.text || '문제를 준비하고 있어요! 잠시만 기다려 주세요 😊'}</p>
        )}
      </div>

      {cards.length > 0 && (
        <div style={styles.flashcardArea}>
          <div style={styles.flashcardTitle}>기다리는 동안 단어 미리보기✨</div>
          <div style={styles.flashcardList}>
            {cards.map((card, index) => renderFlashcardBody(card, index))}
          </div>
          {typeof onLoadMore === 'function' && (
            <button type="button" style={styles.flashcardMoreButton} onClick={onLoadMore}>
              단어 더보기 +5
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadingState;
