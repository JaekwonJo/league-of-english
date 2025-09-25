import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import problemTypes from '../../config/problemTypes.json';
import logger from '../../utils/logger';

const MAX_TOTAL_PROBLEMS = 20;
const PROBLEM_STEP = 5;
const TYPE_KEYS = Object.keys(problemTypes.problemTypes || {});

const sanitizeTypeCounts = (rawTypes = {}) => {
  const normalized = {};
  let total = 0;

  TYPE_KEYS.forEach((key) => {
    const rawValue = Number(rawTypes[key]) || 0;
    const snapped = Math.min(
      MAX_TOTAL_PROBLEMS,
      Math.max(0, Math.floor(rawValue / PROBLEM_STEP) * PROBLEM_STEP)
    );
    normalized[key] = snapped;
    total += snapped;
  });

  if (total > MAX_TOTAL_PROBLEMS) {
    let overflow = total - MAX_TOTAL_PROBLEMS;
    const orderedKeys = [...TYPE_KEYS].reverse();
    for (const key of orderedKeys) {
      while (normalized[key] > 0 && overflow > 0) {
        normalized[key] -= PROBLEM_STEP;
        overflow -= PROBLEM_STEP;
      }
      if (overflow <= 0) break;
    }
  }

  return normalized;
};

const StudyConfig = ({ onStart }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    documentId: null,
    types: sanitizeTypeCounts({}),
    orderDifficulty: 'advanced',
    insertionDifficulty: 'advanced',
  });

  useEffect(() => {
    loadDocuments();
    loadSavedConfig();
  }, []);

  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem('studyConfig');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const normalizedTypes = sanitizeTypeCounts(parsed.types || {});
      setConfig((prev) => ({
        ...prev,
        types: normalizedTypes,
      }));
    } catch (error) {
      logger.warn('Failed to restore study config from storage:', error);
    }
  };

  const saveConfig = (nextTypes) => {
    try {
      localStorage.setItem('studyConfig', JSON.stringify({ types: nextTypes }));
    } catch (error) {
      logger.warn('Failed to persist study config:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const list = await api.documents.list();
      setDocuments(list);
      if (list.length > 0) {
        setConfig((prev) => ({
          ...prev,
          documentId: prev.documentId || list[0].id,
        }));
      }
    } catch (error) {
      logger.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTypes = (updater) => {
    setConfig((prev) => {
      const updatedTypes = typeof updater === 'function' ? updater(prev.types) : updater;
      const sanitized = sanitizeTypeCounts(updatedTypes);
      const nextState = { ...prev, types: sanitized };
      saveConfig(sanitized);
      return nextState;
    });
  };

  const handleDocumentChange = (event) => {
    const value = event.target.value ? Number(event.target.value) : null;
    setConfig((prev) => ({ ...prev, documentId: value }));
  };

  const handleTypeChange = (type, value) => {
    updateTypes((current) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return current;
      const snapped = Math.min(MAX_TOTAL_PROBLEMS, Math.max(0, Math.floor(numeric / PROBLEM_STEP) * PROBLEM_STEP));
      return { ...current, [type]: snapped };
    });
  };

  const changeTypeByStep = (type, delta) => {
    updateTypes((current) => {
      const currentValue = Number(current[type] || 0);
      let nextValue = currentValue + delta;
      nextValue = Math.max(0, nextValue);
      nextValue = Math.min(MAX_TOTAL_PROBLEMS, nextValue);

      const candidate = { ...current, [type]: nextValue };
      const total = Object.values(candidate).reduce((sum, count) => sum + (count || 0), 0);
      if (total > MAX_TOTAL_PROBLEMS) return current;
      return candidate;
    });
  };

  const resetTypes = () => {
    updateTypes(() => sanitizeTypeCounts({}));
  };

  const totalProblems = Object.values(config.types).reduce((sum, count) => sum + (count || 0), 0);

  const handleStart = () => {
    if (!config.documentId) {
      alert('학습에 사용할 자료를 먼저 선택해주세요.');
      return;
    }
    if (totalProblems === 0) {
      alert('적어도 5문제 이상 선택해주세요 (기본 단위 5문제).');
      return;
    }
    if (totalProblems > MAX_TOTAL_PROBLEMS) {
      alert('한 번에 풀 수 있는 최대 문제 수는 20문제입니다.');
      return;
    }

    const payload = {
      documentId: config.documentId,
      types: sanitizeTypeCounts(config.types),
      orderDifficulty: 'advanced',
      insertionDifficulty: 'advanced',
    };

    logger.info('Study config:', payload);
    onStart(payload);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>학습 설정</h1>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>자료 선택</h3>
        <select
          style={styles.select}
          value={config.documentId || ''}
          onChange={handleDocumentChange}
          disabled={loading || documents.length === 0}
        >
          {documents.length === 0 && <option value="">자료가 없습니다</option>}
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title || `자료 ${doc.id}`}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>문항 종류 (선택 {totalProblems} / {MAX_TOTAL_PROBLEMS})</h3>
        <p style={styles.typeHint}>각 문항은 5문제 단위로 조절되며, 한 번에 최대 20문제까지 풀 수 있어요.</p>
        <div style={styles.typeGrid}>
          {Object.entries(problemTypes.problemTypes).map(([type, info]) => {
            const count = config.types[type] || 0;
            return (
              <div key={type} style={styles.typeCard}>
                <div style={styles.typeHeader}>
                  <span style={styles.typeIcon}>{info.icon}</span>
                  <div>
                    <div style={styles.typeName}>{info.name}</div>
                    {info.description && <div style={styles.typeDescription}>{info.description}</div>}
                  </div>
                </div>
                {info.instruction && <div style={styles.instruction}>{info.instruction}</div>}
                <div style={styles.typeControls}>
                  <button
                    type="button"
                    style={styles.controlButton}
                    onClick={() => changeTypeByStep(type, -PROBLEM_STEP)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    style={styles.numberInput}
                    value={count}
                    onChange={(event) => handleTypeChange(type, event.target.value)}
                    min="0"
                    max={MAX_TOTAL_PROBLEMS}
                    step={PROBLEM_STEP}
                  />
                  <button
                    type="button"
                    style={styles.controlButton}
                    onClick={() => changeTypeByStep(type, PROBLEM_STEP)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.resetButton} onClick={resetTypes}>
          초기화
        </button>
        <button
          type="button"
          style={{
            ...styles.startButton,
            ...(totalProblems === 0 || totalProblems > MAX_TOTAL_PROBLEMS || !config.documentId
              ? styles.startButtonDisabled
              : {}),
          }}
          onClick={handleStart}
          disabled={totalProblems === 0 || totalProblems > MAX_TOTAL_PROBLEMS || !config.documentId}
        >
          학습 시작
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '920px',
    margin: '0 auto',
    padding: '32px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    color: '#F8FAFC',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '36px',
  },
  section: {
    background: 'rgba(30, 41, 59, 0.82)',
    borderRadius: '18px',
    padding: '28px',
    marginBottom: '28px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '12px',
  },
  select: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid rgba(148, 163, 184, 0.25)',
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#F8FAFC',
  },
  typeHint: {
    fontSize: '13px',
    color: '#94A3B8',
    marginBottom: '18px',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px',
  },
  typeCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  typeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  typeIcon: {
    fontSize: '26px',
  },
  typeName: {
    fontSize: '17px',
    fontWeight: 700,
  },
  typeDescription: {
    fontSize: '13px',
    color: '#CBD5F5',
    marginTop: '2px',
  },
  instruction: {
    fontSize: '12px',
    color: '#A5B4FC',
    lineHeight: 1.5,
  },
  typeControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  controlButton: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    border: '2px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(30, 41, 59, 0.8)',
    color: '#F8FAFC',
    fontSize: '22px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  numberInput: {
    width: '70px',
    padding: '10px',
    textAlign: 'center',
    borderRadius: '10px',
    border: '2px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#F8FAFC',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '18px',
  },
  resetButton: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(220, 38, 38, 0.35)',
  },
  startButton: {
    padding: '14px 36px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '18px',
    cursor: 'pointer',
    boxShadow: '0 16px 36px rgba(16, 185, 129, 0.45)',
    transition: 'transform 0.2s ease',
  },
  startButtonDisabled: {
    background: 'linear-gradient(135deg, #475569 0%, #1E293B 100%)',
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.6,
  },
};

export default StudyConfig;
