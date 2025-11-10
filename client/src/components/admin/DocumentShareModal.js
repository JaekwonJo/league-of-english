import React, { useEffect, useState } from 'react';
import { adminStyles } from '../../styles/adminStyles';

const inputStyle = {
  width: '100%',
  padding: '10px',
  marginBottom: '12px',
  borderRadius: '10px',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-soft)',
  color: 'var(--text-primary)'
};

const labelStyle = {
  fontSize: '0.9rem',
  fontWeight: 600,
  marginBottom: '6px',
  display: 'block',
  color: 'var(--text-secondary)'
};

const helperStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginTop: '-6px',
  marginBottom: '10px'
};

const checkboxRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'var(--surface-soft)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-secondary)'
};

const DocumentShareModal = ({ show, loading, documentTitle, shareForm, onChange, onClose, onSave }) => {
  const [localForm, setLocalForm] = useState({
    public: false,
    schools: '',
    grades: '',
    students: ''
  });

  useEffect(() => {
    if (shareForm) {
      setLocalForm({
        public: Boolean(shareForm.public),
        schools: shareForm.schools || '',
        grades: shareForm.grades || '',
        students: shareForm.students || ''
      });
    }
  }, [shareForm]);

  if (!show) return null;

  const handleInputChange = (field, value) => {
    const updated = { ...localForm, [field]: value };
    setLocalForm(updated);
    if (onChange) {
      onChange({
        public: field === 'public' ? value : updated.public,
        schools: field === 'schools' ? value : updated.schools,
        grades: field === 'grades' ? value : updated.grades,
        students: field === 'students' ? value : updated.students
      });
    }
  };

  const handleSaveClick = () => {
    if (onSave) {
      onSave({
        public: localForm.public,
        schools: splitByComma(localForm.schools),
        grades: splitByComma(localForm.grades),
        students: splitByComma(localForm.students)
      });
    }
  };

  return (
    <div style={adminStyles.modal}>
      <div style={{ ...adminStyles.modalContent, maxWidth: '520px' }}>
        <div style={adminStyles.modalHeader}>
          <h2 style={adminStyles.modalTitle}>📢 문서 공개 설정</h2>
          <span style={adminStyles.modalSubtitle}>{documentTitle}</span>
        </div>

        <div style={checkboxRow}>
          <input
            id="share-public"
            type="checkbox"
            checked={localForm.public}
            onChange={(event) => handleInputChange('public', event.target.checked)}
          />
          <label htmlFor="share-public" style={{ fontWeight: 600 }}>모든 학생에게 공개</label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>학교별 공개</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px' }}
            placeholder="예: ○○고등학교, ○○중학교"
            value={localForm.schools}
            onChange={(event) => handleInputChange('schools', event.target.value)}
          />
          <div style={helperStyle}>쉼표(,)로 구분해서 여러 학교를 입력할 수 있어요.</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>학년별 공개</label>
          <input
            style={inputStyle}
            placeholder="예: 1, 2 (고1, 고2)"
            value={localForm.grades}
            onChange={(event) => handleInputChange('grades', event.target.value)}
          />
          <div style={helperStyle}>숫자만 입력하세요. (1=고1, 2=고2, 3=고3)</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>학생 이메일/아이디</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px' }}
            placeholder="예: jinjinsuhoo@naver.com, student01"
            value={localForm.students}
            onChange={(event) => handleInputChange('students', event.target.value)}
          />
          <div style={helperStyle}>이메일이나 아이디를 쉼표로 나눠 입력하면 해당 학생에게만 공개돼요.</div>
        </div>

        <div style={adminStyles.modalActions}>
          <button
            type="button"
            style={adminStyles.modalSecondaryButton}
            onClick={onClose}
            disabled={loading}
          >
            닫기
          </button>
          <button
            type="button"
            style={adminStyles.modalPrimaryButton}
            onClick={handleSaveClick}
            disabled={loading}
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

function splitByComma(text = '') {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default DocumentShareModal;
