import React from 'react';
import styles from '../configStyles';

const DocumentStep = ({
  documents,
  selectedDocumentId,
  loading,
  onSelect,
  onNext,
}) => (
  <div style={styles.section}>
    <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>1단계 · 자료 선택</h3>
    <p style={styles.sectionHint}>
      문제 학습에 사용할 PDF를 고르면 다음 단계에서 지문을 고를 수 있어요.
    </p>
    <select
      style={styles.select}
      value={selectedDocumentId || ''}
      onChange={(event) => {
        const value = event.target.value ? Number(event.target.value) : null;
        onSelect(value);
      }}
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
          ...(selectedDocumentId ? {} : styles.startButtonDisabled),
        }}
        onClick={onNext}
        disabled={!selectedDocumentId}
      >
        다음 단계로 →
      </button>
    </div>
  </div>
);

export default DocumentStep;
