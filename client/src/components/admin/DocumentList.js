import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

const DocumentList = ({ 
  documents, 
  loading, 
  onEdit, 
  onDelete,
  onAnalyze,
  onPassageAnalyze 
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
      <h2 style={adminStyles.cardTitle}>📚 문서 목록</h2>
      
      <div style={adminStyles.documentsGrid}>
        {documents.length === 0 ? (
          <div style={adminStyles.emptyState}>
            📄 업로드된 문서가 없습니다.
          </div>
        ) : (
          documents.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onEdit={onEdit}
              onDelete={onDelete}
              onAnalyze={onAnalyze}
              onPassageAnalyze={onPassageAnalyze}
            />
          ))
        )}
      </div>
    </div>
  );
};

const DocumentCard = ({ document: doc, onEdit, onDelete, onAnalyze, onPassageAnalyze }) => {
  return (
    <div style={adminStyles.documentCard}>
      <div style={adminStyles.documentHeader}>
        <h3 style={adminStyles.documentTitle}>{doc.title}</h3>
        <div style={adminStyles.documentActions}>
          <button 
            style={adminStyles.analyzeButton}
            onClick={() => onAnalyze(doc)}
            title="종합 분석"
          >
            📊
          </button>
          {onPassageAnalyze && (
            <button 
              style={{...adminStyles.analyzeButton, background: '#10b981'}}
              onClick={() => onPassageAnalyze(doc)}
              title="개별 지문 분석"
            >
              📝
            </button>
          )}
          <button 
            style={adminStyles.editButton}
            onClick={() => onEdit(doc)}
            title="수정"
          >
            ✏️
          </button>
          <button 
            style={adminStyles.deleteButton}
            onClick={() => onDelete(doc.id)}
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div style={adminStyles.documentMeta}>
        <span style={adminStyles.badge}>{doc.category || '기타'}</span>
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