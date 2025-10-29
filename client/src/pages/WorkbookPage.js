import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { workbookMeta, workbookSteps } from '../data/workbook/oneTwentyFiveTen';

const STORAGE_KEY = 'loe.workbook.completedSteps';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  hero: {
    padding: '32px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(165,180,252,0.35))',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 12px 28px -24px rgba(30,41,59,0.4)'
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: 800,
    marginBottom: '12px',
    color: 'var(--text-primary)'
  },
  heroDesc: {
    fontSize: '16px',
    lineHeight: 1.6,
    color: 'var(--text-secondary)'
  },
  stepGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px'
  },
  stepCard: {
    padding: '20px',
    borderRadius: '16px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer'
  },
  stepCardCompleted: {
    borderColor: 'var(--success-border)',
    boxShadow: '0 8px 24px -20px rgba(34,197,94,0.5)'
  },
  stepMood: {
    fontSize: '28px'
  },
  stepTitle: {
    fontWeight: 700,
    fontSize: '18px',
    color: 'var(--text-primary)'
  },
  stepIntro: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(79,70,229,0.09)',
    color: 'var(--indigo-strong)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  detailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  detailHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '24px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12))',
    border: '1px solid var(--surface-border)'
  },
  navigationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  missionBox: {
    padding: '18px',
    borderRadius: '16px',
    background: 'var(--surface-card)',
    border: '1px dashed var(--border-strong)',
    fontSize: '15px',
    color: 'var(--text-primary)',
    lineHeight: 1.6
  },
  missionTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  cardDeck: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  flashcard: {
    width: '100%',
    maxWidth: '520px',
    minHeight: '220px',
    borderRadius: '20px',
    padding: '32px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    boxShadow: '0 24px 50px -35px rgba(15,23,42,0.35)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px',
    textAlign: 'center'
  },
  flashcardFront: {
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '20px',
    lineHeight: 1.5,
    whiteSpace: 'pre-line'
  },
  flashcardBack: {
    color: 'var(--text-secondary)',
    fontSize: '18px',
    lineHeight: 1.7,
    whiteSpace: 'pre-line'
  },
  cardControls: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  primaryButton: {
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: '140px'
  },
  secondaryButton: {
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: '140px'
  },
  progressText: {
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  checklist: {
    padding: '18px',
    borderRadius: '16px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    lineHeight: 1.6
  },
  completeButton: {
    alignSelf: 'flex-end',
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--success-border)',
    background: 'rgba(34,197,94,0.12)',
    color: 'var(--success-strong)',
    fontWeight: 700,
    cursor: 'pointer'
  }
};

const getStepFromPath = (pathname) => {
  if (!pathname.startsWith('/workbook')) return null;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const index = parseInt(parts[1], 10);
  if (Number.isNaN(index)) return null;
  return workbookSteps.find((step) => step.step === index) ? index : null;
};

const WorkbookPage = () => {
  const [currentStepNumber, setCurrentStepNumber] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getStepFromPath(window.location.pathname);
  });
  const [cardIndex, setCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return new Set();
    }
  });

  const currentStep = useMemo(() => {
    if (!currentStepNumber) return null;
    return workbookSteps.find((step) => step.step === currentStepNumber) || null;
  }, [currentStepNumber]);

  const persistCompleted = useCallback((nextSet) => {
    setCompletedSteps(nextSet);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(nextSet)));
    }
  }, []);

  const goToOverview = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', '/workbook');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const goToStep = useCallback((stepNumber) => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', `/workbook/${stepNumber}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  useEffect(() => {
    const handlePop = () => {
      const stepNumber = getStepFromPath(window.location.pathname);
      setCurrentStepNumber(stepNumber);
      setCardIndex(0);
      setShowBack(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePop);
    handlePop();
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  useEffect(() => {
    setCardIndex(0);
    setShowBack(false);
  }, [currentStepNumber]);

  const handleNextCard = useCallback(() => {
    if (!currentStep) return;
    setCardIndex((prev) => {
      const next = prev + 1;
      if (next >= currentStep.cards.length) {
        return prev;
      }
      return next;
    });
    setShowBack(false);
  }, [currentStep]);

  const handlePrevCard = useCallback(() => {
    if (!currentStep) return;
    setCardIndex((prev) => {
      if (prev === 0) return prev;
      return prev - 1;
    });
    setShowBack(false);
  }, [currentStep]);

  const handleFlip = useCallback(() => {
    setShowBack((prev) => !prev);
  }, []);

  const handleCompleteStep = useCallback(() => {
    if (!currentStep) return;
    const next = new Set(completedSteps);
    if (next.has(currentStep.step)) {
      next.delete(currentStep.step);
    } else {
      next.add(currentStep.step);
    }
    persistCompleted(next);
  }, [completedSteps, currentStep, persistCompleted]);

  if (!currentStep) {
    return (
      <div style={styles.container}>
        <section style={styles.hero}>
          <div style={styles.pill}>NEW · Workbook Practice</div>
          <h1 style={styles.heroTitle}>{workbookMeta.title}</h1>
          <p style={styles.heroDesc}>{workbookMeta.description}</p>
        </section>

        <section style={styles.stepGrid}>
          {workbookSteps.map((step) => {
            const isDone = completedSteps.has(step.step);
            return (
              <button
                key={step.step}
                style={{
                  ...styles.stepCard,
                  ...(isDone ? styles.stepCardCompleted : {})
                }}
                onClick={() => goToStep(step.step)}
              >
                <div style={styles.pill}>{step.label}</div>
                <span style={styles.stepMood}>{step.mood}</span>
                <h3 style={styles.stepTitle}>{step.title}</h3>
                <p style={styles.stepIntro}>{step.intro}</p>
                <div style={styles.stepIntro}><strong>미션</strong> · {step.mission}</div>
                {isDone && <div style={{ color: 'var(--success-strong)', fontWeight: 700 }}>✅ 완료됨</div>}
              </button>
            );
          })}
        </section>
      </div>
    );
  }

  const totalCards = currentStep.cards.length;
  const currentCard = currentStep.cards[cardIndex];
  const completionLabel = completedSteps.has(currentStep.step) ? '완료 표시 해제' : 'Step 완료 체크';

  return (
    <div style={styles.detailContainer}>
      <div style={styles.detailHeader}>
        <div style={styles.navigationRow}>
          <button type="button" style={styles.backButton} onClick={goToOverview}>
            ← 개요로 돌아가기
          </button>
          <div style={styles.pill}>{currentStep.label}</div>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {currentStep.mood} {currentStep.title}
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{currentStep.intro}</p>
      </div>

      <div style={styles.missionBox}>
        <div style={styles.missionTitle}>🎯 오늘의 미션</div>
        {currentStep.mission}
      </div>

      <div style={styles.cardDeck}>
        <div style={styles.progressText}>
          카드 {cardIndex + 1} / {totalCards}
        </div>
        <div style={styles.flashcard}>
          <div style={styles.flashcardFront}>
            {currentCard.front}
          </div>
          {showBack && (
            <div style={styles.flashcardBack}>{currentCard.back}</div>
          )}
        </div>
        <div style={styles.cardControls}>
          <button
            type="button"
            style={{
              ...styles.secondaryButton,
              ...(cardIndex === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
            }}
            onClick={handlePrevCard}
            disabled={cardIndex === 0}
          >
            이전 카드
          </button>
          <button type="button" style={styles.primaryButton} onClick={handleFlip}>
            {showBack ? '앞면 보기' : '뒷면 보기'}
          </button>
          <button
            type="button"
            style={{
              ...styles.secondaryButton,
              ...(cardIndex === totalCards - 1 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
            }}
            onClick={handleNextCard}
            disabled={cardIndex === totalCards - 1}
          >
            다음 카드
          </button>
        </div>
      </div>

      <div style={styles.checklist}>
        <strong>🔁 Takeaways</strong>
        {currentStep.takeaways.map((item, index) => (
          <div key={index} style={styles.checklistItem}>
            <span>☑</span>
            <span>{item}</span>
          </div>
        ))}
        <button type="button" style={styles.completeButton} onClick={handleCompleteStep}>
          {completionLabel}
        </button>
      </div>
    </div>
  );
};

export default WorkbookPage;
