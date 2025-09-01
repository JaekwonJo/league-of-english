import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

const EditModal = ({
  show,
  loading,
  categories,
  editingDocument,
  onClose,
  onSubmit,
  onDocumentChange
}) => {
  if (!show || !editingDocument) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!editingDocument.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    onSubmit();
  };

  return (
    <div style={adminStyles.modal}>
      <div style={adminStyles.modalContent}>
        <h3 style={adminStyles.modalTitle}>✏️ 문서 수정</h3>
        <form onSubmit={handleSubmit} style={adminStyles.form}>
          <div style={adminStyles.formGroup}>
            <label style={adminStyles.label}>제목 *</label>
            <input
              type="text"
              value={editingDocument.title}
              onChange={(e) => onDocumentChange('title', e.target.value)}
              style={adminStyles.input}
              required
            />
          </div>

          <div style={adminStyles.formGroup}>
            <label style={adminStyles.label}>카테고리</label>
            <select
              value={editingDocument.category || '기타'}
              onChange={(e) => onDocumentChange('category', e.target.value)}
              style={adminStyles.input}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={adminStyles.formRow}>
            <div style={adminStyles.formGroup}>
              <label style={adminStyles.label}>학교명</label>
              <input
                type="text"
                value={editingDocument.school || ''}
                onChange={(e) => onDocumentChange('school', e.target.value)}
                style={adminStyles.input}
              />
            </div>
            <div style={adminStyles.formGroup}>
              <label style={adminStyles.label}>학년</label>
              <select
                value={editingDocument.grade || 1}
                onChange={(e) => onDocumentChange('grade', parseInt(e.target.value))}
                style={adminStyles.input}
              >
                <option value={1}>고1</option>
                <option value={2}>고2</option>
                <option value={3}>고3</option>
              </select>
            </div>
          </div>

          <div style={adminStyles.modalButtons}>
            <button 
              type="button" 
              onClick={onClose}
              style={adminStyles.cancelButton}
            >
              취소
            </button>
            <button 
              type="submit" 
              style={adminStyles.submitButton}
              disabled={loading}
            >
              {loading ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;