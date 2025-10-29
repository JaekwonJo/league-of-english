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
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-muted)'
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

const WorkbookPage = () => {
  const { user } = useAuth();

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
  const [passages, setPassages] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedPassage, setSelectedPassage] = useState('1');
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState('');

  const selectedWorkbook = selectedWorkbookId ? workbookCache[selectedWorkbookId] : null;
  const totalSteps = selectedWorkbook?.steps?.length || 0;
  const currentStep = useMemo(() => {
    if (!selectedWorkbook || totalSteps === 0) return null;
    return selectedWorkbook.steps.find((step) => Number(step.step) === Number(currentStepNumber))
      || selectedWorkbook.steps[0];
  }, [selectedWorkbook, currentStepNumber, totalSteps]);

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
      const cacheUpdates = {};
      items.forEach((item) => {
        cacheUpdates[item.id] = workbookCache[item.id] || null;
      });
      setWorkbookCache((prev) => ({ ...cacheUpdates, ...prev }));
    } catch (error) {
      setListError(error.message || '워크북 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingList(false);
    }
  }, [workbookCache]);

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

  const handleOpenGenerator = useCallback(async () => {
    setGeneratorError('');
    setShowGenerator(true);
    if (documents.length === 0) {
      try {
        const response = await api.documents.list();
        const docs = Array.isArray(response) ? response : response?.data || [];
        setDocuments(docs);
      } catch (error) {
        setGeneratorError(error.message || '문서 목록을 불러오지 못했습니다.');
      }
    }
  }, [documents.length]);

  const handleSelectDocument = useCallback(async (value) => {
    setSelectedDocumentId(value);
    setSelectedPassage('1');
    setPassages([]);
    if (!value) return;
    try {
      const response = await api.analysis.listPassageSummaries(value);
      const list = Array.isArray(response?.data) ? response.data : [];
      setPassages(list);
      if (list.length > 0) {
        setSelectedPassage(String(list[0].passageNumber || 1));
      }
    } catch (error) {
      setGeneratorError(error.message || '지문 목록을 불러오지 못했습니다.');
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
          {isTeacherOrAdmin(user?.role) && (
            <button type="button" style={{ ...styles.primaryButton, marginTop: '16px' }} onClick={handleOpenGenerator}>
              + 새 워크북 생성하기
            </button>
          )}
        </section>

        {showGenerator && isTeacherOrAdmin(user?.role) && (
          <section style={styles.generatorCard}>
            <h3 style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>워크북 생성기</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              원문 문서를 선택하고, 워크북으로 만들 지문 번호를 고르면 리그오브잉글리시 스타일의 10단계 학습 코스가 자동으로 만들어져요.
            </p>
            {generatorError && (
              <div style={{ color: 'var(--danger-strong)', fontSize: '14px' }}>{generatorError}</div>
            )}
            <div style={styles.formRow}>
              <select
                style={styles.select}
                value={selectedDocumentId}
                onChange={(e) => handleSelectDocument(e.target.value)}
              >
                <option value="">문서를 선택하세요</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} (id: {doc.id})
                  </option>
                ))}
              </select>
              <select
                style={styles.select}
                value={selectedPassage}
                onChange={(e) => setSelectedPassage(e.target.value)}
                disabled={!passages.length}
              >
                {passages.length === 0 && <option value="1">지문을 먼저 선택하세요</option>}
                {passages.map((item) => (
                  <option key={item.passageNumber} value={item.passageNumber}>
                    지문 {item.passageNumber} · {item.excerpt}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.formRow}>
              <button
                type="button"
                style={{ ...styles.primaryButton, opacity: generatorLoading ? 0.7 : 1 }}
                onClick={handleGenerateWorkbook}
                disabled={generatorLoading}
              >
                {generatorLoading ? '생성 중...' : '워크북 생성하기'}
              </button>
              <button type="button" style={styles.secondaryButton} onClick={() => setShowGenerator(false)}>
                닫기
              </button>
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
              return (
                <button
                  key={workbook.id}
                  style={styles.cardButton}
                  onClick={() => handleOpenWorkbook(workbook.id, 1)}
                >
                  <div style={styles.cardMeta}>
                    <span>{workbook.coverEmoji || '📘'}</span>
                    <span>{percent}% 완료</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>{workbook.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {workbook.description || '10단계 학습 코스로 구성된 워크북입니다.'}
                  </p>
                  <div style={styles.cardMeta}>
                    <span>{workbook.documentTitle || '문서'}</span>
                    <span>지문 {workbook.passageNumber}</span>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>
    );
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

  const currentCard = currentStep.cards[cardIndex] || currentStep.cards[0];

  return (
    <div style={styles.detailContainer}>
      <div style={styles.detailHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" style={styles.secondaryButton} onClick={handleBackToOverview}>
            ← 개요로 돌아가기
          </button>
          <div style={styles.pill}>Workbook · {selectedWorkbook.documentTitle}</div>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={styles.tag}>
            카드 {cardIndex + 1}/{currentStep.cards.length}
          </span>
          <button type="button" style={styles.secondaryButton} onClick={handleToggleCompletion}>
            {isStepCompleted ? '✅ Step 완료 표시 해제' : 'Step 완료 체크'}
          </button>
        </div>
      </div>

      <div style={styles.missionBox}>
        <div style={{ fontWeight: 700, marginBottom: '6px' }}>🎯 오늘의 미션</div>
        {currentStep.mission}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={styles.flashcard}>
          <div style={styles.flashcardFront}>{currentCard?.front}</div>
          {showBack && currentCard?.back && (
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
