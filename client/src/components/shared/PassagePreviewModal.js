import React from 'react';

const overlayStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'var(--dialog-scrim, rgba(15, 23, 42, 0.65))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  backdropFilter: 'blur(3px)'
};

const modalStyles = {
  background: 'var(--surface-card)',
  borderRadius: '18px',
  maxWidth: '720px',
  width: '90%',
  maxHeight: '80vh',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 24px 50px var(--surface-shadow)'
};

const titleStyles = {
  margin: 0,
  marginBottom: '12px',
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--text-primary)'
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
  color: 'var(--text-secondary)'
};

const footerStyles = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '18px'
};

const buttonStyles = {
  background: 'var(--accent-gradient)',
  color: 'var(--text-on-accent)',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 18px',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 12px 24px var(--accent-shadow)'
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
