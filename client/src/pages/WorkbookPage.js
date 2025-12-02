import React, { useEffect } from 'react';

const styles = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: '#94a3b8',
    fontSize: '15px'
  }
};

const WorkbookPage = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = '/reading-tutor-select?mode=workbook';
    window.location.href = url;
  }, []);

  return (
    <div style={styles.center}>
      AI 워크북 튜터로 이동하는 중이에요... 📘
    </div>
  );
};

export default WorkbookPage;
