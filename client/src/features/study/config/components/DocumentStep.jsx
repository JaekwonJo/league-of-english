import React, { useMemo, useState } from 'react';
import styles from '../configStyles';

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

const DocumentStep = ({
  documents,
  selectedDocumentId,
  loading,
  onSelect,
  onNext,
}) => {
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const filteredDocuments = useMemo(() => {
    if (!normalizedQuery) return documents;
    return documents.filter((doc) => {
      const title = String(doc.title || `자료 ${doc.id}`).toLowerCase();
      const category = String(doc.category || '').toLowerCase();
      return title.includes(normalizedQuery) || category.includes(normalizedQuery);
    });
  }, [documents, normalizedQuery]);

  const handleSelect = (docId) => {
    if (loading) return;
    const numericId = Number(docId);
    onSelect(Number.isNaN(numericId) ? docId : numericId);
  };

  return (
    <div style={styles.section}>
      <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>1단계 · 자료 선택</h3>
      <p style={styles.sectionHint}>
        문제 학습에 사용할 PDF를 고르면 다음 단계에서 지문을 고를 수 있어요.
      </p>

      <div style={styles.searchRow}>
        <input
          type="search"
          style={styles.searchInput}
          placeholder="자료 제목이나 분류를 검색해 보세요"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={loading || documents.length === 0}
        />
        {query && (
          <button
            type="button"
            style={styles.clearSearchButton}
            onClick={() => setQuery('')}
            disabled={loading}
          >
            지우기
          </button>
        )}
      </div>

      <div style={styles.documentList}>
        {filteredDocuments.length === 0 ? (
          <div style={styles.emptyDocumentList}>
            {documents.length === 0
              ? '업로드된 자료가 아직 없어요. 관리자 페이지에서 먼저 자료를 올려 주세요.'
              : '검색 결과가 없어요. 다른 키워드로 다시 시도해 볼까요?'}
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isActive = selectedDocumentId === doc.id;
            const createdAt = formatDate(doc.createdAt || doc.created_at);
            const category = doc.category ? String(doc.category) : '';
            return (
              <button
                key={doc.id}
                type="button"
                style={{
                  ...styles.documentButton,
                  ...(isActive ? styles.documentButtonActive : {}),
                }}
                onClick={() => handleSelect(doc.id)}
              >
                <span style={styles.documentTitle}>{doc.title || `자료 ${doc.id}`}</span>
                {category && (
                  <span style={styles.documentMeta}>분류: {category}</span>
                )}
                {createdAt && (
                  <span style={styles.documentMeta}>업로드: {createdAt}</span>
                )}
              </button>
            );
          })
        )}
      </div>

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
};

export default DocumentStep;
