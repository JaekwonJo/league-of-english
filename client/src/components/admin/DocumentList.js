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
  onExamUpload,
  onExamDelete,
  onVocabularyPreview,
  isMobile = false
}) => {
  const responsive = (base, mobileOverrides = {}) => (isMobile ? { ...base, ...(mobileOverrides || {}) } : base);

  const items = Array.isArray(documents) ? documents : [];

  if (loading) {
    return (
      <div style={responsive(adminStyles.card, adminStyles.cardMobile)}>
        <div className="shimmer" aria-hidden />
        <h2 style={responsive(adminStyles.cardTitle, adminStyles.cardTitleMobile)}>📚 문서 목록</h2>
        <div style={adminStyles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={responsive(adminStyles.card, adminStyles.cardMobile)}>
      <div className="shimmer" aria-hidden />
      <h2 style={responsive(adminStyles.cardTitle, adminStyles.cardTitleMobile)}>{title}</h2>
      
      <div style={responsive(adminStyles.documentsGrid, adminStyles.documentsGridMobile)}>
        {items.length === 0 ? (
          <div style={responsive(adminStyles.emptyState, adminStyles.emptyStateMobile)}>{emptyMessage}</div>
        ) : (
          items.map(doc => (
            <DocumentCard
              key={doc.id}
              isMobile={isMobile}
              document={doc}
              onEdit={onEdit}
              onDelete={onDelete}
              onAnalyze={onAnalyze}
              onPassageAnalyze={onPassageAnalyze}
              onShare={onShare}
              onExamUpload={onExamUpload}
              onExamDelete={onExamDelete}
              onVocabularyPreview={onVocabularyPreview}
            />
          ))
        )}
      </div>
    </div>
  );
};

const DocumentCard = ({ document: doc, onEdit, onDelete, onAnalyze, onPassageAnalyze, onShare, onExamUpload, onExamDelete, onVocabularyPreview, isMobile }) => {
  const responsive = (base, mobileOverrides = {}) => (isMobile ? { ...base, ...(mobileOverrides || {}) } : base);
  const isVocabulary = String(doc.type || '').toLowerCase() === 'vocabulary';
  return (
    <div className="tilt-hover" style={responsive(adminStyles.documentCard, adminStyles.documentCardMobile)}>
      <div className="shimmer" aria-hidden />
      <div style={responsive(adminStyles.documentHeader, adminStyles.documentHeaderMobile)}>
        <h3 style={responsive(adminStyles.documentTitle, adminStyles.documentTitleMobile)}>{doc.title}</h3>
        <div style={responsive(adminStyles.documentActions, adminStyles.documentActionsMobile)}>
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
              {onExamUpload && (
                <button 
                  style={{...adminStyles.analyzeButton, background: '#ec4899'}}
                  onClick={() => onExamUpload(doc)}
                  title="기출문제 업로드"
                >
                  🎓
                </button>
              )}
              {onExamDelete && (
                <button 
                  style={{...adminStyles.analyzeButton, background: 'var(--danger)'}}
                  onClick={() => onExamDelete(doc)}
                  title="기출문제 초기화"
                >
                  🗑️
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
      
      <div style={responsive(adminStyles.documentMeta, adminStyles.documentMetaMobile)}>
        <span style={responsive(adminStyles.badge, adminStyles.badgeMobile)}>{doc.category || '기타'}</span>
        {doc.type && (
          <span 
            style={{
              ...responsive(adminStyles.badge, adminStyles.badgeMobile),
              opacity: 0.8,
              cursor: 'default',
              background: isVocabulary ? 'var(--color-blue-500)' : 'var(--badge-bg)'
            }}
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
