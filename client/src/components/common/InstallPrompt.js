import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already installed and not dismissed recently
      if (!localStorage.getItem('pwa_dismissed')) {
        setShow(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.icon}>📱</div>
        <div style={styles.content}>
          <h3 style={styles.title}>앱으로 더 편하게 공부하세요</h3>
          <p style={styles.text}>홈 화면에 추가하면 전체 화면으로 집중해서 학습할 수 있어요.</p>
        </div>
        <div style={styles.actions}>
          <button style={styles.dismissBtn} onClick={handleDismiss}>나중에</button>
          <button style={styles.installBtn} onClick={handleInstall}>앱 설치하기</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    right: '20px',
    zIndex: 10000,
    display: 'flex',
    justifyContent: 'center'
  },
  card: {
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '400px',
    width: '100%'
  },
  icon: {
    fontSize: '24px'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff'
  },
  text: {
    margin: 0,
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.4'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  dismissBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 12px'
  },
  installBtn: {
    background: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    padding: '8px 16px',
    cursor: 'pointer'
  }
};

export default InstallPrompt;
