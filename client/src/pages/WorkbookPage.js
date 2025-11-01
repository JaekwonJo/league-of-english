import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import FriendlyError from '../components/common/FriendlyError';

const STORAGE_KEY = 'loe.workbook.completedSteps.v2';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  hero: {
    padding: '32px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(165,180,252,0.32))',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '18px'
  },
  cardButton: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative'
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  cardHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  deleteButton: {
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid rgba(248,113,113,0.4)',
    background: 'rgba(248,113,113,0.12)',
    color: 'rgb(220,38,38)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  deleteButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(124,58,237,0.12)',
    color: 'var(--indigo-strong)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  generatorCard: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px dashed var(--border-strong)',
    background: 'var(--surface-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  generatorWrapper: {
    marginTop: '16px',
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.08))',
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
  },
  generatorStepBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '18px',
    borderRadius: '16px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)'
  },
  generatorStepHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  generatorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(37,99,235,0.12)',
    color: 'var(--indigo-strong)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em'
  },
  generatorDescription: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5
  },
  generatorSearchRow: {
    display: 'flex'
  },
  generatorSearchInput: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontSize: '14px'
  },
  generatorDocGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '340px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  generatorDocCard: {
    textAlign: 'left',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    transition: 'border 0.2s ease, background 0.2s ease'
  },
  generatorDocCardActive: {
    border: '1px solid var(--indigo)',
    background: 'rgba(99,102,241,0.12)'
  },
  generatorDocTitle: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
    margin: 0
  },
  generatorDocMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: 0
  },
  generatorEmpty: {
    padding: '16px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    fontSize: '13px'
  },
  generatorErrorBox: {
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(248,113,113,0.15)',
    color: 'var(--danger-strong)',
    fontSize: '13px'
  },
  generatorPassageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '320px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  generatorPassageCard: {
    textAlign: 'left',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: 'pointer'
  },
  generatorPassageCardActive: {
    border: '1px solid var(--success-strong)',
    background: 'rgba(34,197,94,0.15)'
  },
  generatorPassageExcerpt: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4
  },
  generatorSummaryBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  generatorButtonRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  select: {
    flex: '1 1 220px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)'
  },
  primaryButton: {
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: '160px'
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
  detailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  detailHeader: {
    padding: '24px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(56,189,248,0.12))',
    border: '1px solid var(--surface-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  stepSelector: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  stepButton: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    cursor: 'pointer',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  stepButtonActive: {
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    borderColor: 'transparent'
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
  flashcard: {
    width: '100%',
    maxWidth: '540px',
    minHeight: '220px',
    borderRadius: '20px',
    padding: '32px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    boxShadow: '0 24px 50px -35px rgba(15,23,42,0.35)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px'
  },
  flashcardCenter: {
    textAlign: 'center',
    alignItems: 'center'
  },
  flashcardLeft: {
    textAlign: 'left',
    alignItems: 'stretch'
  },
  flashcardFront: {
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '20px',
    lineHeight: 1.5,
    whiteSpace: 'pre-line'
  },
  flashcardFrontInteractive: {
    width: '100%',
    textAlign: 'left'
  },
  flashcardBack: {
    color: 'var(--text-secondary)',
    fontSize: '18px',
    lineHeight: 1.7,
    whiteSpace: 'pre-line'
  },
  puzzleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left'
  },
  puzzleHint: {
    fontSize: '14px',
    color: 'var(--text-primary)'
  },
  puzzleTokenTray: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  puzzleTokenButton: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'background 0.2s ease, transform 0.2s ease'
  },
  puzzleTokenDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  puzzleSelectedRow: {
    minHeight: '48px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px',
    borderRadius: '12px',
    border: '1px dashed var(--surface-border)',
    background: 'rgba(99,102,241,0.15)'
  },
  puzzleSelectedToken: {
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600
  },
  puzzleStatus: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  puzzleControls: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  puzzleInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontSize: '15px'
  },
  cardControls: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center'
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
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,0.12)',
    color: 'var(--success-strong)',
    fontSize: '12px',
    fontWeight: 600
  },
  emptyState: {
    padding: '40px',
    borderRadius: '18px',
    border: '1px dashed var(--border-strong)',
    background: 'var(--surface-soft)',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  },
  testContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  testHeaderRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  testQuestionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  testQuestionCard: {
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  testQuestionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  testQuestionPrompt: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: 'var(--text-secondary)'
  },
  testHint: {
    fontSize: '13px',
    color: 'var(--text-muted)'
  },
  testOptionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  testOptionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    cursor: 'pointer',
    transition: 'border 0.2s ease, background 0.2s ease'
  },
  testOptionItemSelected: {
    border: '1px solid var(--indigo)',
    background: 'rgba(99,102,241,0.12)'
  },
  testInputsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  testInput: {
    flex: '1 1 180px',
    minWidth: '160px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    fontSize: '14px',
    color: 'var(--text-primary)'
  },
  testSubmitRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  testResultCard: {
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid var(--surface-border)',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  resultBadgeCorrect: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(34,197,94,0.15)',
    color: 'var(--success-strong)',
    fontSize: '12px',
    fontWeight: 700
  },
  resultBadgeIncorrect: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(248,113,113,0.15)',
    color: 'rgb(220,38,38)',
    fontSize: '12px',
    fontWeight: 700
  }
};

const loadCompletedFromStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveCompletedToStorage = (value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('[workbook] completion storage 실패:', error?.message || error);
  }
};

const isTeacherOrAdmin = (role) => ['teacher', 'admin'].includes(String(role || '').toLowerCase());

const WordOrderPuzzle = ({ card, reveal }) => {
  const [available, setAvailable] = useState([]);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    const tokens = Array.isArray(card?.tokens)
      ? card.tokens.map((token, idx) => ({
          key: token.id || `${idx}-${token.text}`,
          text: token.text
        }))
      : [];
    setAvailable(tokens);
    setPicked([]);
  }, [card]);

  const handlePick = useCallback((token) => {
    setAvailable((prev) => prev.filter((item) => item.key !== token.key));
    setPicked((prev) => [...prev, token]);
  }, []);

  const handleRemove = useCallback((index) => {
    setPicked((prevPicked) => {
      const token = prevPicked[index];
      if (!token) return prevPicked;
      setAvailable((prev) => [...prev, token]);
      return prevPicked.filter((_, i) => i !== index);
    });
  }, []);

  const handleReset = useCallback(() => {
    const tokens = Array.isArray(card?.tokens)
      ? card.tokens.map((token, idx) => ({
          key: token.id || `${idx}-${token.text}`,
          text: token.text
        }))
      : [];
    setAvailable(tokens);
    setPicked([]);
  }, [card]);

  const assembled = picked.map((token) => token.text).join(' ');
  const answer = (card?.answer || '').trim();
  const isCorrect = assembled.trim() === answer && answer.length > 0;

  return (
    <div style={styles.puzzleContainer}>
      {card?.prompt && <div style={styles.puzzleHint}>💡 힌트: {card.prompt}</div>}
      <div style={styles.puzzleSelectedRow}>
        {picked.length === 0 && <span style={styles.puzzleStatus}>여기에 단어를 눌러 순서대로 담아 보세요.</span>}
        {picked.map((token, index) => (
          <button
            type="button"
            key={`picked-${token.key}`}
            style={styles.puzzleSelectedToken}
            onClick={() => handleRemove(index)}
          >
            {token.text}
          </button>
        ))}
      </div>
      <div style={styles.puzzleTokenTray}>
        {available.map((token) => (
          <button
            type="button"
            key={`available-${token.key}`}
            style={styles.puzzleTokenButton}
            onClick={() => handlePick(token)}
          >
            {token.text}
          </button>
        ))}
        {available.length === 0 && picked.length > 0 && (
          <span style={styles.puzzleStatus}>모든 단어를 사용했어요!</span>
        )}
      </div>
      <div style={styles.puzzleControls}>
        <button type="button" style={styles.secondaryButton} onClick={handleReset}>
          퍼즐 초기화
        </button>
        <span style={{ ...styles.puzzleStatus, color: isCorrect ? 'var(--success-strong)' : 'var(--text-muted)' }}>
          현재 조합: {assembled || '—'}
        </span>
      </div>
      {reveal && (
        <div style={styles.puzzleStatus}>정답: {answer}</div>
      )}
    </div>
  );
};

const WordOrderInputPuzzle = ({ card, reveal }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [card]);

  const handleTokenClick = useCallback((token) => {
    setValue((prev) => (prev ? `${prev} ${token}` : token));
  }, []);

  const normalizedAnswer = (card?.answer || '').trim();
  const normalizedInput = value.trim();
  const isCorrect = normalizedAnswer && normalizedInput.toLowerCase() === normalizedAnswer.toLowerCase();

  return (
    <div style={styles.puzzleContainer}>
      {card?.prompt && <div style={styles.puzzleHint}>💡 힌트: {card.prompt}</div>}
      {Array.isArray(card?.tokens) && card.tokens.length > 0 && (
        <div style={styles.puzzleTokenTray}>
          {card.tokens.map((token, index) => (
            <button
              key={`input-token-${index}`}
              type="button"
              style={styles.puzzleTokenButton}
              onClick={() => handleTokenClick(token)}
            >
              {token}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="힌트를 참고해 문장을 완성해 보세요."
        style={styles.puzzleInput}
      />
      <div style={styles.puzzleStatus}>
        현재 입력: {value || '—'} {normalizedAnswer ? (isCorrect ? '✅' : '') : ''}
      </div>
      {reveal && normalizedAnswer && (
        <div style={styles.puzzleStatus}>정답: {normalizedAnswer}</div>
      )}
    </div>
  );
};

const TestWordOrderQuestion = ({ question, value = [], onChange }) => {
  const [available, setAvailable] = useState([]);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    const tokens = Array.isArray(question?.tokens)
      ? question.tokens.map((text, index) => ({ key: `${index}-${text}`, text }))
      : [];

    if (Array.isArray(value) && value.length) {
      const pickedTokens = [];
      const remainingTokens = [...tokens];
      value.forEach((text) => {
        const matchIndex = remainingTokens.findIndex((token) => token.text === text);
        if (matchIndex >= 0) {
          pickedTokens.push(remainingTokens[matchIndex]);
          remainingTokens.splice(matchIndex, 1);
        }
      });
      setPicked(pickedTokens);
      setAvailable(remainingTokens);
    } else {
      setPicked([]);
      setAvailable(tokens);
    }
  }, [question, value]);

  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange(picked.map((token) => token.text));
    }
  }, [picked, onChange]);

  const handlePick = useCallback((token) => {
    setAvailable((prev) => prev.filter((item) => item.key !== token.key));
    setPicked((prev) => [...prev, token]);
  }, []);

  const handleRemove = useCallback((index) => {
    setPicked((prevPicked) => {
      const token = prevPicked[index];
      if (!token) return prevPicked;
      setAvailable((prev) => [...prev, token]);
      return prevPicked.filter((_, i) => i !== index);
    });
  }, []);

  const handleReset = useCallback(() => {
    const tokens = Array.isArray(question?.tokens)
      ? question.tokens.map((text, index) => ({ key: `${index}-${text}`, text }))
      : [];
    setPicked([]);
    setAvailable(tokens);
    if (typeof onChange === 'function') {
      onChange([]);
    }
  }, [question, onChange]);

  return (
    <div style={styles.puzzleContainer}>
      {question?.hint && <div style={styles.puzzleHint}>💡 힌트: {question.hint}</div>}
      <div style={styles.puzzleSelectedRow}>
        {picked.length === 0 && <span style={styles.puzzleStatus}>단어를 눌러 순서대로 배치해 보세요.</span>}
        {picked.map((token, index) => (
          <button
            type="button"
            key={`test-picked-${token.key}`}
            style={styles.puzzleSelectedToken}
            onClick={() => handleRemove(index)}
          >
            {token.text}
          </button>
        ))}
      </div>
      <div style={styles.puzzleTokenTray}>
        {available.map((token) => (
          <button
            type="button"
            key={`test-available-${token.key}`}
            style={styles.puzzleTokenButton}
            onClick={() => handlePick(token)}
          >
            {token.text}
          </button>
        ))}
        {available.length === 0 && picked.length > 0 && (
          <span style={styles.puzzleStatus}>모든 단어를 사용했어요!</span>
        )}
      </div>
      <div style={styles.puzzleControls}>
        <button type="button" style={styles.secondaryButton} onClick={handleReset}>
          퍼즐 초기화
        </button>
        <span style={styles.puzzleStatus}>현재 조합: {picked.map((token) => token.text).join(' ') || '—'}</span>
      </div>
    </div>
  );
};

const TestWordOrderInputQuestion = ({ question, value = '', onChange }) => {
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value, question]);

  const handleTokenClick = useCallback((token) => {
    setInputValue((prev) => {
      const next = prev ? `${prev} ${token}` : token;
      if (typeof onChange === 'function') {
        onChange(next);
      }
      return next;
    });
  }, [onChange]);

  const handleChange = useCallback((event) => {
    const next = event.target.value;
    setInputValue(next);
    if (typeof onChange === 'function') {
      onChange(next);
    }
  }, [onChange]);

  return (
    <div style={styles.puzzleContainer}>
      {question?.hint && <div style={styles.puzzleHint}>💡 힌트: {question.hint}</div>}
      {Array.isArray(question?.tokens) && question.tokens.length > 0 && (
        <div style={styles.puzzleTokenTray}>
          {question.tokens.map((token, index) => (
            <button
              key={`test-input-token-${index}`}
              type="button"
              style={styles.puzzleTokenButton}
              onClick={() => handleTokenClick(token)}
            >
              {token}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="힌트를 참고해 문장을 완성해 보세요."
        style={styles.puzzleInput}
      />
      <div style={styles.puzzleStatus}>현재 입력: {inputValue || '—'}</div>
    </div>
  );
};

const WorkbookPage = () => {
  const { user, updateUser } = useAuth();
  const canManageWorkbooks = isTeacherOrAdmin(user?.role);

  const [workbooks, setWorkbooks] = useState([]);
  const [workbookCache, setWorkbookCache] = useState({});
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [selectedWorkbookId, setSelectedWorkbookId] = useState(null);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const [completedSteps, setCompletedSteps] = useState(() => loadCompletedFromStorage());

  const [showGenerator, setShowGenerator] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [passages, setPassages] = useState([]);
  const [passagesLoading, setPassagesLoading] = useState(false);
  const [passagesError, setPassagesError] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedPassage, setSelectedPassage] = useState('1');
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState('');
  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const [isTestMode, setIsTestMode] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [testQuestions, setTestQuestions] = useState([]);
  const [testAnswers, setTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testWorkbookMeta, setTestWorkbookMeta] = useState(null);

  const selectedWorkbook = selectedWorkbookId ? workbookCache[selectedWorkbookId] : null;
  const documentsForWorkbook = useMemo(() => (
    Array.isArray(documents)
      ? documents.filter((doc) => String(doc.type || '').toLowerCase() !== 'vocabulary')
      : []
  ), [documents]);

  const filteredDocuments = useMemo(() => {
    if (!documentSearch.trim()) return documentsForWorkbook;
    const keyword = documentSearch.trim().toLowerCase();
    return documentsForWorkbook.filter((doc) => {
      const fields = [doc.title, doc.category, doc.school];
      return fields.some((field) => String(field || '').toLowerCase().includes(keyword));
    });
  }, [documentsForWorkbook, documentSearch]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documentsForWorkbook.find((doc) => String(doc.id) === String(selectedDocumentId)) || null;
  }, [documentsForWorkbook, selectedDocumentId]);

  const selectedPassageNumber = useMemo(() => {
    const numeric = Number(selectedPassage);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  }, [selectedPassage]);

  const isReadyToGenerate = useMemo(() => {
    if (!selectedDocument) return false;
    if (!passages.length) return false;
    return passages.some((item) => Number(item.passageNumber) === selectedPassageNumber);
  }, [selectedDocument, passages, selectedPassageNumber]);
  const totalSteps = selectedWorkbook?.steps?.length || 0;
  const currentStep = useMemo(() => {
    if (!selectedWorkbook || totalSteps === 0) return null;
    return selectedWorkbook.steps.find((step) => Number(step.step) === Number(currentStepNumber))
      || selectedWorkbook.steps[0];
  }, [selectedWorkbook, currentStepNumber, totalSteps]);

  const currentCard = useMemo(() => {
    const cards = currentStep?.cards;
    if (!Array.isArray(cards) || !cards.length) return null;
    return cards[cardIndex] || cards[0] || null;
  }, [currentStep, cardIndex]);

  const shouldLeftAlignCard = useMemo(() => {
    if (!currentStep) return false;
    const stepNumber = Number(currentStep.step);
    if (stepNumber === 7 || stepNumber === 8) return true;
    const type = currentCard?.type;
    if (type && ['sentence-insert', 'paragraph-order', 'paragraph-sequence'].includes(type)) {
      return true;
    }
    const frontText = typeof currentCard?.front === 'string' ? currentCard.front : '';
    if (frontText.includes('[문단 배열') || frontText.includes('[문장 삽입')) {
      return true;
    }
    return false;
  }, [currentStep, currentCard]);

  const isStepCompleted = useMemo(() => {
    if (!selectedWorkbookId) return false;
    const stored = completedSteps[selectedWorkbookId];
    if (!Array.isArray(stored)) return false;
    return stored.includes(currentStepNumber);
  }, [completedSteps, currentStepNumber, selectedWorkbookId]);

  const completionSummary = useMemo(() => {
    const summary = {};
    workbooks.forEach((item) => {
      const stored = completedSteps[item.id];
      const completed = Array.isArray(stored) ? stored.length : 0;
      summary[item.id] = {
        completed,
        total: item.totalSteps || 0
      };
    });
    return summary;
  }, [completedSteps, workbooks]);

  const parseLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const { pathname, search } = window.location;
    const segments = pathname.split('/').filter(Boolean);
    let workbookId = null;
    if (segments[0] === 'workbook' && segments[1]) {
      workbookId = segments[1];
    }
    const params = new URLSearchParams(search);
    const stepParam = Number(params.get('step') || '1');
    const normalizedStep = Number.isNaN(stepParam) || stepParam < 1 ? 1 : stepParam;
    setSelectedWorkbookId(workbookId);
    setCurrentStepNumber(normalizedStep);
    setCardIndex(0);
    setShowBack(false);
  }, []);

  const fetchWorkbooks = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const response = await api.workbooks.list();
      const items = Array.isArray(response?.data) ? response.data : [];
      setWorkbooks(items);
      setWorkbookCache((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          if (!next[item.id]) {
            next[item.id] = prev[item.id] || null;
          }
        });
        return next;
      });
    } catch (error) {
      setListError(error.message || '워크북 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchWorkbookDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await api.workbooks.detail(id);
      if (response?.data) {
        setWorkbookCache((prev) => ({ ...prev, [id]: response.data }));
      }
    } catch (error) {
      setDetailError(error.message || '워크북을 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleOpenWorkbook = useCallback((id, step = 1) => {
    if (typeof window === 'undefined') return;
    const normalizedStep = Math.max(1, step);
    window.history.pushState({}, '', `/workbook/${id}?step=${normalizedStep}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const handleCardKeyDown = useCallback((event, id) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenWorkbook(id, 1);
    }
  }, [handleOpenWorkbook]);

  const handleBackToOverview = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', '/workbook');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const handleStepChange = useCallback((stepNumber) => {
    if (!selectedWorkbookId) return;
    handleOpenWorkbook(selectedWorkbookId, stepNumber);
  }, [handleOpenWorkbook, selectedWorkbookId]);

  const handleToggleCompletion = useCallback(() => {
    if (!selectedWorkbookId || !currentStep) return;
    setCompletedSteps((prev) => {
      const current = Array.isArray(prev[selectedWorkbookId]) ? new Set(prev[selectedWorkbookId]) : new Set();
      if (current.has(currentStep.step)) {
        current.delete(currentStep.step);
      } else {
        current.add(currentStep.step);
      }
      const next = { ...prev, [selectedWorkbookId]: Array.from(current).sort((a, b) => a - b) };
      saveCompletedToStorage(next);
      return next;
    });
  }, [currentStep, selectedWorkbookId]);

  const handlePrevCard = useCallback(() => {
    if (!currentStep) return;
    setCardIndex((prev) => (prev <= 0 ? 0 : prev - 1));
    setShowBack(false);
  }, [currentStep]);

  const handleNextCard = useCallback(() => {
    if (!currentStep) return;
    setCardIndex((prev) => {
      const next = prev + 1;
      return next >= currentStep.cards.length ? prev : next;
    });
    setShowBack(false);
  }, [currentStep]);

  const handleFlipCard = useCallback(() => {
    setShowBack((prev) => !prev);
  }, []);

  const handleStartTest = useCallback(async () => {
    if (!selectedWorkbookId) return;
    setIsTestMode(true);
    setTestLoading(true);
    setTestError('');
    setTestQuestions([]);
    setTestAnswers({});
    setTestResult(null);
    setTestWorkbookMeta(null);
    try {
      const response = await api.workbooks.test(selectedWorkbookId);
      const payload = response?.data || response;
      if (payload?.workbook) {
        setTestWorkbookMeta(payload.workbook);
      }
      const questions = Array.isArray(payload?.questions) ? payload.questions : [];
      if (!questions.length) {
        setTestError('출제할 수 있는 문제가 부족해요. 워크북을 다시 생성해 주세요.');
      }
      setTestQuestions(questions);
    } catch (error) {
      setTestError(error.message || '워크북 테스트를 준비하지 못했습니다.');
    } finally {
      setTestLoading(false);
    }
  }, [selectedWorkbookId]);

  const handleExitTest = useCallback(() => {
    setIsTestMode(false);
    setTestLoading(false);
    setTestError('');
    setTestQuestions([]);
    setTestAnswers({});
    setTestResult(null);
    setTestSubmitting(false);
    setTestWorkbookMeta(null);
  }, []);

  const handleRetakeTest = useCallback(() => {
    setTestAnswers({});
    setTestResult(null);
    handleStartTest();
  }, [handleStartTest]);

  const handleTestAnswerChange = useCallback((questionId, answer) => {
    setTestAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  const handleSubmitTest = useCallback(async () => {
    if (!selectedWorkbookId || !testQuestions.length) return;
    const payloadAnswers = testQuestions.map((question) => {
      const raw = testAnswers[question.id];
      let normalized = raw;
      switch (question.type) {
        case 'multi-blank': {
          const blanks = question.blanks || (Array.isArray(question.answers) ? question.answers.length : 2);
          if (Array.isArray(raw)) {
            const trimmed = raw.slice(0, blanks);
            while (trimmed.length < blanks) {
              trimmed.push('');
            }
            normalized = trimmed;
          } else {
            normalized = Array.from({ length: blanks }, () => '');
          }
          break;
        }
        case 'single-blank':
        case 'word-order-input':
        case 'grammar-choice':
        case 'sentence-insert':
          normalized = typeof raw === 'string' ? raw : '';
          break;
        case 'word-order':
          normalized = Array.isArray(raw) ? raw : [];
          break;
        default:
          normalized = raw;
      }
      return {
        questionId: question.id,
        type: question.type,
        answer: normalized
      };
    });

    setTestSubmitting(true);
    setTestError('');
    try {
      const response = await api.workbooks.submitTest(selectedWorkbookId, { answers: payloadAnswers });
      const payload = response?.data || response;
      setTestResult(payload);
      if (payload?.updatedUser && typeof updateUser === 'function') {
        updateUser(payload.updatedUser);
      }
    } catch (error) {
      setTestError(error.message || '워크북 테스트를 채점하지 못했습니다.');
    } finally {
      setTestSubmitting(false);
    }
  }, [selectedWorkbookId, testQuestions, testAnswers, updateUser]);

  const renderTestQuestion = (question, index) => {
    const value = testAnswers[question.id];
    const questionNumber = index + 1;

    const renderBlankInputs = (blanks) => {
      const values = Array.isArray(value)
        ? value.slice(0, blanks)
        : Array.from({ length: blanks }, () => '');
      while (values.length < blanks) {
        values.push('');
      }
      return (
        <div style={styles.testInputsRow}>
          {values.map((item, blankIndex) => (
            <input
              key={`${question.id}-blank-${blankIndex}`}
              type="text"
              value={item}
              onChange={(event) => {
                const next = [...values];
                next[blankIndex] = event.target.value;
                handleTestAnswerChange(question.id, next);
              }}
              placeholder={`빈칸 ${blankIndex + 1}`}
              style={styles.testInput}
            />
          ))}
        </div>
      );
    };

    const renderChoiceOptions = (options = []) => {
      const selected = typeof value === 'string' ? value : '';
      return (
        <div style={styles.testOptionList}>
          {options.map((option) => {
            const isSelected = selected === option.label;
            return (
              <label
                key={`${question.id}-option-${option.label}`}
                style={{
                  ...styles.testOptionItem,
                  ...(isSelected ? styles.testOptionItemSelected : {})
                }}
              >
                <input
                  type="radio"
                  name={`test-question-${question.id}`}
                  value={option.label}
                  checked={isSelected}
                  onChange={() => handleTestAnswerChange(question.id, option.label)}
                  style={{ marginRight: '8px' }}
                />
                <strong>{option.label}</strong>
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      );
    };

    return (
      <div key={question.id} style={styles.testQuestionCard}>
        <div style={styles.testQuestionHeader}>
          <span>문항 {questionNumber}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{question.stepLabel || ''}</span>
        </div>
        {question.prompt && <div style={styles.testQuestionPrompt}>{question.prompt}</div>}
        {question.givenSentence && (
          <div style={styles.testHint}>[주어진 문장] {question.givenSentence}</div>
        )}
        {Array.isArray(question.contextLines) && question.contextLines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {question.contextLines.map((line, lineIndex) => (
              <div key={`${question.id}-context-${lineIndex}`} style={styles.testQuestionPrompt}>
                {line}
              </div>
            ))}
          </div>
        )}
        {question.hint && <div style={styles.testHint}>힌트: {question.hint}</div>}

        {question.type === 'single-blank' && (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleTestAnswerChange(question.id, event.target.value)}
            placeholder="빈칸에 들어갈 표현을 입력하세요"
            style={styles.testInput}
          />
        )}

        {question.type === 'multi-blank' && (
          renderBlankInputs(question.blanks || 2)
        )}

        {question.type === 'grammar-choice' && renderChoiceOptions(question.options)}

        {question.type === 'sentence-insert' && renderChoiceOptions(question.options)}

        {question.type === 'word-order' && (
          <TestWordOrderQuestion
            question={question}
            value={Array.isArray(value) ? value : []}
            onChange={(next) => handleTestAnswerChange(question.id, next)}
          />
        )}

        {question.type === 'word-order-input' && (
          <TestWordOrderInputQuestion
            question={question}
            value={typeof value === 'string' ? value : ''}
            onChange={(next) => handleTestAnswerChange(question.id, next)}
          />
        )}
      </div>
    );
  };

  const renderResultDetail = (detail, index) => {
    const question = detail.question || {};
    const badgeStyle = detail.correct ? styles.resultBadgeCorrect : styles.resultBadgeIncorrect;
    return (
      <div key={detail.questionId || index} style={styles.testQuestionCard}>
        <div style={styles.testQuestionHeader}>
          <span>문항 {index + 1}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {question.stepLabel && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{question.stepLabel}</span>}
            <span style={badgeStyle}>{detail.correct ? '정답' : '오답'}</span>
          </div>
        </div>
        {question.prompt && <div style={styles.testQuestionPrompt}>{question.prompt}</div>}
        {question.givenSentence && (
          <div style={styles.testHint}>[주어진 문장] {question.givenSentence}</div>
        )}
        {Array.isArray(question.contextLines) && question.contextLines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {question.contextLines.map((line, lineIndex) => (
              <div key={`${detail.questionId}-context-${lineIndex}`} style={styles.testQuestionPrompt}>
                {line}
              </div>
            ))}
          </div>
        )}
        <div><strong>내 답</strong>: {detail.userAnswer ? detail.userAnswer : '미응답'}</div>
        <div><strong>정답</strong>: {detail.correctAnswer || '-'}</div>
        {detail.explanation && (
          <div style={styles.testHint}>해설: {detail.explanation}</div>
        )}
      </div>
    );
  };

  const renderTestView = () => {
    const workbookMeta = testWorkbookMeta || selectedWorkbook || {};
    return (
      <div style={styles.detailContainer}>
        <div style={styles.detailHeader}>
          <div style={styles.testHeaderRow}>
            <button type="button" style={styles.secondaryButton} onClick={handleExitTest}>
              ← 학습 모드로 돌아가기
            </button>
            <div style={styles.pill}>Workbook · {workbookMeta.documentTitle || selectedWorkbook?.documentTitle || '선택한 자료'}</div>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>워크북 TEST</h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            학습한 내용을 바탕으로 테스트를 진행해 보세요. 모든 문항을 풀고 제출하면 즉시 채점되고 LP가 반영됩니다.
          </p>
        </div>

        <div style={styles.testContainer}>
          {testError && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(248,113,113,0.4)',
                background: 'rgba(248,113,113,0.12)',
                color: 'rgb(220,38,38)'
              }}
            >
              {testError}
            </div>
          )}

          {testLoading ? (
            <div style={styles.generatorEmpty}>테스트 문제를 준비하고 있어요... ⏳</div>
          ) : testResult ? (
            <>
              <div style={styles.testResultCard}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>채점 결과</h3>
                <div>총 {testResult.summary?.total || 0}문항 중 <strong>{testResult.summary?.correct || 0}</strong>개 정답</div>
                <div>정확도 {testResult.summary?.accuracy ?? 0}%</div>
                <div>
                  LP 변화 {testResult.summary?.pointsDelta >= 0 ? '+' : ''}{testResult.summary?.pointsDelta || 0} → 현재 {testResult.summary?.totalPoints || 0}
                </div>
                {testResult.rank?.rank && (
                  <div>현재 랭크: {testResult.rank.rank}위</div>
                )}
              </div>
              <div style={styles.testSubmitRow}>
                <button type="button" style={styles.primaryButton} onClick={handleRetakeTest} disabled={testSubmitting}>
                  다시 테스트 보기
                </button>
                <button type="button" style={styles.secondaryButton} onClick={handleExitTest}>
                  학습 모드로 돌아가기
                </button>
              </div>
              <div style={styles.testQuestionList}>
                {(testResult.details || []).map((detail, index) => renderResultDetail(detail, index))}
              </div>
            </>
          ) : (
            testQuestions.length > 0 ? (
              <>
                <div style={styles.testQuestionList}>
                  {testQuestions.map((question, index) => renderTestQuestion(question, index))}
                </div>
                <div style={styles.testSubmitRow}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={handleSubmitTest}
                    disabled={testSubmitting}
                  >
                    {testSubmitting ? '채점 중...' : '채점하기'}
                  </button>
                  <span style={styles.testHint}>제출하면 즉시 채점되고 LP가 반영됩니다.</span>
                </div>
              </>
            ) : (
              <div style={styles.generatorEmpty}>출제할 문제가 없어요. 워크북을 다시 생성해 주세요.</div>
            )
          )}
        </div>
      </div>
    );
  };

  const handleOpenGenerator = useCallback(async () => {
    setGeneratorError('');
    setPassagesError('');
    setDocumentSearch('');
    setPassages([]);
    setSelectedDocumentId('');
    setSelectedPassage('1');
    setShowGenerator(true);
    if (!documents.length) {
      try {
        const response = await api.documents.list();
        const docs = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setDocuments(docs);
      } catch (error) {
        setGeneratorError(error.message || '문서 목록을 불러오지 못했습니다.');
      }
    }
  }, [documents.length]);

  const handleSelectDocument = useCallback(async (doc) => {
    const value = doc ? String(doc.id) : '';
    setSelectedDocumentId(value);
    setSelectedPassage('1');
    setPassages([]);
    setPassagesError('');
    if (!value) return;
    try {
      setPassagesLoading(true);
      const response = await api.analysis.listPassageSummaries(value);
      const list = Array.isArray(response?.data) ? response.data : [];
      setPassages(list);
      if (list.length > 0) {
        setSelectedPassage(String(list[0].passageNumber || 1));
      }
    } catch (error) {
      setPassagesError(error.message || '지문 목록을 불러오지 못했습니다.');
    } finally {
      setPassagesLoading(false);
    }
  }, []);

  const handleGenerateWorkbook = useCallback(async () => {
    if (!selectedDocumentId) {
      setGeneratorError('문서를 선택해 주세요.');
      return;
    }
    setGeneratorLoading(true);
    setGeneratorError('');
    try {
      const payload = {
        documentId: Number(selectedDocumentId),
        passageNumber: Number(selectedPassage) || 1,
        regenerate: false
      };
      const response = await api.workbooks.generate(payload);
      if (response?.data) {
        setWorkbookCache((prev) => ({ ...prev, [response.data.id]: response.data }));
        await fetchWorkbooks();
        setShowGenerator(false);
        handleOpenWorkbook(response.data.id, 1);
      }
    } catch (error) {
      setGeneratorError(error.message || '워크북 생성에 실패했습니다.');
    } finally {
      setGeneratorLoading(false);
    }
  }, [fetchWorkbooks, handleOpenWorkbook, selectedDocumentId, selectedPassage]);

  const handleDeleteWorkbook = useCallback(async (id, title) => {
    if (!id) return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`${title || '워크북'}을(를) 삭제할까요? 삭제하면 복구할 수 없어요.`);
      if (!ok) {
        return;
      }
    }

    const key = String(id);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      await api.workbooks.delete(id);
      setWorkbooks((prev) => prev.filter((item) => String(item.id) !== key));
      setWorkbookCache((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCompletedSteps((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        saveCompletedToStorage(next);
        return next;
      });

      await fetchWorkbooks();

      if (String(selectedWorkbookId) === key) {
        handleBackToOverview();
      }
    } catch (error) {
      const message = String(error?.message || '');
      const notFound = message.includes('찾을 수 없습니다');
      if (!notFound && typeof window !== 'undefined') {
        window.alert(message || '워크북을 삭제하지 못했습니다.');
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [fetchWorkbooks, handleBackToOverview, selectedWorkbookId]);

  const handleDeleteButtonClick = useCallback((event, workbook) => {
    event.preventDefault();
    event.stopPropagation();
    handleDeleteWorkbook(workbook.id, workbook.title);
  }, [handleDeleteWorkbook]);

  useEffect(() => {
    fetchWorkbooks();
  }, [fetchWorkbooks]);

  useEffect(() => {
    parseLocation();
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', parseLocation);
    return () => window.removeEventListener('popstate', parseLocation);
  }, [parseLocation]);

  useEffect(() => {
    if (!selectedWorkbookId) return;
    if (!workbookCache[selectedWorkbookId]) {
      fetchWorkbookDetail(selectedWorkbookId);
    }
  }, [fetchWorkbookDetail, selectedWorkbookId, workbookCache]);

  useEffect(() => {
    if (!selectedWorkbook) return;
    if (currentStepNumber > selectedWorkbook.steps.length) {
      setCurrentStepNumber(selectedWorkbook.steps[0]?.step || 1);
      setCardIndex(0);
      setShowBack(false);
    }
  }, [selectedWorkbook, currentStepNumber]);

  const isDetailPending = Boolean(selectedWorkbookId) && (!selectedWorkbook || detailLoading);

  if (listError) {
    return (
      <FriendlyError
        error={{ summary: listError }}
        onRetry={fetchWorkbooks}
        onHome={() => handleBackToOverview()}
      />
    );
  }

  if (loadingList) {
    return (
      <div style={styles.emptyState}>
        워크북 목록을 불러오는 중이에요... ⏳
      </div>
    );
  }

  if (isDetailPending) {
    return (
      <div style={styles.emptyState}>
        워크북을 불러오는 중이에요... ⏳
      </div>
    );
  }

  if (!selectedWorkbook) {
    return (
      <div style={styles.container}>
        <section style={styles.hero}>
          <div style={styles.pill}>Workbook Practice</div>
          <h1 style={styles.heroTitle}>워크북 학습</h1>
          <p style={styles.heroDesc}>
            문제 학습과 분석 자료를 기반으로, 지문 하나를 10단계로 쪼개서 카드 뒤집기 방식으로 연습할 수 있어요.
            주제 잡기 → 어휘 익히기 → 구조 분석 → 실천 아이디어 정리까지 이어집니다.
          </p>
          {canManageWorkbooks && (
            <button
              type="button"
              data-testid="open-workbook-generator"
              style={{ ...styles.primaryButton, marginTop: '16px' }}
              onClick={handleOpenGenerator}
            >
              + 새 워크북 생성하기
            </button>
          )}
        </section>

        {showGenerator && canManageWorkbooks && (
          <section style={styles.generatorWrapper}>
            <div style={styles.generatorStepBox}>
              <div style={styles.generatorStepHeader}>
                <span style={styles.generatorBadge}>1단계 · 자료 선택</span>
                <p style={styles.generatorDescription}>
                  문제 학습 화면처럼, 워크북으로 만들 자료를 먼저 골라 주세요.
                </p>
              </div>
              <div style={styles.generatorSearchRow}>
                <input
                  type="search"
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="자료 제목이나 분류를 검색해 보세요"
                  style={styles.generatorSearchInput}
                />
              </div>
              <div style={styles.generatorDocGrid}>
                {filteredDocuments.length === 0 ? (
                  <div style={styles.generatorEmpty}>검색 결과가 없어요. 다른 키워드를 입력해 볼까요?</div>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isActive = String(doc.id) === String(selectedDocumentId);
                    const uploadedAt = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-';
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        data-testid="workbook-document-card"
                        style={{
                          ...styles.generatorDocCard,
                          ...(isActive ? styles.generatorDocCardActive : {})
                        }}
                        onClick={() => handleSelectDocument(doc)}
                      >
                        <h4 style={styles.generatorDocTitle}>{doc.title}</h4>
                        <p style={styles.generatorDocMeta}>분류: {doc.category || '미지정'}</p>
                        <p style={styles.generatorDocMeta}>업로드: {uploadedAt}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={styles.generatorStepBox}>
              <div style={styles.generatorStepHeader}>
                <span style={styles.generatorBadge}>2단계 · 지문 선택</span>
                <p style={styles.generatorDescription}>
                  선택한 문서에서 워크북으로 만들 지문을 고르세요.
                </p>
              </div>
              {passagesLoading ? (
                <div style={styles.generatorEmpty}>지문 목록을 불러오는 중이에요... ⏳</div>
              ) : passagesError ? (
                <div style={styles.generatorErrorBox}>{passagesError}</div>
              ) : !selectedDocument ? (
                <div style={styles.generatorEmpty}>왼쪽에서 자료를 먼저 선택해 주세요.</div>
              ) : passages.length === 0 ? (
                <div style={styles.generatorEmpty}>등록된 지문이 아직 없어요. 분석을 먼저 생성해 주세요.</div>
              ) : (
                <div style={styles.generatorPassageList}>
                  {passages.map((item) => {
                    const isActive = Number(item.passageNumber) === selectedPassageNumber;
                    return (
                      <button
                        key={`passage-${item.passageNumber}`}
                        type="button"
                        data-testid="workbook-passage-card"
                        style={{
                          ...styles.generatorPassageCard,
                          ...(isActive ? styles.generatorPassageCardActive : {})
                        }}
                        onClick={() => setSelectedPassage(String(item.passageNumber))}
                      >
                        <strong>지문 {item.passageNumber}</strong>
                        <div style={styles.generatorPassageExcerpt}>
                          {item.excerpt || '지문 미리보기를 준비했어요.'}
                        </div>
                        {typeof item.variantCount === 'number' && (
                          <span style={styles.generatorDocMeta}>분석본 {item.variantCount}개</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.generatorStepBox}>
              <div style={styles.generatorStepHeader}>
                <span style={styles.generatorBadge}>3단계 · 워크북 만들기</span>
                <p style={styles.generatorDescription}>
                  지문을 확인한 뒤, 10단계 워크북 생성을 시작해 보세요.
                </p>
              </div>
              {selectedDocument ? (
                <div style={styles.generatorSummaryBox}>
                  <h4 style={styles.generatorDocTitle}>{selectedDocument.title}</h4>
                  <p style={styles.generatorDocMeta}>지문 {selectedPassageNumber} 선택됨</p>
                  {generatorError && <div style={styles.generatorErrorBox}>{generatorError}</div>}
                  <div style={styles.generatorButtonRow}>
                    <button
                      type="button"
                      data-testid="generate-workbook"
                      onClick={handleGenerateWorkbook}
                      disabled={!isReadyToGenerate || generatorLoading}
                      style={{
                        ...styles.primaryButton,
                        width: '100%',
                        opacity: generatorLoading || !isReadyToGenerate ? 0.7 : 1
                      }}
                    >
                      {generatorLoading ? '생성 중...' : '워크북 생성하기'}
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.secondaryButton, width: '100%' }}
                      onClick={() => setShowGenerator(false)}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.generatorEmpty}>자료를 선택하면 요약과 생성 버튼이 나타나요.</div>
              )}
            </div>
          </section>
        )}

        {workbooks.length === 0 ? (
          <div style={styles.emptyState}>
            아직 생성된 워크북이 없어요. 교사/관리자 계정으로 문서를 선택하고 워크북을 만들어 볼까요? 😊
          </div>
        ) : (
          <section style={styles.stepGrid}>
            {workbooks.map((workbook) => {
              const progress = completionSummary[workbook.id] || { completed: 0, total: workbook.totalSteps };
              const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
              const workbookKey = String(workbook.id);
              const isDeleting = deletingIds.has(workbookKey);
              return (
                <div
                  key={workbook.id}
                  role="button"
                  tabIndex={0}
                  style={styles.cardButton}
                  data-testid="workbook-card"
                  data-workbook-id={workbook.id}
                  onClick={() => handleOpenWorkbook(workbook.id, 1)}
                  onKeyDown={(event) => handleCardKeyDown(event, workbook.id)}
                >
                  <div style={styles.cardHeaderRow}>
                    <div style={styles.cardHeaderMeta}>
                      <span>{workbook.coverEmoji || '📘'}</span>
                      <span>{percent}% 완료</span>
                    </div>
                    {canManageWorkbooks && (
                      <button
                        type="button"
                        style={{
                          ...styles.deleteButton,
                          ...(isDeleting ? styles.deleteButtonDisabled : {})
                        }}
                        onClick={(event) => handleDeleteButtonClick(event, workbook)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </button>
                    )}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>{workbook.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {workbook.description || '10단계 학습 코스로 구성된 워크북입니다.'}
                  </p>
                  <div style={styles.cardMeta}>
                    <span>{workbook.documentTitle || '문서'}</span>
                    <span>지문 {workbook.passageNumber}</span>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    );
  }

  if (isTestMode) {
    return renderTestView();
  }

  if (detailError) {
    return (
      <FriendlyError
        error={{ summary: detailError }}
        onRetry={() => fetchWorkbookDetail(selectedWorkbookId)}
        onHome={handleBackToOverview}
      />
    );
  }

  if (!currentStep) {
    return (
      <div style={styles.emptyState}>
        워크북 정보를 준비하는 중이에요... ⏳
      </div>
    );
  }

  const renderFrontContent = () => {
    if (!currentCard) return null;
    if (currentCard.type === 'word-order') {
      return <WordOrderPuzzle card={currentCard} reveal={showBack} />;
    }
    if (currentCard.type === 'word-order-input') {
      return <WordOrderInputPuzzle card={currentCard} reveal={showBack} />;
    }
    return currentCard.front;
  };

  return (
    <div style={styles.detailContainer}>
      <div style={styles.detailHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" style={styles.secondaryButton} onClick={handleBackToOverview}>
            ← 개요로 돌아가기
          </button>
          <div style={styles.pill}>Workbook · {selectedWorkbook.documentTitle}</div>
        </div>
        <h2
          style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}
          data-testid="workbook-detail-title"
        >
          {selectedWorkbook.coverEmoji || '📘'} {selectedWorkbook.title}
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          {selectedWorkbook.description || '지문의 핵심을 10단계로 정리했어요.'}
        </p>
        <div style={styles.stepSelector}>
          {selectedWorkbook.steps.map((step) => {
            const isActive = Number(step.step) === Number(currentStepNumber);
            return (
              <button
                key={step.step}
                type="button"
                style={{
                  ...styles.stepButton,
                  ...(isActive ? styles.stepButtonActive : {})
                }}
                onClick={() => handleStepChange(step.step)}
              >
                {step.label}
              </button>
            );
          })}
        </div>
        <div style={styles.testSubmitRow}>
          <button type="button" style={styles.primaryButton} onClick={handleStartTest}>
            워크북 TEST 시작하기
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={styles.tag} data-testid="workbook-card-counter">
            카드 {cardIndex + 1}/{currentStep.cards.length}
          </span>
          <button
            type="button"
            style={styles.secondaryButton}
            data-testid="workbook-step-complete"
            onClick={handleToggleCompletion}
          >
            {isStepCompleted ? '✅ Step 완료 표시 해제' : 'Step 완료 체크'}
          </button>
        </div>
      </div>

      <div style={styles.missionBox} data-testid="workbook-mission">
        <div style={{ fontWeight: 700, marginBottom: '6px' }}>🎯 오늘의 미션</div>
        {currentStep.mission}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            ...styles.flashcard,
            ...(shouldLeftAlignCard ? styles.flashcardLeft : styles.flashcardCenter)
          }}
          data-testid="workbook-flashcard"
        >
          <div
            style={currentCard && (currentCard.type === 'word-order' || currentCard.type === 'word-order-input')
              ? styles.flashcardFrontInteractive
              : styles.flashcardFront}
            data-testid="workbook-flashcard-front"
          >
            {renderFrontContent()}
          </div>
          {showBack && currentCard?.back && (
            <div
              style={{
                ...styles.flashcardBack,
                ...(shouldLeftAlignCard ? { textAlign: 'left' } : { textAlign: 'center' })
              }}
              data-testid="workbook-flashcard-back"
            >
              {currentCard.back}
            </div>
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
          <button type="button" style={styles.primaryButton} onClick={handleFlipCard}>
            {showBack ? '앞면 보기' : '뒷면 보기'}
          </button>
          <button
            type="button"
            style={{
              ...styles.secondaryButton,
              ...(cardIndex === currentStep.cards.length - 1 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
            }}
            onClick={handleNextCard}
            disabled={cardIndex === currentStep.cards.length - 1}
          >
            다음 카드
          </button>
        </div>
      </div>

      <div style={styles.checklist}>
        <strong>🔁 Takeaways</strong>
        {currentStep.takeaways.map((item, idx) => (
          <div key={idx} style={styles.checklistItem}>
            <span>☑</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkbookPage;
