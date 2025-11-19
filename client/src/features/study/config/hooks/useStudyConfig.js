import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../../services/api.service';
import logger from '../../../../utils/logger';
import {
  MAX_TOTAL_PROBLEMS,
  TYPE_KEYS,
} from '../constants';
import {
  sanitizeTypeCounts,
  calculateTotalProblems,
  ensureOrderMode,
} from '../utils';

const STORAGE_KEY = 'studyConfig';
const VALID_STEPS = [1, 2, 3];
const MAX_PASSAGE_SELECTION = Math.min(MAX_TOTAL_PROBLEMS, 5);

const readStepFromLocation = () => {
  if (typeof window === 'undefined') return 1;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get('studyStep'));
    return VALID_STEPS.includes(raw) ? raw : 1;
  } catch (error) {
    return 1;
  }
};

const defaultConfig = {
  documentId: null,
  types: sanitizeTypeCounts({}),
  orderDifficulty: 'advanced',
  insertionDifficulty: 'advanced',
  orderMode: 'random',
};

const useStudyConfig = ({ onStart, initialFocusType }) => {
  const [step, setStep] = useState(() => readStepFromLocation());
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [passages, setPassages] = useState([]);
  const [passagesLoading, setPassagesLoading] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState([]);
  const [previewPassage, setPreviewPassage] = useState(null);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(defaultConfig);
  const [initialFocusApplied, setInitialFocusApplied] = useState(false);

  const popHandlingRef = useRef(false);
  const lastAppliedStepRef = useRef(step);

  const totalProblems = useMemo(
    () => calculateTotalProblems(config.types),
    [config.types],
  );

  const defaultProblemCount = useMemo(
    () => Math.min(
      MAX_TOTAL_PROBLEMS,
      Math.max(1, selectedPassages.length || MAX_TOTAL_PROBLEMS)
    ),
    [selectedPassages.length],
  );

  const selectedType = useMemo(
    () => TYPE_KEYS.find((key) => Number(config.types?.[key] || 0) > 0) || null,
    [config.types],
  );

  const safeStep = useMemo(() => {
    if (step === 2 && !config.documentId) return 1; // 유형 단계는 자료 선택 이후
    if (step === 3 && !config.documentId) return 1; // 지문 선택도 자료 필요
    return step;
  }, [step, config.documentId]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePopState = (event) => {
      popHandlingRef.current = true;
      const stateStep = Number(event.state?.studyStep);
      if (VALID_STEPS.includes(stateStep)) {
        setStep(stateStep);
        return;
      }
      setStep(readStepFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const activeStep = safeStep;
    const params = new URLSearchParams(window.location.search);

    if (activeStep <= 1) {
      params.delete('studyStep');
    } else {
      params.set('studyStep', String(activeStep));
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    const nextState = { ...(window.history.state || {}), studyStep: activeStep };
    const alignedWithRequest = step === activeStep;

    if (popHandlingRef.current) {
      window.history.replaceState(nextState, '', nextUrl);
      popHandlingRef.current = false;
      lastAppliedStepRef.current = activeStep;
      return;
    }

    if (lastAppliedStepRef.current !== activeStep) {
      if (alignedWithRequest) {
        window.history.pushState(nextState, '', nextUrl);
      } else {
        window.history.replaceState(nextState, '', nextUrl);
      }
      lastAppliedStepRef.current = activeStep;
      return;
    }

    window.history.replaceState(nextState, '', nextUrl);
    lastAppliedStepRef.current = activeStep;
  }, [safeStep, step]);

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
        acc[key] = key === initialFocusType ? defaultProblemCount : 0;
        return acc;
      }, {});
      return preset;
    });
    setInitialFocusApplied(true);
  }, [defaultProblemCount, initialFocusType, initialFocusApplied, updateTypes]);

  useEffect(() => {
    if (step === 3) {
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
      if (prev.length >= MAX_PASSAGE_SELECTION) {
        window.alert(`한 번에 선택할 수 있는 지문은 최대 ${MAX_PASSAGE_SELECTION}개예요.`);
        return prev;
      }
      return [...prev, passageNumber];
    });
  }, []);

  const selectAllPassages = useCallback(() => {
    if (!Array.isArray(passages) || passages.length === 0) return;
    setSelectedPassages(passages
      .slice(0, MAX_PASSAGE_SELECTION)
      .map((item) => item.passageNumber));
  }, [passages]);

  const clearPassages = useCallback(() => {
    setSelectedPassages([]);
  }, []);

  const randomPassages = useCallback(() => {
    if (!Array.isArray(passages) || passages.length === 0) {
      setSelectedPassages([]);
      return;
    }
    const maxSelectable = Math.min(passages.length, MAX_PASSAGE_SELECTION);
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

  const selectSingleType = useCallback((type) => {
    updateTypes(() => TYPE_KEYS.reduce((acc, key) => {
      acc[key] = key === type ? defaultProblemCount : 0;
      return acc;
    }, {}));
  }, [defaultProblemCount, updateTypes]);


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

  const handleStart = useCallback((overrideConfig) => {
    // 🎓 Special Handling for Exam Type
    if (overrideConfig && overrideConfig.type === 'exam') {
      const count = Number(overrideConfig.count) || 20;
      logger.info('Starting Exam Mode:', { documentId: config.documentId, count });
      
      onStart({
        documentId: config.documentId,
        types: { exam: count },
        passageNumbers: [], // Not needed for exam mode
        orderMode: config.orderMode, // Pass user preference
        totalCount: count
      });
      return;
    }

    const activeTypes = Object.entries(config.types || {})
      .filter(([, value]) => Number(value || 0) > 0)
      .map(([key]) => key);

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
      window.alert('출제할 문제 유형을 선택해주세요.');
      return;
    }
    if (totalProblems > MAX_TOTAL_PROBLEMS) {
      window.alert(`한 번에 풀 수 있는 최대 문제 수는 ${MAX_TOTAL_PROBLEMS}문제입니다.`);
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

  useEffect(() => {
    updateTypes((current) => {
      const active = TYPE_KEYS.find((key) => Number(current[key] || 0) > 0);
      if (!active) return current;
      const desired = defaultProblemCount;
      if (Number(current[active] || 0) === desired) return current;
      return TYPE_KEYS.reduce((acc, key) => {
        acc[key] = key === active ? desired : 0;
        return acc;
      }, {});
    });
  }, [defaultProblemCount, updateTypes]);

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
    selectedType,
    defaultProblemCount,
    selectSingleType,
    resetTypes,
    changeOrderMode,
    prepareTypeStep,
    handleStart,
    renderPassageMeta,
  };
};

export default useStudyConfig;
