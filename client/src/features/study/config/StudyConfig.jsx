import React, { useMemo, useState } from 'react';
import PassagePreviewModal from '../../../components/shared/PassagePreviewModal';
import styles from './configStyles';
import useStudyConfig from './hooks/useStudyConfig';
import { MAX_TOTAL_PROBLEMS } from './constants';
import DocumentStep from './components/DocumentStep';
import PassageStep from './components/PassageStep';
import ProblemTypeStep from './components/ProblemTypeStep';
import ProblemPreviewModal from '../components/ProblemPreviewModal';
import { sampleProblems } from '../sampleProblems';

const StudyConfig = ({
  onStart,
  headerSlot = null,
  initialFocusType = null,
  savedSession = null,
  onResumeSavedSession = null,
  onDiscardSavedSession = null
}) => {
  const {
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
  } = useStudyConfig({ onStart, initialFocusType });

  const [previewProblem, setPreviewProblem] = useState(null);

  const resumeAvailable = useMemo(() => (
    savedSession && Array.isArray(savedSession.problems) && savedSession.problems.length > 0
  ), [savedSession]);

  const quickGuideItems = useMemo(() => ([
    {
      icon: '📝',
      label: '1단계 · 자료 선택',
      description: '연습하고 싶은 모의고사나 교재를 눌러요. 선택하면 지문 고르는 화면이 자동으로 열려요!'
    },
    {
      icon: '📌',
      label: '2단계 · 지문 선택',
      description: '필요한 지문을 체크한 뒤 맨 아래 파란 버튼을 눌러요. 전체 선택·랜덤 선택 버튼도 있어요.'
    },
    {
      icon: '🚀',
      label: '3단계 · 유형/문항 설정',
      description: '어휘·어법 등 원하는 유형 수를 정하고 “학습 시작”을 누르면 바로 문제 풀이가 열려요.'
    }
  ]), []);

  const formatDuration = (seconds = 0) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
  };

  const savedTimeLabel = useMemo(() => (
    resumeAvailable ? formatDuration(savedSession?.timeLeft) : ''
  ), [resumeAvailable, savedSession?.timeLeft]);

  const savedUpdatedLabel = useMemo(() => (
    resumeAvailable && savedSession?.savedAt
      ? new Date(savedSession.savedAt).toLocaleTimeString()
      : null
  ), [resumeAvailable, savedSession?.savedAt]);

  const handleResumeSession = async () => {
    if (typeof onResumeSavedSession !== 'function') return;
    const outcome = await onResumeSavedSession();
    if (outcome === false) {
      window.alert('저장된 학습 세션을 불러오지 못했어요. 새로 시작해 주세요.');
    }
  };

  const handleDiscardSession = () => {
    if (typeof onDiscardSavedSession !== 'function') return;
    if (window.confirm('저장된 학습 세션을 삭제할까요?')) {
      onDiscardSavedSession();
    }
  };

  const handleOpenProblemPreview = () => {
    const typeEntries = Object.entries(config.types || {}).filter(([, value]) => Number(value) > 0);
    const primaryType = typeEntries.length ? typeEntries[0][0] : 'grammar';
    const sample = sampleProblems[primaryType];
    if (!sample) {
      setPreviewProblem({ unsupported: true, type: primaryType });
      return;
    }

    const sampleClone = JSON.parse(JSON.stringify(sample));
    const documentTitle = documents.find((doc) => doc.id === config.documentId)?.title?.trim();
    const previewSourceLabel = documentTitle
      ? `출처│${documentTitle} - No.미리보기`
      : sampleClone.sourceLabel || '출처│미리보기';

    sampleClone.sourceLabel = previewSourceLabel;
    if (Array.isArray(sampleClone.footnotes)) {
      sampleClone.footnotes = [...sampleClone.footnotes];
    }
    sampleClone.metadata = {
      ...(sampleClone.metadata || {}),
      footnotes: sampleClone.metadata?.footnotes || sampleClone.footnotes || [],
      previewLabel: '미리보기'
    };

    setPreviewProblem(sampleClone);
  };

  const handleCloseProblemPreview = () => setPreviewProblem(null);

  const content = (() => {
    switch (safeStep) {
      case 1:
        return (
          <DocumentStep
            documents={documents}
            selectedDocumentId={config.documentId}
            loading={documentsLoading}
            onSelect={selectDocument}
            onNext={() => goToStep(2)}
          />
        );
      case 2:
        return (
          <PassageStep
            passages={passages}
            selectedPassages={selectedPassages}
            loading={passagesLoading}
            onBack={() => goToStep(1)}
            onNext={prepareTypeStep}
            onToggle={togglePassageSelection}
            onSelectAll={selectAllPassages}
            onRandom={randomPassages}
            onClear={clearPassages}
            onPreview={openPreview}
            selectionLabel="학습에 포함할 지문을 골라주세요"
            metaRenderer={renderPassageMeta}
          />
        );
      case 3:
      default:
        return (
          <ProblemTypeStep
            typeCounts={config.types}
            totalProblems={totalProblems}
            orderMode={config.orderMode}
            onBack={() => goToStep(2)}
            onReset={resetTypes}
            onRandomize={randomizeTypes}
            onOrderModeChange={changeOrderMode}
            onChangeByStep={changeTypeByStep}
            onChangeValue={handleTypeChange}
            onStart={handleStart}
            canStart={
              !!config.documentId &&
              selectedPassages.length > 0 &&
              totalProblems > 0 &&
              totalProblems <= MAX_TOTAL_PROBLEMS
            }
            onPreviewProblem={handleOpenProblemPreview}
          />
        );
    }
  })();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>학습 설정</h1>

      <section style={styles.quickGuide}>
        <h2 style={styles.quickGuideTitle}>어떻게 진행할까요?</h2>
        <ul style={styles.quickGuideList}>
          {quickGuideItems.map((item) => (
            <li key={item.label} style={styles.quickGuideItem}>
              <span style={styles.quickGuideIcon}>{item.icon}</span>
              <div style={styles.quickGuideBody}>
                <strong style={styles.quickGuideLabel}>{item.label}</strong>
                <p style={styles.quickGuideText}>{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {resumeAvailable && (
        <div style={styles.savedSessionCard}>
          <div>
            <div style={styles.savedSessionTitle}>저장된 학습 이어하기</div>
            <div style={styles.savedSessionMeta}>
              남은 문제 {savedSession.problems.length}개 · 남은 시간 {savedTimeLabel}
            </div>
            {savedUpdatedLabel && (
              <div style={styles.savedSessionMetaMuted}>마지막 저장 {savedUpdatedLabel}</div>
            )}
          </div>
          <div style={styles.savedSessionActions}>
            <button type="button" style={styles.resumeButton} onClick={handleResumeSession}>
              이어서 풀기
            </button>
            <button type="button" style={styles.discardButton} onClick={handleDiscardSession}>
              삭제
            </button>
          </div>
        </div>
      )}

      {error && <div style={styles.errorBox}>❗️ {error}</div>}
      {content}
      {headerSlot && <div style={styles.headerSlot}>{headerSlot}</div>}
      <PassagePreviewModal
        open={Boolean(previewPassage)}
        passage={previewPassage}
        onClose={closePreview}
        documentTitle={documents.find((doc) => doc.id === config.documentId)?.title}
      />
      <ProblemPreviewModal
        open={Boolean(previewProblem)}
        problem={previewProblem}
        onClose={handleCloseProblemPreview}
      />
    </div>
  );
};

export default StudyConfig;
