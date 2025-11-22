import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

const UploadModal = ({
  show,
  loading,
  categories,
  uploadForm,
  onClose,
  onSubmit,
  onFormChange,
  onFileChange,
  onOpenCategoryManager = () => {}
}) => {
  if (!show) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        e.target.value = '';
        return;
      }
      
      if (!['application/pdf', 'text/plain'].includes(file.type)) {
        alert('PDF 또는 TXT 파일만 업로드 가능합니다.');
        e.target.value = '';
        return;
      }

      onFileChange(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!uploadForm.file || !uploadForm.title.trim()) {
      alert('제목과 파일을 모두 입력해주세요.');
      return;
    }

    onSubmit();
  };

  return (
    <div style={adminStyles.modalOverlay}>
      <div style={adminStyles.modalContent}>
        <h3 style={adminStyles.modalTitle}>📄 문서 업로드</h3>
        <form onSubmit={handleSubmit} style={adminStyles.form}>
          <div style={adminStyles.formGroup}>
            <label style={adminStyles.label}>제목 *</label>
            <input
              type="text"
              value={uploadForm.title}
              onChange={(e) => onFormChange('title', e.target.value)}
              style={adminStyles.input}
              placeholder="문서 제목을 입력하세요"
              required
            />
          </div>

          <div style={adminStyles.formGroup}>
            <label style={adminStyles.label}>문서 유형</label>
            <select
              value={uploadForm.type}
              onChange={(e) => onFormChange('type', e.target.value)}
              style={adminStyles.input}
            >
              <option value="worksheet">읽기 지문 / 문제 생성용</option>
              <option value="vocabulary">단어장 (Day별 단어 시험)</option>
            </select>
          </div>

          <div style={adminStyles.formGroup}>
            <label style={adminStyles.label}>카테고리</label>
            <div style={adminStyles.inlineInputRow}>
              <select
                value={uploadForm.category}
                onChange={(e) => onFormChange('category', e.target.value)}
                style={{ ...adminStyles.input, flex: 1 }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="button"
                style={adminStyles.inlineGhostButton}
                onClick={onOpenCategoryManager}
              >
                + 추가
              </button>
            </div>
          </div>

          <div style={adminStyles.formRow}>
            <div style={adminStyles.formGroup}>
              <label style={adminStyles.label}>학교명</label>
              <input
                type="text"
                value={uploadForm.school}
                onChange={(e) => onFormChange('school', e.target.value)}
                style={adminStyles.input}
                placeholder="학교명 (선택사항)"
              />
            </div>
            <div style={adminStyles.formGroup}>
              <label style={adminStyles.label}>학년</label>
              <select
                value={uploadForm.grade}
                onChange={(e) => onFormChange('grade', parseInt(e.target.value))}
                style={adminStyles.input}
              >
                <option value={1}>고1</option>
                <option value={2}>고2</option>
                <option value={3}>고3</option>
              </select>
            </div>
          </div>

          <div style={adminStyles.formGroup}>
            <label style={adminStyles.label}>파일 (PDF, TXT) *</label>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              style={adminStyles.fileInput}
              required
            />
            <small style={adminStyles.fileHelp}>
              최대 10MB, PDF 또는 TXT 파일만 업로드 가능합니다.
            </small>
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
              {loading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
