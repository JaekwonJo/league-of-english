import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

const DocumentList = ({
  title = '📚 문서 목록',
  emptyMessage = '📄 업로드된 문서가 없습니다.',
  documents,
  loading,
  onEdit,
  onDelete,
  onAnalyze,
  onPassageAnalyze,
  onShare,
  onVocabularyPreview
}) => {
  if (loading) {
    return (
      <div style={adminStyles.card}>
        <h2 style={adminStyles.cardTitle}>📚 문서 목록</h2>
        <div style={adminStyles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={adminStyles.card}>
      <h2 style={adminStyles.cardTitle}>{title}</h2>
      
      <div style={adminStyles.documentsGrid}>
        {documents.length === 0 ? (
          <div style={adminStyles.emptyState}>{emptyMessage}</div>
        ) : (
          documents.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onEdit={onEdit}
              onDelete={onDelete}
              onAnalyze={onAnalyze}
              onPassageAnalyze={onPassageAnalyze}
              onShare={onShare}
              onVocabularyPreview={onVocabularyPreview}
            />
          ))
        )}
      </div>
    </div>
  );
};

const DocumentCard = ({ document: doc, onEdit, onDelete, onAnalyze, onPassageAnalyze, onShare, onVocabularyPreview }) => {
  const isVocabulary = String(doc.type || '').toLowerCase() === 'vocabulary';
  return (
    <div style={adminStyles.documentCard}>
      <div style={adminStyles.documentHeader}>
        <h3 style={adminStyles.documentTitle}>{doc.title}</h3>
        <div style={adminStyles.documentActions}>
          {onShare && (
            <button
              style={{ ...adminStyles.analyzeButton, background: 'var(--color-purple-500)' }}
              onClick={() => onShare(doc)}
              title="학생 공개 설정"
            >
              🌐
            </button>
          )}
          {isVocabulary ? (
            onVocabularyPreview && (
              <button
                style={{ ...adminStyles.analyzeButton, background: 'var(--color-blue-500)' }}
                onClick={() => onVocabularyPreview(doc)}
                title="단어 세트 미리보기"
              >
                🧠
              </button>
            )
          ) : (
            <>
              {onAnalyze && (
                <button 
                  style={adminStyles.analyzeButton}
                  onClick={() => onAnalyze(doc)}
                  title="종합 분석"
                >
                  📊
                </button>
              )}
              {onPassageAnalyze && (
                <button 
                  style={{...adminStyles.analyzeButton, background: 'var(--success)'}}
                  onClick={() => onPassageAnalyze(doc)}
                  title="개별 지문 분석"
                >
                  📝
                </button>
              )}
            </>
          )}
          {onEdit && (
            <button 
              style={adminStyles.editButton}
              onClick={() => onEdit(doc)}
              title="수정"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button 
              style={adminStyles.deleteButton}
              onClick={() => onDelete(doc.id)}
              title="삭제"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      
      <div style={adminStyles.documentMeta}>
        <span style={adminStyles.badge}>{doc.category || '기타'}</span>
        {doc.type && (
          <span 
            style={{ ...adminStyles.badge, opacity: 0.8, cursor: 'default', background: isVocabulary ? 'var(--color-blue-500)' : 'var(--badge-bg)' }}
          >
            {isVocabulary ? '단어장' : '지문'}
          </span>
        )}
        <span style={adminStyles.meta}>
          {doc.school && `${doc.school} `}
          {doc.grade && `고${doc.grade}`}
        </span>
      </div>
      
      <div style={adminStyles.documentFooter}>
        <small style={adminStyles.date}>
          {new Date(doc.created_at).toLocaleDateString()}
        </small>
      </div>
    </div>
  );
};

export default DocumentList;
