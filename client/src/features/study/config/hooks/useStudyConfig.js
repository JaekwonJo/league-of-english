import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../../services/api.service';
import logger from '../../../../utils/logger';
import {
  MAX_TOTAL_PROBLEMS,
  PROBLEM_STEP,
  PROBLEM_TYPES,
  TYPE_KEYS,
} from '../constants';
import {
  sanitizeTypeCounts,
  calculateTotalProblems,
  ensureOrderMode,
} from '../utils';

const STORAGE_KEY = 'studyConfig';

const defaultConfig = {
  documentId: null,
  types: sanitizeTypeCounts({}),
  orderDifficulty: 'advanced',
  insertionDifficulty: 'advanced',
  orderMode: 'random',
};

const useStudyConfig = ({ onStart, initialFocusType }) => {
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [passages, setPassages] = useState([]);
  const [passagesLoading, setPassagesLoading] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState([]);
  const [previewPassage, setPreviewPassage] = useState(null);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(defaultConfig);
  const [initialFocusApplied, setInitialFocusApplied] = useState(false);

  const selectedCount = selectedPassages.length;

  const totalProblems = useMemo(
    () => calculateTotalProblems(config.types),
    [config.types],
  );

  const safeStep = useMemo(() => {
    if (step === 2 && !config.documentId) return 1;
    if (step === 3 && (!config.documentId || !selectedPassages.length)) {
      return config.documentId ? 2 : 1;
    }
    return step;
  }, [step, config.documentId, selectedPassages.length]);

  const persistConfig = useCallback((nextState) => {
    try {
      const payload = {
        types: nextState.types,
        orderMode: nextState.orderMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (storageError) {
      logger.warn('Failed to persist study config:', storageError);
    }
  }, []);

  const updateTypes = useCallback((updater) => {
    setConfig((prev) => {
      const updated =
        typeof updater === 'function' ? updater(prev.types) : updater || {};
      const sanitized = sanitizeTypeCounts(updated);
      const next = { ...prev, types: sanitized };
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  const resetTypes = useCallback(() => {
    updateTypes({});
  }, [updateTypes]);

  const loadSavedConfig = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const normalizedTypes = sanitizeTypeCounts(parsed.types || {});
      const savedOrderMode = ensureOrderMode(parsed.orderMode);
      setConfig((prev) => ({
        ...prev,
        types: normalizedTypes,
        orderMode: savedOrderMode,
      }));
    } catch (storageError) {
      logger.warn('Failed to restore study config from storage:', storageError);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true);
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
        setError('문제 학습용 지문이 아직 없어요. 관리자 페이지에서 PDF를 업로드해 주세요.');
      }
    } catch (fetchError) {
      logger.error('Failed to load documents:', fetchError);
      setError(fetchError?.message || '문서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const loadPassages = useCallback(async (documentId) => {
    if (!documentId) return;
    try {
      setPassagesLoading(true);
      setError(null);
      const response = await api.analysis.listPassageSummaries(documentId);
      const items = response?.data || [];
      setPassages(items);
      setSelectedPassages((prev) => {
        const validNumbers = new Set(items.map((item) => item.passageNumber));
        return prev.filter((number) => validNumbers.has(number));
      });
    } catch (fetchError) {
      logger.error('Failed to load passages for study:', fetchError);
      setError(fetchError?.message || '지문 목록을 불러오는 중 문제가 발생했습니다.');
      setPassages([]);
      setSelectedPassages([]);
    } finally {
      setPassagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadSavedConfig();
  }, [loadDocuments, loadSavedConfig]);

  useEffect(() => {
    if (!config.documentId) {
      setPassages([]);
      setSelectedPassages([]);
      return;
    }
    loadPassages(config.documentId);
  }, [config.documentId, loadPassages]);

  useEffect(() => {
    if (!initialFocusType || initialFocusApplied) return;
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
    setInitialFocusApplied(true);
  }, [initialFocusType, initialFocusApplied, updateTypes]);

  useEffect(() => {
    if (step === 2) {
      setSelectedPassages([]);
    }
  }, [step]);

  const selectDocument = useCallback((documentId) => {
    setSelectedPassages([]);
    setPassages([]);
    setError(null);
    setConfig((prev) => ({ ...prev, documentId }));
    setStep(documentId ? 2 : 1);
  }, []);

  const goToStep = useCallback((nextStep) => {
    setStep(nextStep);
  }, []);

  const togglePassageSelection = useCallback((passageNumber) => {
    if (!Number.isInteger(passageNumber)) return;
    setSelectedPassages((prev) => {
      if (prev.includes(passageNumber)) {
        return prev.filter((value) => value !== passageNumber);
      }
      return [...prev, passageNumber];
    });
  }, []);

  const selectAllPassages = useCallback(() => {
    if (!Array.isArray(passages) || passages.length === 0) return;
    setSelectedPassages(passages.map((item) => item.passageNumber));
  }, [passages]);

  const clearPassages = useCallback(() => {
    setSelectedPassages([]);
  }, []);

  const randomPassages = useCallback(() => {
    if (!Array.isArray(passages) || passages.length === 0) {
      setSelectedPassages([]);
      return;
    }
    const maxSelectable = passages.length;
    const count = Math.max(1, Math.floor(Math.random() * maxSelectable) + 1);
    const shuffled = [...passages].sort(() => Math.random() - 0.5);
    const randomSubset = shuffled
      .slice(0, count)
      .map((item) => item.passageNumber);
    setSelectedPassages(randomSubset);
  }, [passages]);

  const openPreview = useCallback((passage) => {
    if (!passage) return;
    setPreviewPassage({
      ...passage,
      text: passage.text || passage.fullText || passage.excerpt || '',
    });
  }, []);

  const closePreview = useCallback(() => setPreviewPassage(null), []);

  const handleTypeChange = useCallback((type, value) => {
    updateTypes((current) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return current;
      const snapped = Math.min(
        MAX_TOTAL_PROBLEMS,
        Math.max(0, Math.floor(numeric / PROBLEM_STEP) * PROBLEM_STEP),
      );
      return { ...current, [type]: snapped };
    });
  }, [updateTypes]);

  const changeTypeByStep = useCallback((type, delta) => {
    updateTypes((current) => {
      const currentValue = Number(current[type] || 0);
      let nextValue = currentValue + delta;
      nextValue = Math.max(0, nextValue);
      nextValue = Math.min(MAX_TOTAL_PROBLEMS, nextValue);

      const candidate = { ...current, [type]: nextValue };
      const candidateTotal = calculateTotalProblems(candidate);
      if (candidateTotal > MAX_TOTAL_PROBLEMS) return current;
      return candidate;
    });
  }, [updateTypes]);

  const randomizeTypes = useCallback(() => {
    if (!TYPE_KEYS.length) return;

    const zeroed = TYPE_KEYS.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    const baseTarget = totalProblems || selectedCount || 5;
    const desiredTotal = Math.min(
      MAX_TOTAL_PROBLEMS,
      Math.max(PROBLEM_STEP, baseTarget)
    );

    const shuffledTypes = [...TYPE_KEYS].sort(() => Math.random() - 0.5);
    const allocation = { ...zeroed };
    let remaining = desiredTotal;
    let index = 0;

    while (remaining > 0) {
      const key = shuffledTypes[index % shuffledTypes.length];
      allocation[key] += PROBLEM_STEP;
      remaining -= PROBLEM_STEP;
      index += 1;
    }

    updateTypes(allocation);
  }, [selectedCount, totalProblems, updateTypes]);

  const changeOrderMode = useCallback((mode) => {
    const normalized = ensureOrderMode(mode);
    setConfig((prev) => {
      if (prev.orderMode === normalized) return prev;
      const next = { ...prev, orderMode: normalized };
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  const prepareTypeStep = useCallback(() => {
    resetTypes();
    setStep(3);
  }, [resetTypes]);

  const handleStart = useCallback(() => {
    if (!config.documentId) {
      window.alert('학습에 사용할 자료를 먼저 선택해주세요.');
      return;
    }
    if (!selectedPassages.length) {
      window.alert('문제를 만들 지문을 하나 이상 선택해주세요.');
      return;
    }
    if (totalProblems === 0) {
      window.alert('적어도 1문제 이상 선택해주세요.');
      return;
    }
    if (!activeTypes.length) {
      window.alert('출제할 문제 유형과 개수를 골라주세요.');
      return;
    }
    if (totalProblems > MAX_TOTAL_PROBLEMS) {
      window.alert('한 번에 풀 수 있는 최대 문제 수는 20문제입니다.');
      return;
    }

    const payload = {
      documentId: config.documentId,
      types: sanitizeTypeCounts(config.types),
      orderDifficulty: 'advanced',
      insertionDifficulty: 'advanced',
      passageNumbers: Array.from(new Set(selectedPassages)),
      orderMode: ensureOrderMode(config.orderMode),
    };

    logger.info('Study config:', payload);
    onStart(payload);
  }, [config, onStart, selectedPassages, totalProblems]);

  const renderPassageMeta = useCallback((passage) => {
    if (!passage) return null;
    const { wordCount, charCount } = passage;
    if (wordCount || charCount) {
      const parts = [];
      if (wordCount) parts.push(`${wordCount} words`);
      if (charCount) parts.push(`${charCount} chars`);
      return parts.join(' • ');
    }
    return null;
  }, []);

  return {
    step,
    safeStep,
    documents,
    documentsLoading,
    passages,
    passagesLoading,
    selectedPassages,
    previewPassage,
    error,
    config,
    totalProblems,
    goToStep,
    selectDocument,
    togglePassageSelection,
    selectAllPassages,
    clearPassages,
    randomPassages,
    openPreview,
    closePreview,
    handleTypeChange,
    changeTypeByStep,
    randomizeTypes,
    resetTypes,
    changeOrderMode,
    prepareTypeStep,
    handleStart,
    renderPassageMeta,
  };
};

export default useStudyConfig;
