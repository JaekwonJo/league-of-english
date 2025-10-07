import React from 'react';

const overlayStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  backdropFilter: 'blur(3px)'
};

const modalStyles = {
  background: 'var(--modal-bg, #151923)',
  borderRadius: '18px',
  maxWidth: '720px',
  width: '90%',
  maxHeight: '80vh',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 24px 50px rgba(0,0,0,0.28)'
};

const titleStyles = {
  margin: 0,
  marginBottom: '12px',
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--text-primary, #f5f6fa)'
};

const scrollAreaStyles = {
  flex: 1,
  overflowY: 'auto',
  paddingRight: '8px'
};

const passageStyles = {
  whiteSpace: 'pre-wrap',
  fontSize: '15px',
  lineHeight: 1.7,
  color: 'var(--text-muted, rgba(255,255,255,0.82))'
};

const footerStyles = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '18px'
};

const buttonStyles = {
  background: 'var(--accent, #6c5ce7)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 18px',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 12px 20px rgba(108, 92, 231, 0.25)'
};

const PassagePreviewModal = ({ open, passage, onClose, documentTitle }) => {
  if (!open || !passage) return null;

  const title = documentTitle
    ? `${documentTitle} · #${String(passage.passageNumber).padStart(2, '0')}`
    : `#${String(passage.passageNumber).padStart(2, '0')} 지문 전체 보기`;

  return (
    <div style={overlayStyles} role="dialog" aria-modal="true" aria-label="지문 전체 보기">
      <div style={modalStyles}>
        <h2 style={titleStyles}>{title}</h2>
        <div style={scrollAreaStyles}>
          <div style={passageStyles}>{passage.text || passage.fullText || passage.excerpt}</div>
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

export default PassagePreviewModal;
