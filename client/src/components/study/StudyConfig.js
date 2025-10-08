import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import problemTypes from '../../config/problemTypes.json';
import logger from '../../utils/logger';
import PassagePickerGrid from '../shared/PassagePickerGrid';
import PassagePreviewModal from '../shared/PassagePreviewModal';

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

const StudyConfig = ({ onStart, headerSlot = null, initialFocusType = null }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [passages, setPassages] = useState([]);
  const [passageLoading, setPassageLoading] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState([]);
  const [previewPassage, setPreviewPassage] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    documentId: null,
    types: sanitizeTypeCounts({}),
    orderDifficulty: 'advanced',
    insertionDifficulty: 'advanced',
    orderMode: 'random',
  });

  useEffect(() => {
    loadDocuments();
    loadSavedConfig();
  }, []);

  useEffect(() => {
    if (!config.documentId) {
      setPassages([]);
      setSelectedPassages([]);
      return;
    }
    loadPassageOptions(config.documentId);
  }, [config.documentId]);

  const loadPassageOptions = async (documentId) => {
    try {
      setPassageLoading(true);
      setError(null);
      const response = await api.analysis.listPassageSummaries(documentId);
      const items = response?.data || [];
      setPassages(items);
      setSelectedPassages((prev) => {
        const validNumbers = new Set(items.map((item) => item.passageNumber));
        return prev.filter((number) => validNumbers.has(number));
      });
    } catch (err) {
      logger.error('Failed to load passages for study:', err);
      setError(err?.message || '지문 목록을 불러오는 중 문제가 발생했습니다.');
      setPassages([]);
      setSelectedPassages([]);
    } finally {
      setPassageLoading(false);
    }
  };

  const togglePassageSelection = (passageNumber) => {
    if (!Number.isInteger(passageNumber)) return;
    setSelectedPassages((prev) => {
      if (prev.includes(passageNumber)) {
        return prev.filter((value) => value !== passageNumber);
      }
      return [...prev, passageNumber];
    });
  };

  const handleSelectAllPassages = () => {
    if (!Array.isArray(passages) || passages.length === 0) return;
    setSelectedPassages(passages.map((item) => item.passageNumber));
  };

  const handleClearPassages = () => {
    setSelectedPassages([]);
  };

  const openPreview = (passage) => {
    if (!passage) return;
    setPreviewPassage({
      ...passage,
      text: passage.text || passage.fullText || passage.excerpt || ''
    });
  };

  const closePreview = () => setPreviewPassage(null);

  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem('studyConfig');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const normalizedTypes = sanitizeTypeCounts(parsed.types || {});
      const savedOrderMode = parsed.orderMode === 'sequential' ? 'sequential' : 'random';
      setConfig((prev) => ({
        ...prev,
        types: normalizedTypes,
        orderMode: savedOrderMode,
      }));
    } catch (error) {
      logger.warn('Failed to restore study config from storage:', error);
    }
  };

  const saveConfig = (nextState) => {
    try {
      localStorage.setItem('studyConfig', JSON.stringify({
        types: nextState.types,
        orderMode: nextState.orderMode,
      }));
    } catch (error) {
      logger.warn('Failed to persist study config:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.documents.list();
      const worksheetDocs = Array.isArray(list)
        ? list.filter((doc) => String(doc.type || '').toLowerCase() !== 'vocabulary')
        : [];
      setDocuments(worksheetDocs);
      setConfig((prev) => ({
        ...prev,
        documentId:
          prev.documentId && worksheetDocs.some((doc) => doc.id === prev.documentId)
            ? prev.documentId
            : null,
      }));
      if (!worksheetDocs.length) {
        setStep(1);
      }
      if (worksheetDocs.length === 0) {
        setError('문제 학습용 지문이 아직 없어요. 관리자 페이지에서 PDF를 업로드해 주세요.');
      }
    } catch (error) {
      logger.error('Failed to load documents:', error);
      setError(error?.message || '문서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateTypes = (updater) => {
    setConfig((prev) => {
      const updatedTypes = typeof updater === 'function' ? updater(prev.types) : updater;
      const sanitized = sanitizeTypeCounts(updatedTypes);
      const nextState = { ...prev, types: sanitized };
      saveConfig(nextState);
      return nextState;
    });
  };

  useEffect(() => {
    if (!initialFocusType) return;
    if (!TYPE_KEYS.includes(initialFocusType)) return;
    updateTypes((current) => {
      const hasSelection = Object.values(current).some((value) => Number(value) > 0);
      if (hasSelection) return current;
      const preset = TYPE_KEYS.reduce((acc, key) => {
        acc[key] = key === initialFocusType ? PROBLEM_STEP : 0;
        return acc;
      }, {});
      return preset;
    });
  }, [initialFocusType]);

  const handleDocumentChange = (event) => {
    const value = event.target.value ? Number(event.target.value) : null;
    setSelectedPassages([]);
    setPassages([]);
    setError(null);
    setConfig((prev) => ({ ...prev, documentId: value }));
    setStep(value ? 2 : 1);
  };

  const handleTypeChange = (type, value) => {
    updateTypes((current) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return current;
      const snapped = Math.min(MAX_TOTAL_PROBLEMS, Math.max(0, Math.floor(numeric / PROBLEM_STEP) * PROBLEM_STEP));
      return { ...current, [type]: snapped };
    });
  };

  const handleOrderModeChange = (event) => {
    const value = event?.target?.value === 'sequential' ? 'sequential' : 'random';
    setConfig((prev) => {
      if (prev.orderMode === value) return prev;
      const nextState = { ...prev, orderMode: value };
      saveConfig(nextState);
      return nextState;
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
    if (!selectedPassages.length) {
      alert('문제를 만들 지문을 하나 이상 선택해주세요.');
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
      passageNumbers: Array.from(new Set(selectedPassages)),
      orderMode: config.orderMode === 'sequential' ? 'sequential' : 'random',
    };

    logger.info('Study config:', payload);
    onStart(payload);
  };

  const renderPassageMetaForStudy = (passage) => {
    if (!passage) return null;
    const { wordCount, charCount } = passage;
    if (wordCount || charCount) {
      const parts = [];
      if (wordCount) parts.push(`${wordCount} words`);
      if (charCount) parts.push(`${charCount} chars`);
      return parts.join(' • ');
    }
    return null;
  };

  const renderStepOne = () => (
    <div style={styles.section}>
      <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>1단계 · 자료 선택</h3>
      <p style={styles.sectionHint}>문제 학습에 사용할 PDF를 고르면 다음 단계에서 지문을 고를 수 있어요.</p>
      <select
        style={styles.select}
        value={config.documentId || ''}
        onChange={handleDocumentChange}
        disabled={loading || documents.length === 0}
      >
        <option value="" disabled>
          {documents.length === 0 ? '자료가 없습니다' : '자료를 선택해 주세요'}
        </option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title || `자료 ${doc.id}`}
          </option>
        ))}
      </select>
      <div style={styles.stepActions}>
        <button
          type="button"
          style={{
            ...styles.primaryButton,
            ...(config.documentId ? {} : styles.startButtonDisabled),
          }}
          onClick={() => setStep(2)}
          disabled={!config.documentId}
        >
          다음 단계로 →
        </button>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div style={styles.section}>
      <div style={styles.sectionTitleRow}>
        <h3 style={styles.sectionTitle}>2단계 · 지문 선택</h3>
        <span style={styles.selectionCount}>{selectedPassages.length}개 선택</span>
      </div>
      <p style={styles.sectionHint}>
        문제에 사용할 지문을 골라주세요. 카드 왼쪽 상단의 체크 박스를 눌러 선택하고, 전체 보기를 누르면 원문을 확인할 수 있어요.
      </p>
      {passageLoading ? (
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <p>지문을 불러오는 중이에요...</p>
        </div>
      ) : passages.length ? (
        <>
          <div style={styles.bulkActions}>
            <button
              type="button"
              style={styles.bulkButton}
              onClick={handleSelectAllPassages}
            >
              전체 선택
            </button>
            <button
              type="button"
              style={{
                ...styles.bulkButton,
                background: 'var(--surface-soft)',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'none'
              }}
              onClick={handleClearPassages}
            >
              선택 해제
            </button>
          </div>
          <PassagePickerGrid
            passages={passages}
            selected={selectedPassages}
            onToggle={togglePassageSelection}
            onPreview={openPreview}
            selectionLabel="학습에 포함할 지문을 골라주세요"
            renderMeta={renderPassageMetaForStudy}
            emptyMessage="표시할 지문이 아직 없어요."
          />
        </>
      ) : (
        <div style={styles.loadingCard}>선택한 자료에서 지문을 찾지 못했어요.</div>
      )}
      <div style={styles.stepActionsSplit}>
        <button type="button" style={styles.secondaryButton} onClick={() => setStep(1)}>
          ← 이전 단계
        </button>
        <button
          type="button"
          style={{
            ...styles.primaryButton,
            ...(selectedPassages.length ? {} : styles.startButtonDisabled),
          }}
          onClick={() => setStep(3)}
          disabled={!selectedPassages.length}
        >
          유형 고르러 가기 →
        </button>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <h3 style={styles.sectionTitle}>3단계 · 문항 종류</h3>
          <div style={styles.countBadge}>
            <span style={styles.countLabel}>선택</span>
            <span style={styles.countNumber}>{totalProblems}</span>
            <span style={styles.countDivider}>/</span>
            <span style={styles.countMax}>{MAX_TOTAL_PROBLEMS}</span>
          </div>
        </div>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>문항 순서</h3>
        <p style={styles.sectionHint}>랜덤을 선택하면 지문 순서와 상관없이 섞어서 출제돼요. 순서를 고정하면 업로드한 지문 순서대로 차근차근 풀 수 있어요.</p>
        <div style={styles.orderModeGroup}>
          <label style={styles.orderModeOption}>
            <input
              type="radio"
              name="orderMode"
              value="random"
              checked={config.orderMode !== 'sequential'}
              onChange={handleOrderModeChange}
              style={{ marginTop: '4px' }}
            />
            <div>
              <div style={styles.orderModeLabel}>랜덤으로 풀기</div>
              <div style={styles.orderModeDescription}>선택한 지문과 유형을 한데 섞어서, 매번 색다른 문제 구성을 받아요.</div>
            </div>
          </label>
          <label style={styles.orderModeOption}>
            <input
              type="radio"
              name="orderMode"
              value="sequential"
              checked={config.orderMode === 'sequential'}
              onChange={handleOrderModeChange}
              style={{ marginTop: '4px' }}
            />
            <div>
              <div style={styles.orderModeLabel}>순서대로 풀기</div>
              <div style={styles.orderModeDescription}>업로드된 지문 순서대로 문제를 정렬해 안정적으로 학습할 수 있어요.</div>
            </div>
          </label>
        </div>
      </div>

      <div style={styles.stepActionsSplit}>
        <button type="button" style={styles.secondaryButton} onClick={() => setStep(2)}>
          ← 지문 다시 고르기
        </button>
        <div style={styles.actionsRight}>
          <button type="button" style={styles.resetButton} onClick={resetTypes}>
            초기화
          </button>
          <button
            type="button"
            style={{
              ...styles.startButton,
              ...(totalProblems === 0 || totalProblems > MAX_TOTAL_PROBLEMS || !config.documentId
                || !selectedPassages.length
                ? styles.startButtonDisabled
                : {}),
            }}
            onClick={handleStart}
            disabled={totalProblems === 0 || totalProblems > MAX_TOTAL_PROBLEMS || !config.documentId || !selectedPassages.length}
          >
            학습 시작
          </button>
        </div>
      </div>
    </>
  );

  const renderContentByStep = () => {
    const safeStep = (() => {
      if (step === 2 && !config.documentId) return 1;
      if (step === 3 && (!config.documentId || !selectedPassages.length)) {
        return config.documentId ? 2 : 1;
      }
      return step;
    })();
    switch (safeStep) {
      case 1:
        return renderStepOne();
      case 2:
        return renderStepTwo();
      case 3:
        return renderStepThree();
      default:
        return renderStepOne();
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>학습 설정</h1>

      {headerSlot && <div style={styles.headerSlot}>{headerSlot}</div>}

      {error && (
        <div style={styles.errorBox}>
          ❗️ {error}
        </div>
      )}

      {renderContentByStep()}

      <PassagePreviewModal
        open={Boolean(previewPassage)}
        passage={previewPassage}
        onClose={closePreview}
        documentTitle={documents.find((doc) => doc.id === config.documentId)?.title}
      />
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '920px',
    margin: '0 auto',
    padding: '32px',
    minHeight: '100vh',
    background: 'var(--app-background)',
    color: 'var(--text-primary)',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '36px',
  },
  headerSlot: {
    marginBottom: '24px'
  },
  section: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '28px',
    marginBottom: '28px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
    border: '1px solid var(--surface-border)',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  sectionHint: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '18px'
  },
  bulkActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '14px',
    flexWrap: 'wrap'
  },
  bulkButton: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--color-blue-500)',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)'
  },
  selectionCount: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    background: 'var(--surface-soft)',
    padding: '4px 12px',
    borderRadius: '999px'
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(129, 140, 248, 0.35) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    boxShadow: '0 10px 24px rgba(59, 130, 246, 0.25)',
    color: 'var(--border-subtle)',
    minWidth: '160px',
    justifyContent: 'center',
  },
  countLabel: {
    fontSize: '12px',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    color: 'var(--color-slate-300)',
  },
  countNumber: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--surface-soft-solid)',
    textShadow: '0 0 12px rgba(96, 165, 250, 0.55)',
  },
  countDivider: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-slate-300)',
    opacity: 0.9,
  },
  countMax: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--border-subtle)',
  },
  errorBox: {
    background: 'var(--danger-surface)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-strong)',
    padding: '14px 18px',
    borderRadius: '14px',
    marginBottom: '20px'
  },
  select: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
  },
  typeHint: {
    fontSize: '13px',
    color: 'var(--color-slate-400)',
    marginBottom: '18px',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px',
  },
  typeCard: {
    background: 'var(--surface-soft)',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid var(--surface-border)',
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
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  instruction: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  typeControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  orderModeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderModeOption: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    padding: '16px 18px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  orderModeLabel: {
    fontWeight: 700,
    fontSize: '15px',
    marginBottom: '4px'
  },
  orderModeDescription: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5
  },
  controlButton: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    border: '2px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontSize: '22px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  numberInput: {
    width: '70px',
    padding: '10px',
    textAlign: 'center',
    borderRadius: '10px',
    border: '2px solid var(--surface-border)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  loadingCard: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '28px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    border: '1px solid var(--surface-border)'
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '4px solid rgba(148, 163, 184, 0.25)',
    borderTopColor: 'rgba(129, 140, 248, 0.9)',
    margin: '0 auto 12px',
    animation: 'spin 1s linear infinite'
  },
  stepActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px'
  },
  stepActionsSplit: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap'
  },
  actionsRight: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '18px',
  },
  primaryButton: {
    padding: '12px 28px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--indigo) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 28px rgba(59, 130, 246, 0.35)'
  },
  secondaryButton: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
    border: '1px solid var(--surface-border)'
  },
  resetButton: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--danger-strong) 0%, var(--danger-stronger) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(220, 38, 38, 0.35)',
  },
  startButton: {
    padding: '14px 36px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--success) 0%, var(--success-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    fontSize: '18px',
    cursor: 'pointer',
    boxShadow: '0 16px 36px rgba(16, 185, 129, 0.45)',
    transition: 'transform 0.2s ease',
  },
  startButtonDisabled: {
    background: 'linear-gradient(135deg, var(--color-slate-600) 0%, var(--color-slate-650) 100%)',
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.6,
  },
};

export default StudyConfig;
