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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`"${file.name}" 파일 크기가 10MB를 초과합니다. 이 파일은 건너뛸게요.`);
        continue;
      }
      
      if (!['application/pdf', 'text/plain'].includes(file.type)) {
        alert(`"${file.name}"는 PDF/TXT 형식이 아니라서 건너뜁니다.`);
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) {
      e.target.value = '';
      return;
    }

    onFileChange(validFiles);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!uploadForm.files || uploadForm.files.length === 0) {
      alert('업로드할 파일을 최소 1개 이상 선택해 주세요.');
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
              placeholder="문서 제목(여러 개 업로드 시 공통 접두어로 사용)"
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
            <label style={adminStyles.label}>카테고리 *</label>
            <div style={adminStyles.inlineInputRow}>
              <select
                value={uploadForm.category}
                onChange={(e) => onFormChange('category', e.target.value)}
                style={{ ...adminStyles.input, flex: 1 }}
                required
              >
                <option value="" disabled>카테고리를 선택하세요</option>
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
              multiple
            />
            <small style={adminStyles.fileHelp}>
              최대 10MB, PDF 또는 TXT 파일만 업로드 가능합니다. 여러 파일을 선택하면 순서대로 업로드돼요.
            </small>
            {Array.isArray(uploadForm.files) && uploadForm.files.length > 0 && (
              <small style={adminStyles.fileHelp}>
                선택된 파일: {uploadForm.files.length}개 ({uploadForm.files.map(f => f.name).join(', ')})
              </small>
            )}
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
