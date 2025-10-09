import React from 'react';
import PassagePreviewModal from '../../../components/shared/PassagePreviewModal';
import styles from './configStyles';
import useStudyConfig from './hooks/useStudyConfig';
import DocumentStep from './components/DocumentStep';
import PassageStep from './components/PassageStep';
import ProblemTypeStep from './components/ProblemTypeStep';

const StudyConfig = ({ onStart, headerSlot = null, initialFocusType = null }) => {
  const {
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
  } = useStudyConfig({ onStart, initialFocusType });

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
              totalProblems <= 20
            }
          />
        );
    }
  })();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>학습 설정</h1>
      {headerSlot && <div style={styles.headerSlot}>{headerSlot}</div>}
      {error && <div style={styles.errorBox}>❗️ {error}</div>}
      {content}
      <PassagePreviewModal
        open={Boolean(previewPassage)}
        passage={previewPassage}
        onClose={closePreview}
        documentTitle={documents.find((doc) => doc.id === config.documentId)?.title}
      />
    </div>
  );
};

export default StudyConfig;
