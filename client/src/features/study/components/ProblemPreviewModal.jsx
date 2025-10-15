import React from 'react';
import ProblemDisplay from '../problem/ProblemDisplay';

const overlayStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2100,
  backdropFilter: 'blur(4px)'
};

const modalStyles = {
  background: '#0f172a',
  borderRadius: '20px',
  width: '96%',
  maxWidth: '860px',
  maxHeight: '88vh',
  padding: '28px',
  boxShadow: '0 32px 80px rgba(15, 23, 42, 0.55)',
  display: 'flex',
  flexDirection: 'column',
  color: 'rgba(248, 250, 252, 0.92)'
};

const titleStyles = {
  margin: 0,
  marginBottom: '16px',
  fontSize: '20px',
  fontWeight: 700
};

const scrollAreaStyles = {
  flex: 1,
  overflowY: 'auto',
  paddingRight: '6px'
};

const footerStyles = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '20px'
};

const buttonStyles = {
  padding: '10px 20px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 18px 40px rgba(99, 102, 241, 0.35)'
};

const messageStyles = {
  background: 'rgba(148, 163, 184, 0.12)',
  border: '1px dashed rgba(148, 163, 184, 0.35)',
  borderRadius: '16px',
  padding: '24px',
  fontSize: '15px',
  lineHeight: 1.6
};

const ProblemPreviewModal = ({ open, problem, onClose }) => {
  if (!open) return null;

  return (
    <div style={overlayStyles} role="dialog" aria-modal="true" aria-label="문항 미리보기">
      <div style={modalStyles}>
        <h2 style={titleStyles}>문항 미리보기</h2>
        <div style={scrollAreaStyles}>
          {problem && !problem.unsupported ? (
            <ProblemDisplay
              problem={problem}
              problemIndex={0}
              totalProblems={1}
              displayMode="preview"
            />
          ) : (
            <div style={messageStyles}>
              {problem?.type
                ? `현재 선택한 유형(${String(problem.type).toUpperCase()})은 미리보기 샘플이 준비 중이에요. 문제를 생성해 직접 확인해 주세요.`
                : '현재 선택한 구성으로는 미리보기를 제공할 수 없어요. 문제를 생성해 직접 확인해 주세요.'}
            </div>
          )}
        </div>
        <div style={footerStyles}>
          <button type="button" style={buttonStyles} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProblemPreviewModal;
